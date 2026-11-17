// AIに「私について」を読ませる4けたの確認番号（2026-11-13 ひびき）
//
// 発行: POST /ai/issue   本人の Google ログイン（Firebase の ID トークン）が必要。{ scope, text, ttl? } → { code, exp, ttl }
// 読む: POST /ai/read    ヘッダー X-Hibiki-Code: 1234（と X-Hibiki-AI: 名前）→ { scope, text, pass, passExp }
//       GET  /ai/read?code=1234&ai=名前  URL を開くだけの AI 用。同じ中身を文字で返す
//       許可証 pass で読み直す: ヘッダー X-Hibiki-Pass か ?pass=（発行時に選んだ長さのあいだ・取り消すまで）
// 状態: POST /ai/status  本人だけ。いま有効な番号、許可したAIの一覧、記録（最新20件）
// 取消: POST /ai/revoke  本人だけ。いまの番号をすぐ消す
//       POST /ai/unlink { id }  本人だけ。許可したAIを1件取り消す（許可証がすぐ使えなくなる）
//       POST /ai/forget { id }  本人だけ。記録を1件消す
//
// 許可したAI（2026-11-17）
//   - 番号で正しく読めたAIに、読むだけの許可証を1つ渡す。名前（AIの自己申告）と時刻を一覧に残す
//   - 許可証はサーバーにはハッシュだけ置く。発行時に選んだ長さ（1回だけ・1時間・24時間・7日）で自然に切れる。一覧から1件ずつ取り消せる
//   - 文は許可が生きているあいだだけサーバーに置き、取り消し・期限切れで一緒に消す
//
// 守り（4けたは弱いので、ここで補う）
//   - 番号はサーバーが作る。有効5分。正しく読めたらすぐ消える（1回限り）
//   - まちがいは3回で番号ごと消える（だれが試しても合計で数える）。当てずっぽうで当たる確率は 3/10000
//   - 番号は URL に入れない（ヘッダーで送る）。読むだけで、書き込みの道はない
//   - 置いた文は、番号が消えると一緒に消える。記録には「いつ・範囲・結果」だけ残す（中身は残さない）

export const AI_TTL = 5 * 60 * 1000;
export const AI_MAX_FAILS = 3;
const MAX_TEXT = 200 * 1024;
const LOG_MAX = 20;
export const GRANT_TTL = 24 * 60 * 60 * 1000;
// 読み直せる長さは発行のときに本人が選ぶ（2026-11-17）。0 は1回だけ。無期限は作らない（最長7日）
export const GRANT_TTLS = [0, 60 * 60 * 1000, GRANT_TTL, 7 * 24 * 60 * 60 * 1000];
const GRANT_MAX = 10;
const NAME_MAX = 30;
const SCOPES = ["safe", "all"];
const CODE = /^[0-9]{4}$/;
const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

export const OWNER = { uid: "3wzoIaBNjLf9x0BW3HRUcqOHCAG2", project: "triathlon-dcb18" };

// 0000〜9999 をかたよりなく1つ
export function newCode(rand = crypto) {
  const a = new Uint32Array(1), limit = Math.floor(0x100000000 / 10000) * 10000;
  do rand.getRandomValues(a); while (a[0] >= limit);
  return String(a[0] % 10000).padStart(4, "0");
}

function b64url(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

let jwksCache = null;
async function googleKeys(fetchFn) {
  if (jwksCache && jwksCache.until > Date.now()) return jwksCache.keys;
  const r = await fetchFn(JWKS_URL);
  if (!r.ok) throw new Error("jwks");
  const keys = (await r.json()).keys || [];
  jwksCache = { keys, until: Date.now() + 60 * 60 * 1000 };
  return keys;
}
export function resetKeyCache() { jwksCache = null; }

// Firebase の ID トークンを確かめ、中身（uid など）を返す。だめなら null（2026-11-16 光さがし用に分けた）
export async function tokenClaims(token, { fetchFn = fetch, now = Date.now(), project = OWNER.project } = {}) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 3) return null;
    const head = JSON.parse(new TextDecoder().decode(b64url(parts[0])));
    const body = JSON.parse(new TextDecoder().decode(b64url(parts[1])));
    if (head.alg !== "RS256" || !head.kid) return null;
    const jwk = (await googleKeys(fetchFn)).find((k) => k.kid === head.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey("jwk", { kty: "RSA", n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64url(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
    if (!ok) return null;
    const t = Math.floor(now / 1000);
    const good = body.aud === project && body.iss === "https://securetoken.google.com/" + project &&
      typeof body.sub === "string" && body.sub.length > 0 && body.sub.length <= 128 &&
      typeof body.exp === "number" && body.exp > t && typeof body.iat === "number" && body.iat <= t + 60;
    return good ? body : null;
  } catch (e) {
    return null;
  }
}

// 本人（uid・メール確認ずみ）のときだけ true
export async function isOwnerToken(token, { fetchFn = fetch, now = Date.now(), owner = OWNER } = {}) {
  const c = await tokenClaims(token, { fetchFn, now, project: owner.project });
  return !!c && c.sub === owner.uid && c.email_verified === true;
}

// storage: { get(k), put(k,v), delete(k) }（Durable Object の storage と同じ形）
function rid(rand, n) {
  const a = new Uint8Array(n); rand.getRandomValues(a);
  return [...a].map((x) => x.toString(16).padStart(2, "0")).join("");
}
async function hash(s) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("hibiki-pass:" + s));
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
// AIの名前は自己申告。制御文字を消して短くする
export function aiName(s) {
  const t = String(s || "").replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, NAME_MAX);
  return t || "名前なしのAI";
}

