import test from 'node:test';
import assert from 'node:assert/strict';
import { hikariHandle, hikariMerge, hikariClean } from './hikari.js';

function store() { const m = new Map(); return { m, get: async k => m.get(k), put: async (k, v) => { m.set(k, structuredClone(v)); }, delete: async k => { m.delete(k); } }; }

test('端末AとBの記録がまざって残る', async () => {
  const s = store();
  await hikariHandle(s, 'sync', { state: { days: { '2026-11-15': { t: 10, a: { sort: { f: 3, s: true } } } } } }, 1000);
  const out = await hikariHandle(s, 'sync', { state: { days: { '2026-11-16': { t: 20, a: { move: { f: 1 } } } } } }, 1000);
  assert.deepEqual(Object.keys(out.state.days).sort(), ['2026-11-15', '2026-11-16']);
});

test('同じ日は新しいほうが勝つ', () => {
  const m = hikariMerge({ days: { '2026-11-16': { t: 5, a: { idea: { f: 2 } } } } }, { days: { '2026-11-16': { t: 9, a: { sort: { f: 3 } } } } }, 100);
  assert.deepEqual(m.days['2026-11-16'].a, { sort: { f: 3, s: false } });
});

test('知らない光・おかしな日・未来の時刻は捨てる', () => {
  const c = hikariClean({ days: { 'x': { t: 1, a: {} }, '2026-11-16': { t: 1, a: { hack: { f: 3 }, sort: { f: 7 } } }, '2026-11-17': { t: 1e15, a: {} } }, tries: { '2026-11-16': { t: 1, done: ['grow', 'evil'] } } }, 1000);
  assert.deepEqual(c, { v: 1, days: { '2026-11-16': { t: 1, a: {} } }, tries: { '2026-11-16': { t: 1, done: ['grow'] } } });
});

test('消すと空になる', async () => {
  const s = store();
  await hikariHandle(s, 'sync', { state: { days: { '2026-11-15': { t: 1, a: {} } } } }, 1000);
  assert.deepEqual(await hikariHandle(s, 'wipe'), { ok: true });
  assert.equal(s.m.has('hikari'), false);
});
