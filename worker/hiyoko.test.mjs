import test from 'node:test';
import assert from 'node:assert/strict';
import { hiyokoHandle, hiyokoEmail } from './hiyoko.js';

function store() { const m = new Map(); return { m, get: async k => m.get(k), put: async (k, v) => { m.set(k, structuredClone(v)); }, delete: async k => { m.delete(k); } }; }
const OWNER = { owner: true, email: 'owner@example.com' };

test('ログインしていても、関係者でなければ読めない', async () => {
  const s = store();
  await hiyokoHandle(s, 'put', { id: 'strategy', html: '<title>戦略</title>中身' }, OWNER, 5);
  assert.deepEqual(await hiyokoHandle(s, 'doc', { id: 'strategy' }, { email: 'x@example.com' }), { error: 'forbidden' });
  assert.deepEqual(await hiyokoHandle(s, 'doc', { id: 'strategy' }, {}), { error: 'forbidden' });
});

test('オーナーが関係者にした人は読める、外すと読めない', async () => {
  const s = store();
  await hiyokoHandle(s, 'put', { id: 'review', html: '<title>振り返り</title>本文' }, OWNER, 7);
  await hiyokoHandle(s, 'member', { email: ' Friend@Example.com ', on: true }, OWNER);
  assert.deepEqual(await hiyokoHandle(s, 'doc', { id: 'review' }, { email: 'friend@example.com' }), { html: '<title>振り返り</title>本文', title: '振り返り', at: 7 });
  await hiyokoHandle(s, 'member', { email: 'friend@example.com', on: false }, OWNER);
  assert.deepEqual(await hiyokoHandle(s, 'doc', { id: 'review' }, { email: 'friend@example.com' }), { error: 'forbidden' });
});

test('関係者でも管理（一覧・追加・登録）はできない', async () => {
  const s = store();
  await hiyokoHandle(s, 'member', { email: 'friend@example.com', on: true }, OWNER);
  const who = { email: 'friend@example.com' };
  for (const [a, i] of [['list', {}], ['member', { email: 'z@example.com', on: true }], ['put', { id: 'strategy', html: 'x' }]])
    assert.deepEqual(await hiyokoHandle(s, a, i, who), { error: 'forbidden' });
});

test('知らない資料・おかしなメール・大きすぎる資料は断る', async () => {
  const s = store();
  assert.deepEqual(await hiyokoHandle(s, 'put', { id: '../x', html: 'a' }, OWNER), { error: 'bad' });
  assert.deepEqual(await hiyokoHandle(s, 'member', { email: 'nope', on: true }, OWNER), { error: 'bad_email' });
  assert.deepEqual(await hiyokoHandle(s, 'put', { id: 'strategy', html: 'a'.repeat(1024 * 1024) }, OWNER), { error: 'too_big' });
  assert.equal(hiyokoEmail('A@B.co'), 'a@b.co');
  assert.deepEqual(await hiyokoHandle(s, 'doc', { id: 'strategy' }, OWNER), { error: 'none' });
});

import { hiyokoHit, hiyokoStats, hiyokoPath } from './hiyoko.js';
function store2() { const m = new Map(); return { m, get: async k => m.get(k), put: async (k, v) => { m.set(k, structuredClone(v)); }, delete: async ks => { for (const k of [].concat(ks)) m.delete(k); },
  list: async ({ prefix = '', start = '', end = '￿' } = {}) => new Map([...m].filter(([k]) => k.startsWith(prefix) && k >= start && k < end).sort()) }; }
const T = Date.UTC(2026, 10, 20, 3); // 2026-11-20 12:00 KST

test('閲覧はページと日付ごとに数え、オーナーだけが集計を見られる', async () => {
  const s = store2();
  await hiyokoHit(s, { path: '/hiyoko/' }, T);
  await hiyokoHit(s, { path: '/hiyoko/index.html' }, T);
  await hiyokoHit(s, { path: '/hiyoko/x/posts/?lang=en' }, T);
  await hiyokoHit(s, { path: '/hiyoko/' }, T - 86400000);
  assert.deepEqual(await hiyokoStats(s, { days: 7 }, { email: 'x@example.com' }, T), { error: 'forbidden' });
  const out = await hiyokoStats(s, { days: 7 }, { owner: true }, T);
  assert.deepEqual(out.days, { '2026-11-19': { '/hiyoko/': 1 }, '2026-11-20': { '/hiyoko/': 2, '/hiyoko/x/posts/': 1 } });
});

test('ほかのサイトや変なパスは数えない、IPなどは保存しない', async () => {
  const s = store2();
  for (const p of ['/hibiki/', '/hiyoko/../x/', 'https://evil/hiyoko/', '/hiyoko/' + 'a'.repeat(80) + '/', ''])
    assert.deepEqual(await hiyokoHit(s, { path: p }, T), { error: 'bad' });
  await hiyokoHit(s, { path: '/hiyoko/news/', ip: '1.2.3.4', ua: 'x' }, T);
  assert.deepEqual([...s.m.values()], [{ '/hiyoko/news/': 1 }]);
  assert.equal(hiyokoPath('/hiyoko/internal/admin'), '/hiyoko/internal/admin/');
});