export async function aiHandle(storage, action, input = {}, now = Date.now(), rand = crypto) {
  let cur = await storage.get("ai");
  const log = (await storage.get("ai-log")) || [];
  let grants = (await storage.get("ai-grants")) || [];
  const note = async (entry) => { log.unshift({ id: rid(rand, 4), ...entry }); await storage.put("ai-log", log.slice(0, LOG_MAX)); };
  const drop = async (g, end) => {
    grants = grants.filter((x) => x.id !== g.id);
    await storage.put("ai-grants", grants);
    await storage.delete("ai-text:" + g.id);
    await note({ at: g.at, scope: g.scope, ai: g.name, end });
  };
  if (cur && cur.exp <= now) {
    await storage.delete("ai");
    await note({ at: cur.at, scope: cur.scope, end: "expired" });
    cur = null;
  }
  for (const g of grants.slice()) if (g.exp <= now) await drop(g, "pass-expired");

  if (action === "issue") {
    const text = input.text, scope = input.scope, ttl = input.ttl === undefined ? GRANT_TTL : input.ttl;
    if (!SCOPES.includes(scope) || typeof text !== "string" || !text.trim() || text.length > MAX_TEXT || !GRANT_TTLS.includes(ttl)) return { error: "bad" };
    if (cur) await note({ at: cur.at, scope: cur.scope, end: "replaced" });
    const code = newCode(rand);
    cur = { code, scope, text, ttl, at: now, exp: now + AI_TTL, fails: 0 };
    await storage.put("ai", cur);
    return { code, scope, exp: cur.exp, ttl };
  }
  if (action === "read") {
    if (input.pass) {
      const [id, secret] = String(input.pass).split(".");
      const g = grants.find((x) => x.id === id);
      if (!g || !secret || (await hash(secret)) !== g.hash) return { error: "pass" };
      const text = await storage.get("ai-text:" + g.id);
      g.last = now; g.reads = (g.reads || 1) + 1;
      await storage.put("ai-grants", grants);
      return { scope: g.scope, text, passExp: g.exp };
    }
    if (!cur) return { error: "none" };
    const code = String(input.code || "");
    if (!CODE.test(code) || code !== cur.code) {
      cur.fails++;
      if (cur.fails >= AI_MAX_FAILS) {
        await storage.delete("ai");
        await note({ at: cur.at, scope: cur.scope, end: "locked" });
        return { error: "locked" };
      }
      await storage.put("ai", cur);
      return { error: "wrong", left: AI_MAX_FAILS - cur.fails };
    }
    await storage.delete("ai");
    const name = aiName(input.ai);
    await note({ at: cur.at, scope: cur.scope, end: "read", readAt: now, fails: cur.fails, ai: name });
    const out = { scope: cur.scope, text: cur.text };
    const ttl = cur.ttl === undefined ? GRANT_TTL : cur.ttl;
    if (ttl > 0) {
      while (grants.length >= GRANT_MAX) await drop(grants[grants.length - 1], "pushed-out");
      const secret = rid(rand, 16), g = { id: rid(rand, 6), hash: await hash(secret), name, scope: cur.scope, at: now, exp: now + ttl, ttl, last: now, reads: 1 };
      grants.unshift(g);
      await storage.put("ai-text:" + g.id, cur.text);
      await storage.put("ai-grants", grants);
      out.pass = g.id + "." + secret;
      out.passExp = g.exp;
    }
    return out;
  }
  if (action === "revoke") {
    if (cur) { await storage.delete("ai"); await note({ at: cur.at, scope: cur.scope, end: "revoked" }); }
    return { ok: true };
  }
  if (action === "unlink") {
    const g = grants.find((x) => x.id === input.id);
    if (!g) return { error: "none" };
    await drop(g, "unlinked");
    return { ok: true };
  }
  if (action === "forget") {
    const i = log.findIndex((x) => x.id === input.id);
    if (i < 0) return { error: "none" };
    log.splice(i, 1);
    await storage.put("ai-log", log);
    return { ok: true };
  }
  if (action === "status") {
    return {
      active: cur ? { code: cur.code, scope: cur.scope, exp: cur.exp, fails: cur.fails, ttl: cur.ttl === undefined ? GRANT_TTL : cur.ttl } : null,
      grants: grants.map((g) => ({ id: g.id, name: g.name, scope: g.scope, at: g.at, exp: g.exp, ttl: g.ttl, last: g.last, reads: g.reads })),
      log,
    };
  }
  return { error: "bad" };
}
