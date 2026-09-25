const MANIFEST_ROOT = new URL('../../10_MANIFEST/SMOOTH_APP/', import.meta.url);
const NAMED_THEMES = ['blue', 'gold', 'red', 'purple', 'pink', 'green'];

export function makeTimeline(durations) {
  if (!durations.length) throw new Error('At least one frame is required');
  let total = 0;
  const ends = durations.map(ms => {
    if (!Number.isFinite(ms) || ms <= 0) throw new Error('Frame durations must be positive');
    return total += ms;
  });
  return { ends, total };
}

export function frameAt(timeline, elapsed, loop) {
  if (!loop && elapsed >= timeline.total) return { index: timeline.ends.length - 1, done: true };
  const t = loop ? Math.max(0, elapsed) % timeline.total : Math.max(0, elapsed);
  let lo = 0, hi = timeline.ends.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (t < timeline.ends[mid]) hi = mid; else lo = mid + 1;
  }
  return { index: lo, done: false };
}

function canvasOf(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  return canvas;
}

function paletteForHex(hex) {
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  return [...[.07, .22, .54, 1].map(s => rgb.map(v => Math.round(v * s))),
    rgb.map(v => Math.round(v + (255 - v) * .8))];
}

function abortError() { return new DOMException('Superseded companion request', 'AbortError'); }

/** Pure app module: importing it does not query or mount a demo UI. */
export class MahfittCompanion {
  constructor(canvas, { manifestRoot = MANIFEST_ROOT, onState = () => {}, onError = console.error } = {}) {
    if (!canvas?.getContext) throw new TypeError('A canvas is required');
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    this.ctx.imageSmoothingEnabled = false;
    this.canvas.style.imageRendering = 'pixelated';
    this.manifestRoot = new URL(manifestRoot, import.meta.url);
    this.onState = onState; this.onError = onError;
    this.character = 'female'; this.theme = 'blue'; this.animation = 'idle_neutral';
    this.frameIndex = 0; this.elapsedMs = 0;
    this.pageCache = new Map(); this.frameCache = new Map();
    this.characterVersion = 0; this.playVersion = 0; this.themeVersion = 0;
    this.rafId = 0; this.lastTimestamp = null; this.disposed = false; this.paused = false;
    this.metrics = { callbacks: 0, draws: 0, intervals: [] };
    this.mediaQuery = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.reducedMotion = Boolean(this.mediaQuery?.matches);
    this.onPreference = event => { if (!this.preferenceOverridden) this.setReducedMotion(event.matches, false); };
    this.mediaQuery?.addEventListener('change', this.onPreference);
    this.onVisibility = () => document.hidden ? this._stopClock() : this._startClock();
    document.addEventListener('visibilitychange', this.onVisibility);
    this._tick = this._tick.bind(this);
  }

  async setCharacter(character) {
    if (!['male', 'female'].includes(character)) throw new Error(`Unknown character: ${character}`);
    if (this.disposed) throw abortError();
    const version = ++this.characterVersion;
    ++this.playVersion;
    this._stopClock();
    this.manifest = null; this.prepared = null;
    this.pageCache.clear(); this.frameCache.clear();
    this.fetchController?.abort();
    this.fetchController = new AbortController();
    const url = new URL(`${character}.json`, this.manifestRoot);
    const response = await fetch(url, { signal: this.fetchController.signal });
    if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
    const manifest = await response.json();
    if (this.disposed || version !== this.characterVersion) throw abortError();
    this.character = character; this.manifest = manifest; this.manifestUrl = url;
    this.pageCache.clear(); this.frameCache.clear(); this.prepared = null;
    await this.play('idle_neutral');
    return this;
  }

  _palette() {
    if (this.theme.startsWith('#')) return paletteForHex(this.theme);
    const palette = this.manifest?.themeArchitecture.palettes[this.theme];
    if (!palette) throw new Error(`Unknown theme: ${this.theme}`);
    return palette;
  }

