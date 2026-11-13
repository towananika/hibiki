import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { aiHandle, newCode, isOwnerToken, resetKeyCache, AI_TTL, OWNER } from './ai-code.js';

function store() { const m = new Map(); return { m, get: async k => m.get(k), put: async (k, v) => { m.set(k, structuredClone(v)); }, delete: async k => { m.delete(k); } }; }
const fixed = n => ({ getRandomValues: a => { a[0] = n; return a; } });

test('番号は4けた、かたよりなし', () => {
  for (let i = 0; i < 200; i++) assert.match(newCode(), /^\d{4}$/);
  assert.equal(newCode(fixed(7)), '0007');
});

test('正しい番号で1回だけ読める', async () => {
  const s = store();
  const { code } = await aiHandle(s, 'issue', { scope: 'safe', text: 'こんにちは' }, 1000);
  assert.deepEqual(await aiHandle(s, 'read', { code }, 2000), { scope: 'safe', text: 'こんにちは' });
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
