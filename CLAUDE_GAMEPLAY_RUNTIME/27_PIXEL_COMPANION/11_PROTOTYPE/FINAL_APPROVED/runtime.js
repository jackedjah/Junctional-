const MANIFEST_ROOT = "../../10_MANIFEST/FINAL_APPROVED/";

export class MahfittCompanion {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: true });
    this.ctx.imageSmoothingEnabled = false;
    this.character = "female";
    this.theme = "blue";
    this.animation = "idle_neutral";
    this.frameIndex = 0;
    this.timer = 0;
    this.reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.manifest = null;
    this.manifestUrl = null;
    this.pageCache = new Map();
    this.onState = () => {};
  }

  async setCharacter(character) {
    this.character = character;
    this.manifestUrl = new URL(`${MANIFEST_ROOT}${character}.json`, location.href);
    this.manifest = await fetch(this.manifestUrl).then(r => {
      if (!r.ok) throw new Error(`Manifest ${r.status}`);
      return r.json();
    });
    this.pageCache.clear();
    await this.play("idle_neutral");
    return this;
  }

  setTheme(theme) {
    if (!this.manifest?.themeArchitecture.palettes[theme]) throw new Error(`Unknown theme: ${theme}`);
    this.theme = theme;
    this.drawCurrent();
    return this;
  }

  setReducedMotion(enabled) {
    this.reducedMotion = Boolean(enabled);
    this.play(this.animation);
  }

  async loadPage(pageIndex) {
    if (this.pageCache.has(pageIndex)) return this.pageCache.get(pageIndex);
    const page = this.manifest.atlases.pages[pageIndex];
    const load = src => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = new URL(src, this.manifestUrl).href;
    });
    const pair = { neutral: await load(page.neutral), theme: await load(page.themeIndex) };
    if (this.pageCache.size >= 2) this.pageCache.delete(this.pageCache.keys().next().value);
    this.pageCache.set(pageIndex, pair);
    return pair;
  }

  async play(name) {
    if (!this.manifest?.animations[name]) throw new Error(`Unknown animation: ${name}`);
    clearTimeout(this.timer);
    this.animation = name;
    this.frameIndex = 0;
    await this.drawCurrent();
    this.onState({ character: this.character, theme: this.theme, animation: name });
    this.schedule();
    return this;
  }

  returnToIdle() { return this.play("idle_neutral"); }

  schedule() {
    clearTimeout(this.timer);
    const animation = this.manifest.animations[this.animation];
    if (this.reducedMotion) {
      if (!animation.loop && animation.frames.length > 1) {
        this.frameIndex = animation.frames.length - 1;
        this.timer = setTimeout(() => this.returnToIdle(), 220);
      }
      return;
    }
    const delay = animation.durationsMs[this.frameIndex] ?? 120;
    this.timer = setTimeout(async () => {
      this.frameIndex += 1;
      if (this.frameIndex >= animation.frames.length) {
        if (animation.loop) this.frameIndex = 0;
        else {
          const next = animation.transition || "idle_neutral";
          await this.play(next);
          return;
        }
      }
      await this.drawCurrent();
      this.schedule();
    }, delay);
  }

  async drawCurrent() {
    if (!this.manifest) return;
    const animation = this.manifest.animations[this.animation];
    const frame = animation.frames[Math.min(this.frameIndex, animation.frames.length - 1)];
    const page = await this.loadPage(frame.page);
    const [sx, sy, sw, sh] = frame.rect;
    const layer = document.createElement("canvas");
    layer.width = sw; layer.height = sh;
    const lctx = layer.getContext("2d", { willReadFrequently: true });
    lctx.imageSmoothingEnabled = false;
    lctx.clearRect(0, 0, sw, sh);
    lctx.drawImage(page.neutral, sx, sy, sw, sh, 0, 0, sw, sh);
    const neutral = lctx.getImageData(0, 0, sw, sh);
    lctx.clearRect(0, 0, sw, sh);
    lctx.drawImage(page.theme, sx, sy, sw, sh, 0, 0, sw, sh);
    const theme = lctx.getImageData(0, 0, sw, sh);
    const palette = this.manifest.themeArchitecture.palettes[this.theme];
    for (let i = 0; i < theme.data.length; i += 4) {
      if (!theme.data[i + 3]) continue;
      const level = Math.max(0, Math.min(4, Math.round(theme.data[i] / 64)));
      neutral.data[i] = palette[level][0];
      neutral.data[i + 1] = palette[level][1];
      neutral.data[i + 2] = palette[level][2];
      neutral.data[i + 3] = 255;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.putImageData(neutral, 0, 0);
  }
}

export class MascotBehaviorController {
  constructor(companion) {
    this.companion = companion;
    this.priority = { idle: 0, personality: 1, tutorial: 2, ai: 3, event: 4 };
    this.currentPriority = 0;
    this.context = { typing: false, criticalModal: false, tutorialHold: false };
    this.passiveTimer = 0;
  }

  setContext(patch) { Object.assign(this.context, patch); }

  async dispatch(animation, channel = "event") {
    const nextPriority = this.priority[channel] ?? 0;
    if (nextPriority < this.currentPriority) return false;
    this.currentPriority = nextPriority;
    await this.companion.play(animation);
    const spec = this.companion.manifest.animations[animation];
    if (!spec.loop) setTimeout(() => { this.currentPriority = 0; }, spec.durationsMs.reduce((a, b) => a + b, 0));
    return true;
  }

  startPassiveBehavior() {
    clearTimeout(this.passiveTimer);
    const tick = async () => {
      const blocked = this.context.typing || this.context.criticalModal || this.context.tutorialHold || this.currentPriority > 0;
      if (!blocked && Math.random() < 0.18) {
        const choices = ["look_around", "inspect_ui", "shoulder_roll", "rare_special_idle_a"];
        await this.dispatch(choices[Math.floor(Math.random() * choices.length)], "personality");
      }
      this.passiveTimer = setTimeout(tick, 18000 + Math.random() * 18000);
    };
    this.passiveTimer = setTimeout(tick, 22000);
  }
}

const canvas = document.querySelector("#mascot");
const companion = new MahfittCompanion(canvas);
const behavior = new MascotBehaviorController(companion);
const character = document.querySelector("#character");
const theme = document.querySelector("#theme");
const animation = document.querySelector("#animation");
const status = document.querySelector("#status");

async function populate() {
  animation.innerHTML = "";
  Object.keys(companion.manifest.animations).forEach(name => animation.add(new Option(name.replaceAll("_", " "), name)));
  animation.value = companion.animation;
}

companion.onState = state => { status.value = `${state.character} • ${state.theme} • ${state.animation}`; animation.value = state.animation; };
character.addEventListener("change", async () => { await companion.setCharacter(character.value); await populate(); });
theme.addEventListener("change", () => companion.setTheme(theme.value));
document.querySelector("#play").addEventListener("click", () => companion.play(animation.value));
document.querySelector("#idle").addEventListener("click", () => companion.returnToIdle());
document.querySelector("#reduced").addEventListener("change", e => companion.setReducedMotion(e.target.checked));

await companion.setCharacter("female");
await populate();
behavior.startPassiveBehavior();
window.mahfittCompanion = companion;
window.mahfittBehavior = behavior;
