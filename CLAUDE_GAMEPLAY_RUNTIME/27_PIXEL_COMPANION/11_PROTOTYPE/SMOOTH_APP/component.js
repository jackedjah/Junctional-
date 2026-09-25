import { MahfittCompanion } from './runtime.js';

/** Framework-independent mount helper. No global demo or production mutations. */
export async function mountCompanion(container, { character = 'female', theme = 'blue', themeSource, ...options } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  canvas.style.cssText = 'width:256px;height:256px;image-rendering:pixelated';
  canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'MAHFITT companion');
  container.append(canvas);
  const companion = new MahfittCompanion(canvas, options);
  try {
    await companion.setTheme(theme);
    if (themeSource) companion.bindTheme(themeSource);
    await companion.setCharacter(character);
  } catch (error) { companion.dispose(); canvas.remove(); throw error; }
  const dispose = companion.dispose.bind(companion);
  companion.dispose = () => { dispose(); canvas.remove(); };
  return companion;
}

if (typeof customElements !== 'undefined' && !customElements.get('mahfitt-companion')) {
  class MahfittElement extends HTMLElement {
    static observedAttributes = ['character', 'theme', 'reduced-motion'];
    connectedCallback() {
      if (this.loading || this.companion) return;
      const root = this.shadowRoot ?? this.attachShadow({ mode: 'open' });
      this.loading = mountCompanion(root, {
        character: this.getAttribute('character') || 'female', theme: this.getAttribute('theme') || 'blue',
        onError: error => this.dispatchEvent(new CustomEvent('companion-error', { detail: error }))
      }).then(companion => {
        if (!this.isConnected) { companion.dispose(); return; }
        this.companion = companion;
        if (this.hasAttribute('reduced-motion')) companion.setReducedMotion(true);
        this.dispatchEvent(new CustomEvent('companion-ready', { detail: companion }));
      }).catch(error => this.dispatchEvent(new CustomEvent('companion-error', { detail: error })))
        .finally(() => { this.loading = null; });
    }
    disconnectedCallback() { this.companion?.dispose(); this.companion = null; }
    attributeChangedCallback(name, previous, value) {
      if (value === previous || !this.companion) return;
      const operation = name === 'character' ? this.companion.setCharacter(value || 'female')
        : name === 'theme' ? this.companion.setTheme(value || 'blue') : this.companion.setReducedMotion(value !== null);
      Promise.resolve(operation).catch(error => this.dispatchEvent(new CustomEvent('companion-error', { detail: error })));
    }
    async setCharacter(value) { await this.loading; return this.companion.setCharacter(value); }
    async setTheme(value) { await this.loading; return this.companion.setTheme(value); }
    async play(value) { await this.loading; return this.companion.play(value); }
    async returnToIdle() { await this.loading; return this.companion.returnToIdle(); }
    async bindTheme(source) { await this.loading; return this.companion.bindTheme(source); }
  }
  customElements.define('mahfitt-companion', MahfittElement);
}
