// AIに「私について」を読ませる4けたの確認番号（2026-11-13 ひびき）
//
// 発行: POST /ai/issue   本人の Google ログイン（Firebase の ID トークン）が必要。{ scope, text } → { code, exp }
// 読む: POST /ai/read    ヘッダー X-Hibiki-Code: 1234 → { scope, text }（1回で消える）
// 状態: POST /ai/status  本人だけ。いま有効な番号と、発行の記録（最新20件）
// 取消: POST /ai/revoke  本人だけ。いまの番号をすぐ消す
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

// Firebase の ID トークンを確かめる。本人（uid・メール確認ずみ）のときだけ true
export async function isOwnerToken(token, { fetchFn = fetch, now = Date.now(), owner = OWNER } = {}) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 3) return false;
    const head = JSON.parse(new TextDecoder().decode(b64url(parts[0])));
    const body = JSON.parse(new TextDecoder().decode(b64url(parts[1])));
    if (head.alg !== "RS256" || !head.kid) return false;
    const jwk = (await googleKeys(fetchFn)).find((k) => k.kid === head.kid);
    if (!jwk) return false;
    const key = await crypto.subtle.importKey("jwk", { kty: "RSA", n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64url(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
    if (!ok) return false;
    const t = Math.floor(now / 1000);
    return body.aud === owner.project && body.iss === "https://securetoken.google.com/" + owner.project &&
      body.sub === owner.uid && body.email_verified === true &&
      typeof body.exp === "number" && body.exp > t && typeof body.iat === "number" && body.iat <= t + 60;
  } catch (e) {
    return false;
  }
}

// storage: { get(k), put(k,v), delete(k) }（Durable Object の storage と同じ形）
export async function aiHandle(storage, action, input = {}, now = Date.now(), rand = crypto) {
  let cur = await storage.get("ai");
  const log = (await storage.get("ai-log")) || [];
  const note = async (entry) => { log.unshift(entry); await storage.put("ai-log", log.slice(0, LOG_MAX)); };
  if (cur && cur.exp <= now) {
    await storage.delete("ai");
    await note({ at: cur.at, scope: cur.scope, end: "expired" });
    cur = null;
  }
  if (action === "issue") {
    const text = input.text, scope = input.scope;
    if (!SCOPES.includes(scope) || typeof text !== "string" || !text.trim() || text.length > MAX_TEXT) return { error: "bad" };
    if (cur) await note({ at: cur.at, scope: cur.scope, end: "replaced" });
    const code = newCode(rand);
    cur = { code, scope, text, at: now, exp: now + AI_TTL, fails: 0 };
    await storage.put("ai", cur);
    return { code, scope, exp: cur.exp };
  }
  if (action === "read") {
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
    await note({ at: cur.at, scope: cur.scope, end: "read", readAt: now, fails: cur.fails });
    return { scope: cur.scope, text: cur.text };
  }
  if (action === "revoke") {
    if (cur) { await storage.delete("ai"); await note({ at: cur.at, scope: cur.scope, end: "revoked" }); }
    return { ok: true };
  }
  if (action === "status") {
    return { active: cur ? { code: cur.code, scope: cur.scope, exp: cur.exp, fails: cur.fails } : null, log };
  }
  return { error: "bad" };
}
