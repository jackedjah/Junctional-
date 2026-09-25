import { MahfittCompanion } from './runtime.js';

const $ = id => document.getElementById(id);
const reportError = error => { if (error.name !== 'AbortError') $('status').textContent = `Error: ${error.message}`; };
const companion = new MahfittCompanion($('mascot'), {
  onState: ({ character, theme, animation }) => {
    $('status').textContent = `${character} · ${theme} · ${animation}`;
    $('animation').value = animation;
  }, onError: reportError
});
let currentTheme = 'blue';
const themeListeners = new Set();
companion.bindTheme({ getSnapshot: () => currentTheme,
  subscribe: listener => { themeListeners.add(listener); return () => themeListeners.delete(listener); } });
const publishTheme = value => { currentTheme = value; themeListeners.forEach(listener => listener()); };
const loadCharacter = async value => {
  await companion.setCharacter(value);
  $('animation').replaceChildren(...Object.keys(companion.manifest.animations).map(name => new Option(name, name)));
  $('animation').value = companion.animation;
};
$('character').onchange = event => loadCharacter(event.target.value).catch(reportError);
$('theme').onchange = event => publishTheme(event.target.value);
$('app-theme').oninput = event => publishTheme({ secondary: event.target.value });
$('play').onclick = () => companion.play($('animation').value).catch(reportError);
$('idle').onclick = () => companion.returnToIdle().catch(reportError);
$('reduced').checked = companion.reducedMotion;
$('reduced').onchange = event => companion.setReducedMotion(event.target.checked);
await loadCharacter('female').catch(reportError);
const meter = setInterval(() => {
  const stats = companion.getPlaybackStats();
  $('fps').textContent = `Display ${stats.rafHz.toFixed(1)} Hz · ${stats.authoredFrames} authored frames · ${stats.interpolation}`;
}, 1000);
window.addEventListener('pagehide', () => { clearInterval(meter); companion.dispose(); }, { once: true });
