import assert from 'node:assert/strict';
import { makeTimeline, frameAt, MahfittCompanion } from '../../11_PROTOTYPE/SMOOTH_APP/runtime.js';

const timeline = makeTimeline([40, 60, 200]);
assert.deepEqual([0, 39, 40, 99, 100, 299, 300, 340].map(t => frameAt(timeline, t, true).index), [0,0,1,1,2,2,0,1]);
assert.equal(frameAt(timeline, 300, false).done, true);
assert.throws(() => makeTimeline([]));
assert.throws(() => makeTimeline([0]));
let nextId = 0, cancelled = 0;
const scheduled = new Map(), listeners = new Map();
globalThis.requestAnimationFrame = fn => { scheduled.set(++nextId, fn); return nextId; };
globalThis.cancelAnimationFrame = id => { scheduled.delete(id); ++cancelled; };
globalThis.document = { hidden: false, addEventListener: (name, fn) => listeners.set(name, fn), removeEventListener: name => listeners.delete(name) };
const ctx = { imageSmoothingEnabled: true, clearRect() {}, drawImage() {} };
const canvas = { width: 512, height: 512, style: {}, getContext: () => ctx };
const player = new MahfittCompanion(canvas);
const states = {
  idle_neutral: { frames: [{}, {}, {}], spec: { loop: true }, timeline },
  point_right: { frames: [{}, {}, {}], spec: { loop: false, holdFrame: 1 }, timeline }
};
player._prepareState = async name => states[name];
await player.play('idle_neutral');
const tick = t => { const [id, fn] = scheduled.entries().next().value; scheduled.delete(id); fn(t); };
for (let i = 0; i <= 60; i++) tick(i * 1000 / 60);
assert.ok(Math.abs(player.getPlaybackStats().rafHz - 60) < 1e-8);
assert.equal(player.getPlaybackStats().callbacks, 61);
assert.equal(ctx.imageSmoothingEnabled, false);
assert.equal(scheduled.size, 1);
player.pause(); assert.equal(scheduled.size, 0);
player.resume(); tick(2000); assert.ok(Math.abs(player.elapsedMs - 1000) < 1e-8);
document.hidden = true; listeners.get('visibilitychange')(); assert.equal(scheduled.size, 0);
document.hidden = false; listeners.get('visibilitychange')(); tick(5000);
assert.ok(Math.abs(player.elapsedMs - 1000) < 1e-8);
player.setReducedMotion(true); await player.play('point_right'); assert.equal(player.frameIndex, 1);
player.setReducedMotion(false); await player.play('point_right'); tick(6000); tick(6100); tick(6200); tick(6300);
await new Promise(resolve => setImmediate(resolve)); assert.equal(player.animation, 'idle_neutral');
let theme = { secondary: '#008cff' }, notify, unsubscribed = 0;
const unbind = player.bindTheme({ getSnapshot: () => theme, subscribe: fn => { notify = fn; return () => ++unsubscribed; } });
theme = { secondary: '#ff7700' }; notify(); await Promise.resolve(); assert.equal(player.theme, '#ff7700');
unbind(); assert.equal(unsubscribed, 1);
await assert.rejects(player.setTheme('invalid'), TypeError);
player.dispose(); assert.equal(scheduled.size, 0); assert.equal(listeners.size, 0); assert.ok(cancelled > 0);
await assert.rejects(player.play('idle_neutral'), { name: 'AbortError' });
console.log('PASS: timeline, exact boundaries, 60 Hz clock, pause/resume, visibility, reduced motion, return to idle, theme subscription, disposal.');
