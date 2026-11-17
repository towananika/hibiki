import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { aiHandle, newCode, isOwnerToken, resetKeyCache, aiName, AI_TTL, GRANT_TTL, GRANT_TTLS, OWNER } from './ai-code.js';

function store() { const m = new Map(); return { m, get: async k => m.get(k), put: async (k, v) => { m.set(k, structuredClone(v)); }, delete: async k => { m.delete(k); } }; }
const fixed = n => ({ getRandomValues: a => { a[0] = n; return a; } });

test('番号は4けた、かたよりなし', () => {
  for (let i = 0; i < 200; i++) assert.match(newCode(), /^\d{4}$/);
  assert.equal(newCode(fixed(7)), '0007');
});

test('正しい番号で1回だけ読める', async () => {
  const s = store();
  const { code } = await aiHandle(s, 'issue', { scope: 'safe', text: 'こんにちは' }, 1000);
  const r = await aiHandle(s, 'read', { code }, 2000);
  assert.equal(r.text, 'こんにちは');
  assert.equal(r.scope, 'safe');
  assert.equal((await aiHandle(s, 'read', { code }, 3000)).error, 'none');
  assert.equal((await aiHandle(s, 'status', {}, 3000)).log[0].end, 'read');
});

test('3回まちがえると番号ごと消える', async () => {
  const s = store();
  await aiHandle(s, 'issue', { scope: 'all', text: 'x' }, 0, fixed(1234));
  assert.deepEqual(await aiHandle(s, 'read', { code: '0000' }, 1), { error: 'wrong', left: 2 });
  assert.deepEqual(await aiHandle(s, 'read', { code: 'abcd' }, 2), { error: 'wrong', left: 1 });
  assert.deepEqual(await aiHandle(s, 'read', { code: '9999' }, 3), { error: 'locked' });
  assert.equal((await aiHandle(s, 'read', { code: '1234' }, 4)).error, 'none');
  assert.equal(s.m.has('ai'), false);
});

test('5分で切れる、取り消せる、文は記録に残らない', async () => {
  const s = store();
  const { code } = await aiHandle(s, 'issue', { scope: 'safe', text: '秘密' }, 0);
  assert.equal((await aiHandle(s, 'read', { code }, AI_TTL)).error, 'none');
  const b = await aiHandle(s, 'issue', { scope: 'safe', text: '秘密' }, AI_TTL + 1);
  await aiHandle(s, 'revoke', {}, AI_TTL + 2);
  assert.equal((await aiHandle(s, 'read', { code: b.code }, AI_TTL + 3)).error, 'none');
  const st = await aiHandle(s, 'status', {}, AI_TTL + 4);
  assert.deepEqual(st.log.map(e => e.end), ['revoked', 'expired']);
  assert.equal(JSON.stringify(st).includes('秘密'), false);
});

test('発行の中身を確かめる', async () => {
  const s = store();
  assert.equal((await aiHandle(s, 'issue', { scope: 'x', text: 'a' })).error, 'bad');
  assert.equal((await aiHandle(s, 'issue', { scope: 'all', text: ' ' })).error, 'bad');
  assert.equal((await aiHandle(s, 'issue', { scope: 'all', text: 'a'.repeat(300000) })).error, 'bad');
});

test('本人のGoogleログインだけ通す', async () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1' };
  const fetchFn = async () => ({ ok: true, json: async () => ({ keys: [jwk] }) });
  const now = 1_800_000_000_000, t = now / 1000;
  const sign = (body, kid = 'k1', key = privateKey) => {
    const enc = o => Buffer.from(JSON.stringify(o)).toString('base64url');
    const head = enc({ alg: 'RS256', kid }) + '.' + enc(body);
    return head + '.' + createSign('RSA-SHA256').update(head).sign(key).toString('base64url');
  };
  const good = { aud: OWNER.project, iss: 'https://securetoken.google.com/' + OWNER.project, sub: OWNER.uid, email_verified: true, iat: t - 10, exp: t + 3600 };
  const check = async tok => { resetKeyCache(); return isOwnerToken(tok, { fetchFn, now }); };
  assert.equal(await check(sign(good)), true);
  assert.equal(await check(sign({ ...good, sub: 'someone' })), false);
  assert.equal(await check(sign({ ...good, email_verified: false })), false);
  assert.equal(await check(sign({ ...good, exp: t - 1 })), false);
  assert.equal(await check(sign({ ...good, aud: 'other' })), false);
  assert.equal(await check(sign(good, 'k2')), false);
  const other = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  assert.equal(await check(sign(good, 'k1', other)), false);
  assert.equal(await check('a.b.c'), false);
  assert.equal(await check(''), false);
});