  /** Accept a named palette, #RRGGBB, or an app theme object { secondary }. */
  async setTheme(value) {
    const theme = typeof value === 'object' && value ? value.secondary : value;
    if (typeof theme !== 'string' || (!NAMED_THEMES.includes(theme) && !/^#[0-9a-f]{6}$/i.test(theme))) {
      throw new TypeError('Theme must be a named palette, #RRGGBB, or { secondary: #RRGGBB }');
    }
    if (this.disposed) throw abortError();
    this.theme = theme.toLowerCase();
    const revision = ++this.themeVersion;
    this.frameCache.clear();
    if (!this.manifest || !this.prepared) return this;
    const name = this.animation, character = this.characterVersion;
    const prepared = await this._prepareState(name);
    if (!this.disposed && revision === this.themeVersion && character === this.characterVersion && name === this.animation) {
      this.prepared = prepared; this.lastDrawn = -1;
      this._draw(this.frameIndex);
      this._notify();
    }
    return this;
  }

  setThemeColor(hex) { return this.setTheme(hex); }

  /** Subscribe directly to the app's theme store; cleanup is automatic. */
  bindTheme({ getSnapshot, subscribe }) {
    if (typeof getSnapshot !== 'function' || typeof subscribe !== 'function') throw new TypeError('Theme source needs getSnapshot and subscribe');
    this.unbindTheme?.();
    const update = () => this.setTheme(getSnapshot()).catch(error => this._error(error));
    const unsubscribe = subscribe(update);
    let active = true;
    const unbind = () => {
      if (!active) return;
      active = false;
      if (typeof unsubscribe === 'function') unsubscribe();
      if (this.unbindTheme === unbind) this.unbindTheme = null;
    };
    this.unbindTheme = unbind;
    update();
    return unbind;
  }

  async _loadPage(index, version) {
    const manifest = this.manifest, base = this.manifestUrl;
    const key = `${base}:${index}`;
    if (this.pageCache.has(key)) return this.pageCache.get(key);
    const scale = manifest.effectivePixelGrid[0] / manifest.nativeCanvas[0];
    const load = path => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        if (this.disposed || version !== this.characterVersion) { reject(abortError()); return; }
        // Cache at the unchanged authored grid, not the 2x export size.
        const canvas = canvasOf(img.width * scale, img.height * scale);
        const ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas);
      };
      img.onerror = () => reject(new Error(`Atlas failed: ${path}`));
      img.src = new URL(path, base).href;
    });
    const page = manifest.atlases.pages[index];
    const promise = Promise.all([load(page.neutral), load(page.themeIndex)])
      .then(([neutral, theme]) => ({ neutral, theme, scale }));
    this.pageCache.set(key, promise);
    while (this.pageCache.size > 3) this.pageCache.delete(this.pageCache.keys().next().value);
    promise.catch(() => this.pageCache.delete(key));
    return promise;
  }

  async _prepareState(name) {
    const spec = this.manifest?.animations[name];
    if (!spec) throw new Error(`Unknown animation: ${name}`);
    const version = this.characterVersion, revision = this.themeVersion;
    const key = `${version}:${name}:${revision}`;
    if (this.frameCache.has(key)) return this.frameCache.get(key);
    const palette = this._palette(), frames = [];
    const size = this.manifest.effectivePixelGrid;
    const scratch = canvasOf(...size), ctx = scratch.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;
    for (const frame of spec.frames) {
      const page = await this._loadPage(frame.page, version);
      if (this.disposed || version !== this.characterVersion) throw abortError();
      const [x, y, w, h] = frame.rect.map(v => v * page.scale);
      ctx.clearRect(0, 0, ...size);
      ctx.drawImage(page.neutral, x, y, w, h, 0, 0, ...size);
      const pixels = ctx.getImageData(0, 0, ...size);
      ctx.clearRect(0, 0, ...size);
      ctx.drawImage(page.theme, x, y, w, h, 0, 0, ...size);
      const theme = ctx.getImageData(0, 0, ...size).data;
      for (let i = 0; i < theme.length; i += 4) {
        if (!theme[i + 3]) continue;
        const color = palette[Math.min(4, Math.round(theme[i] / 64))];
        pixels.data[i] = color[0]; pixels.data[i + 1] = color[1]; pixels.data[i + 2] = color[2]; pixels.data[i + 3] = 255;
      }
      const composed = canvasOf(...size);
      composed.getContext('2d').putImageData(pixels, 0, 0);
      frames.push(composed);
      // Let the current animation/UI advance during preparation of long states.
      // Timers are used only for preparation; playback is exclusively rAF-driven.
      if (frames.length % 6 === 0) await new Promise(resolve => setTimeout(resolve, 0));
    }
    const prepared = { frames, spec, timeline: makeTimeline(spec.durationsMs) };
    if (version === this.characterVersion && revision === this.themeVersion) {
      this.frameCache.set(key, prepared);
      while (this.frameCache.size > 3) {
        const removable = [...this.frameCache.keys()].find(k => !k.includes(':idle_neutral:') && k !== key);
        if (!removable) break;
        this.frameCache.delete(removable);
      }
    }
    return prepared;
  }

  async play(name) {
    if (this.disposed) throw abortError();
    const request = ++this.playVersion, character = this.characterVersion;
    let prepared, revision;
    do {
      revision = this.themeVersion;
      prepared = await this._prepareState(name);
      if (this.disposed || request !== this.playVersion || character !== this.characterVersion) throw abortError();
    } while (revision !== this.themeVersion);
    this.animation = name; this.prepared = prepared; this.elapsedMs = 0;
    this.frameIndex = this.reducedMotion && !prepared.spec.loop ? (prepared.spec.holdFrame ?? Math.floor(prepared.frames.length / 2)) : 0;
    this.lastDrawn = -1; this.lastTimestamp = null;
    this._draw(this.frameIndex); this._notify(); this._startClock();
    return this;
  }

  returnToIdle() { return this.play('idle_neutral'); }

  setReducedMotion(value, override = true) {
    this.preferenceOverridden = override; this.reducedMotion = Boolean(value);
    this.elapsedMs = 0; this.lastTimestamp = null;
    if (this.prepared) {
      this.frameIndex = this.reducedMotion && !this.prepared.spec.loop ? (this.prepared.spec.holdFrame ?? 0) : 0;
      this._draw(this.frameIndex);
    }
    return this;
  }

  pause() { this.paused = true; this._stopClock(); }
  resume() { this.paused = false; this._startClock(); }

  _startClock() {
    if (this.disposed || this.paused || document.hidden || !this.prepared || this.rafId) return;
    this.lastTimestamp = null;
    this.rafId = requestAnimationFrame(this._tick);
  }

  _stopClock() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0; this.lastTimestamp = null;
  }

  _tick(timestamp) {
    this.rafId = 0;
    if (this.disposed || this.paused || document.hidden || !this.prepared) return;
    const dt = this.lastTimestamp === null ? 0 : Math.max(0, timestamp - this.lastTimestamp);
    this.lastTimestamp = timestamp;
    if (dt > 0 && dt < 250) {
      this.metrics.intervals.push(dt);
      if (this.metrics.intervals.length > 180) this.metrics.intervals.shift();
    }
    ++this.metrics.callbacks;
    // Accumulate timestamp time, not render/load latency. Hidden tabs are paused;
    // after an exceptional stall, clamp catch-up to avoid a violent pose jump.
    this.elapsedMs += Math.min(dt, 100);
    const { spec, timeline } = this.prepared;
    const position = this.reducedMotion
      ? { index: spec.loop ? 0 : (spec.holdFrame ?? 0), done: !spec.loop && this.elapsedMs >= 1500 }
      : frameAt(timeline, this.elapsedMs, spec.loop);
    this.frameIndex = position.index;
    this._draw(this.frameIndex);
    if (position.done && !this.returnPending) {
      this.returnPending = true;
      this.returnToIdle().catch(error => this._error(error)).finally(() => { this.returnPending = false; });
    }
    this.rafId = requestAnimationFrame(this._tick);
  }

  _draw(index) {
    if (!this.prepared || this.lastDrawn === index) return;
    const frame = this.prepared.frames[index];
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(frame, 0, 0, this.canvas.width, this.canvas.height);
    this.lastDrawn = index; ++this.metrics.draws;
  }

  _notify() { this.onState({ character: this.character, theme: this.theme, animation: this.animation }); }
  _error(error) { if (error?.name !== 'AbortError' && !this.disposed) this.onError(error); }

  getPlaybackStats() {
    const intervals = this.metrics.intervals;
    return { targetHz: 60, rafHz: intervals.length ? 1000 * intervals.length / intervals.reduce((a, b) => a + b, 0) : 0,
      callbacks: this.metrics.callbacks, draws: this.metrics.draws, authoredFrames: this.prepared?.frames.length ?? 0,
      frameIndex: this.frameIndex, reducedMotion: this.reducedMotion, interpolation: 'nearest-neighbor only' };
  }

  dispose() {
    this.disposed = true; ++this.characterVersion; ++this.playVersion;
    this._stopClock(); this.fetchController?.abort(); this.unbindTheme?.();
    this.mediaQuery?.removeEventListener('change', this.onPreference);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.pageCache.clear(); this.frameCache.clear(); this.prepared = null;
  }
}
