import test from 'node:test';
import assert from 'node:assert/strict';
import { hiyokoHandle, hiyokoEmail, HIYOKO_OWNER_EMAILS } from './hiyoko.js';

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

test('オーナーのメールは小文字で正しい形', () => {
  assert.ok(HIYOKO_OWNER_EMAILS.length > 0);
  for (const e of HIYOKO_OWNER_EMAILS) assert.equal(hiyokoEmail(e), e);
  assert.ok(HIYOKO_OWNER_EMAILS.includes('jaykim.can@gmail.com'));
});

// ---- レポート掲示板（2026-11-25）----
test('招待コードがないと登録できず、まちがいは断る', async () => {
  const s = store();
  assert.deepEqual(await hiyokoHandle(s, 'join', { code: 'x', name: 'A', ai: true }, {}), { error: 'closed' });
  const { invite } = await hiyokoHandle(s, 'invite', {}, OWNER);
  assert.match(invite, /^HYK-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.deepEqual(await hiyokoHandle(s, 'join', { code: 'HYK-0000-0000', name: 'A', ai: true }, {}), { error: 'code' });
  assert.deepEqual(await hiyokoHandle(s, 'join', { code: invite, name: '花子' }, {}), { error: 'login' });
  assert.deepEqual(await hiyokoHandle(s, 'invite', {}, { email: 'x@example.com' }), { error: 'forbidden' });
});

test('人はGoogleログイン＋招待コードで関係者になり、自分の名前で登録できる', async () => {
  const s = store();
  const { invite } = await hiyokoHandle(s, 'invite', {}, OWNER);
  const who = { email: 'hana@example.com', name: 'Hana G' };
  assert.equal((await hiyokoHandle(s, 'me', {}, who)).member, false);
  assert.deepEqual(await hiyokoHandle(s, 'join', { code: invite.toLowerCase(), name: ' 花子 <b>' }, who), { ok: true, name: '花子 b' });
  assert.equal((await hiyokoHandle(s, 'me', {}, who)).member, true);
  const { item } = await hiyokoHandle(s, 'rput', { title: 'T', body: '本文' }, who, 100);
  assert.equal(item.by, '花子 b'); assert.equal(item.ai, false); assert.equal(item.mine, true);
  // 社内資料も読める（関係者になったので）
  assert.deepEqual(await hiyokoHandle(s, 'doc', { id: 'strategy' }, who), { error: 'none' });
});

test('AIは自分の鍵で登録し、名前はAIの名前になる。止めると使えない', async () => {
  const s = store();
  const { invite } = await hiyokoHandle(s, 'invite', {}, OWNER);
  const ai = await hiyokoHandle(s, 'join', { code: invite, name: 'Claude', ai: true }, {});
  assert.match(ai.key, /^hyk_[0-9a-f]{48}$/);
  const { item } = await hiyokoHandle(s, 'rput', { title: '分析', body: '- a' }, { key: ai.key }, 200);
  assert.equal(item.by, 'Claude'); assert.equal(item.ai, true);
  assert.equal((await hiyokoHandle(s, 'reports', {}, {})).items.find((x) => x.title === '分析').by, 'Claude');
  // AI の鍵では社内資料は読めない
  assert.deepEqual(await hiyokoHandle(s, 'doc', { id: 'strategy' }, { key: ai.key }), { error: 'forbidden' });
  assert.deepEqual(await hiyokoHandle(s, 'rput', { title: 'x', body: 'y' }, { key: 'hyk_wrong' }), { error: 'forbidden' });
  await hiyokoHandle(s, 'ai_off', { id: ai.id }, OWNER);
  assert.deepEqual(await hiyokoHandle(s, 'rput', { title: 'x', body: 'y' }, { key: ai.key }), { error: 'forbidden' });
});

test('🔒の物は関係者にだけ。直す・消すは本人かオーナーだけ', async () => {
  const s = store();
  const { invite } = await hiyokoHandle(s, 'invite', {}, OWNER);
  const a = await hiyokoHandle(s, 'join', { code: invite, name: 'A', ai: true }, {});
  const b = await hiyokoHandle(s, 'join', { code: invite, name: 'B', ai: true }, {});
  const { item } = await hiyokoHandle(s, 'rput', { title: '秘', body: 'x', lock: true }, { key: a.key }, 1);
  assert.equal((await hiyokoHandle(s, 'reports', {}, {})).items.filter((x) => x.aid !== 1 && x.title === '秘').length, 0);
  assert.deepEqual(await hiyokoHandle(s, 'report', { id: item.id }, {}), { error: 'none' });
  assert.equal((await hiyokoHandle(s, 'reports', {}, { key: b.key })).items.filter((x) => x.title === '秘').length, 1);
  assert.deepEqual(await hiyokoHandle(s, 'rput', { id: item.id, title: 'z', body: 'z' }, { key: b.key }), { error: 'forbidden' });
  assert.deepEqual(await hiyokoHandle(s, 'rdel', { id: item.id }, { key: b.key }), { error: 'forbidden' });
  assert.equal((await hiyokoHandle(s, 'rput', { id: item.id, title: '直した', body: 'z' }, { key: a.key }, 5)).item.up, 5);
  assert.deepEqual(await hiyokoHandle(s, 'rdel', { id: item.id }, OWNER), { ok: true });
  assert.equal((await hiyokoHandle(s, 'reports', {}, OWNER)).items.filter((x) => x.id === item.id).length, 0);
  assert.deepEqual(await hiyokoHandle(s, 'rput', { title: '', body: 'x' }, { key: a.key }), { error: 'empty' });
  assert.deepEqual(await hiyokoHandle(s, 'rput', { title: 't', body: 'x' }, {}), { error: 'forbidden' });
});

test('招待コードを止めると新しい登録はできない（登録ずみの人はそのまま）', async () => {
  const s = store();
  const { invite } = await hiyokoHandle(s, 'invite', {}, OWNER);
  const a = await hiyokoHandle(s, 'join', { code: invite, name: 'A', ai: true }, {});
  await hiyokoHandle(s, 'invite', { off: true }, OWNER);
  assert.deepEqual(await hiyokoHandle(s, 'join', { code: invite, name: 'C', ai: true }, {}), { error: 'closed' });
  assert.ok((await hiyokoHandle(s, 'rput', { title: 't', body: 'b' }, { key: a.key })).item);
  const l = await hiyokoHandle(s, 'list', {}, OWNER);
  assert.equal(l.invite, ''); assert.equal(l.ais.length, 1);
});

test('掲示板の前のレポートは1回だけ入り、管理者は直す・消すができ、消したら戻らない', async () => {
  const s = store();
  const r = await hiyokoHandle(s, 'reports', {}, {});
  assert.equal(r.items.length, 17);
  assert.equal(r.items.find((x) => x.id === '8').by, 'remitech'); assert.equal(r.items.find((x) => x.id === '8').ai, false);
  assert.equal(r.items.find((x) => x.id === '9').by, 'Claude'); assert.equal(r.items.find((x) => x.id === '9').ai, true); assert.equal(r.items[0].mine, false);
  assert.ok((await hiyokoHandle(s, 'report', { id: '4' }, {})).item.body.includes('## 4グループの整理'));
  assert.equal((await hiyokoHandle(s, 'reports', {}, OWNER)).items[0].mine, true);
  assert.equal((await hiyokoHandle(s, 'rput', { id: '1', title: '直した', body: 'x' }, OWNER, 9)).item.title, '直した');
  assert.deepEqual(await hiyokoHandle(s, 'rdel', { id: '2' }, OWNER), { ok: true });
  assert.equal((await hiyokoHandle(s, 'reports', {}, {})).items.length, 16);
  assert.deepEqual(await hiyokoHandle(s, 'report', { id: '2' }, {}), { error: 'none' });
  // 関係者でも作成者でなければ直せない
  const { invite } = await hiyokoHandle(s, 'invite', {}, OWNER);
  const ai = await hiyokoHandle(s, 'join', { code: invite, name: 'Other', ai: true }, {});
  assert.deepEqual(await hiyokoHandle(s, 'rdel', { id: '3' }, { key: ai.key }), { error: 'forbidden' });
});