test('読めたAIは名前つきで一覧に残り、許可証で読み直せる', async () => {
  const s = store();
  const { code } = await aiHandle(s, 'issue', { scope: 'safe', text: '説明書' }, 0);
  const r = await aiHandle(s, 'read', { code, ai: 'ChatGPT' }, 10);
  assert.match(r.pass, /^[0-9a-f]{12}\.[0-9a-f]{32}$/);
  assert.equal(r.passExp, 10 + GRANT_TTL);
  const again = await aiHandle(s, 'read', { pass: r.pass }, 20);
  assert.equal(again.text, '説明書');
  assert.equal((await aiHandle(s, 'read', { pass: r.pass.slice(0, -1) + 'x' }, 21)).error, 'pass');
  const st = await aiHandle(s, 'status', {}, 30);
  assert.equal(st.grants.length, 1);
  assert.equal(st.grants[0].name, 'ChatGPT');
  assert.equal(st.grants[0].reads, 2);
  assert.equal(st.log[0].ai, 'ChatGPT');
  const shown = JSON.stringify(st);
  assert.equal(shown.includes('説明書'), false);
  assert.equal(shown.includes(r.pass.split('.')[1]), false);
  assert.equal(JSON.stringify([...s.m.values()]).includes(r.pass.split('.')[1]), false);
});

test('許可したAIを1件ずつ取り消せる、文も一緒に消える', async () => {
  const s = store();
  const a = await aiHandle(s, 'read', { code: (await aiHandle(s, 'issue', { scope: 'safe', text: 'A' }, 0)).code, ai: 'Claude' }, 1);
  const b = await aiHandle(s, 'read', { code: (await aiHandle(s, 'issue', { scope: 'all', text: 'B' }, 2)).code, ai: 'Gemini' }, 3);
  const st = await aiHandle(s, 'status', {}, 4);
  assert.deepEqual(st.grants.map(g => g.name), ['Gemini', 'Claude']);
  const claude = st.grants.find(g => g.name === 'Claude');
  assert.deepEqual(await aiHandle(s, 'unlink', { id: claude.id }, 5), { ok: true });
  assert.equal((await aiHandle(s, 'read', { pass: a.pass }, 6)).error, 'pass');
  assert.equal((await aiHandle(s, 'read', { pass: b.pass }, 6)).text, 'B');
  assert.equal(s.m.has('ai-text:' + claude.id), false);
  assert.equal((await aiHandle(s, 'unlink', { id: claude.id }, 7)).error, 'none');
  const after = await aiHandle(s, 'status', {}, 8);
  assert.equal(after.log[0].end, 'unlinked');
  assert.deepEqual(await aiHandle(s, 'forget', { id: after.log[0].id }, 9), { ok: true });
  assert.equal((await aiHandle(s, 'status', {}, 10)).log.some(e => e.end === 'unlinked'), false);
});

test('許可証は期限で自然に切れる', async () => {
  const s = store();
  const r = await aiHandle(s, 'read', { code: (await aiHandle(s, 'issue', { scope: 'safe', text: 'x' }, 0)).code }, 1);
  assert.equal((await aiHandle(s, 'read', { pass: r.pass }, 1 + GRANT_TTL)).error, 'pass');
  const st = await aiHandle(s, 'status', {}, 2 + GRANT_TTL);
  assert.equal(st.grants.length, 0);
  assert.equal(st.log[0].end, 'pass-expired');
  assert.equal([...s.m.keys()].some(k => k.startsWith('ai-text:')), false);
});

test('AIの名前は短く、空なら名前なし', () => {
  assert.equal(aiName('  '), '名前なしのAI');
  assert.equal(aiName('<b>Chat\nGPT</b>'), 'bChatGPT/b');
  assert.equal(aiName('あ'.repeat(50)).length, 30);
});

test('読み直せる長さは発行のときに選ぶ。1回だけも選べ、無期限はない', async () => {
  const s = store(), H = 60 * 60 * 1000;
  assert.deepEqual(GRANT_TTLS, [0, H, 24 * H, 7 * 24 * H]);
  assert.equal((await aiHandle(s, 'issue', { scope: 'safe', text: 'x', ttl: 30 * 24 * H }, 0)).error, 'bad');
  assert.equal((await aiHandle(s, 'issue', { scope: 'safe', text: 'x', ttl: Infinity }, 0)).error, 'bad');
  assert.equal((await aiHandle(s, 'issue', { scope: 'safe', text: 'x', ttl: '3600000' }, 0)).error, 'bad');
  const once = await aiHandle(s, 'read', { code: (await aiHandle(s, 'issue', { scope: 'safe', text: 'x', ttl: 0 }, 0)).code, ai: 'A' }, 1);
  assert.equal(once.text, 'x');
  assert.equal(once.pass, undefined);
  assert.equal((await aiHandle(s, 'status', {}, 2)).grants.length, 0);
  const iss = await aiHandle(s, 'issue', { scope: 'safe', text: 'y', ttl: H }, 10);
  assert.equal(iss.ttl, H);
  assert.equal((await aiHandle(s, 'status', {}, 11)).active.ttl, H);
  const hour = await aiHandle(s, 'read', { code: iss.code, ai: 'B' }, 20);
  assert.equal(hour.passExp, 20 + H);
  assert.equal((await aiHandle(s, 'status', {}, 21)).grants[0].ttl, H);
  assert.equal((await aiHandle(s, 'read', { pass: hour.pass }, 19 + H)).text, 'y');
  assert.equal((await aiHandle(s, 'read', { pass: hour.pass }, 20 + H)).error, 'pass');
  const week = await aiHandle(s, 'read', { code: (await aiHandle(s, 'issue', { scope: 'all', text: 'z', ttl: 7 * 24 * H }, 30)).code }, 31);
  assert.equal(week.passExp, 31 + 7 * 24 * H);
});
