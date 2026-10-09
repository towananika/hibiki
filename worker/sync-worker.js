// とわなにか — 端末どうしの記録をそろえる置き場（2026-10-09）
//
// しくみ:
//   画面は合言葉を SHA-256 にした id（64桁）だけを送る。合言葉そのものはここに来ない。
//   id ごとに1つの Durable Object（SyncBox）に { 鍵: { v: 文字列, t: 更新時刻ms } } を置く。
//   鍵ごとに新しいほうが勝つ（端末AとBで別のページを触っても両方残る）。
//
// 読む: GET  /pull?id=<id>          → { keys }
// 書く: POST /push { id, keys }     → { keys }（まぜた後の全部）
// 消す: POST /wipe { id }           → { ok }
// 鍵:   GET  /owner                 → { pub }（個人ページを暗号にするための公開鍵。秘密ではない）
//       POST /owner { id, pub }     → 空のときか、同じ id のときだけ置ける（2026-10-09）
// 守り: 同じ IP から、中身のない id を1時間に10回読んだら（合言葉の当てずっぽう）、1時間すべて止める。
//       IP は SHA-256 にしてから持つ（2026-10-09 ひびき：ボットの連続試しをブロック）

import { DurableObject } from "cloudflare:workers";

const ALLOWED = ["https://towananika.github.io", "http://localhost:8899", "http://127.0.0.1:8899"];
const MAX_BODY = 512 * 1024;
const MAX_KEYS = 60;
const ID = /^[0-9a-f]{64}$/;
const KEY = /^hibiki-[a-z0-9-]{1,40}$/;
const MISS_LIMIT = 10;
const WINDOW = 60 * 60 * 1000;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
    const url = new URL(request.url);
    let id = "", body = null;
    if (url.pathname === "/owner") {
      const box = env.BOX.get(env.BOX.idFromName("owner"));
      if (request.method === "GET") return json(await box.owner(null), 200, origin);
      if (request.method === "POST") {
        const guard = env.BOX.get(env.BOX.idFromName("guard"));
        const who = await sha(request.headers.get("CF-Connecting-IP") || "none");
        if (await guard.blocked(who)) return json({ error: "blocked" }, 429, origin);
        const text = await request.text();
        if (text.length > 4096) return json({ error: "too_big" }, 413, origin);
        let b; try { b = JSON.parse(text); } catch (e) { return json({ error: "bad_json" }, 400, origin); }
        if (!b || !ID.test(b.id || "") || !b.pub || typeof b.pub !== "object") return json({ error: "bad" }, 400, origin);
        const out = await box.owner(b);
        if (out.error) await guard.miss(who);
        return json(out, out.error ? 403 : 200, origin);
      }
    }
    if (url.pathname === "/pull" && request.method === "GET") {
      id = url.searchParams.get("id") || "";
    } else if ((url.pathname === "/push" || url.pathname === "/wipe") && request.method === "POST") {
      const text = await request.text();
      if (text.length > MAX_BODY) return json({ error: "too_big" }, 413, origin);
      try { body = JSON.parse(text); } catch (e) { return json({ error: "bad_json" }, 400, origin); }
      id = (body && body.id) || "";
    } else {
      return json({ ok: true, service: "hibiki-sync" }, 200, origin);
    }
    const guard = env.BOX.get(env.BOX.idFromName("guard"));
    const who = await sha(request.headers.get("CF-Connecting-IP") || "none");
    if (await guard.blocked(who)) return json({ error: "blocked" }, 429, origin);
    if (!ID.test(id)) { await guard.miss(who); return json({ error: "bad_id" }, 400, origin); }
    const box = env.BOX.get(env.BOX.idFromName(id));
    const out = await box.handle(url.pathname, body);
    if (url.pathname === "/pull" && out.keys && !Object.keys(out.keys).length) await guard.miss(who);
    return json(out, out.error ? 400 : 200, origin);
  },
};

export class SyncBox extends DurableObject {
  // "guard" の箱だけが使う：まちがいの回数（IP のハッシュごと）
  async blocked(who) {
    const r = await this.ctx.storage.get("g:" + who);
    return !!(r && r.until && r.until > Date.now());
  }
  async miss(who) {
    const now = Date.now(), k = "g:" + who;
    let r = (await this.ctx.storage.get(k)) || { n: 0, start: now };
    if (now - r.start > WINDOW) r = { n: 0, start: now };
    r.n++;
    if (r.n >= MISS_LIMIT) r.until = now + WINDOW;
    await this.ctx.storage.put(k, r);
    if (Math.random() < 0.05) this.sweep();
  }
  async sweep() {
    const all = await this.ctx.storage.list({ prefix: "g:" }), now = Date.now(), old = [];
    for (const [k, r] of all) if (now - r.start > 2 * WINDOW && !(r.until > now)) old.push(k);
    if (old.length) await this.ctx.storage.delete(old.slice(0, 128));
  }

  async owner(b) {
    const cur = await this.ctx.storage.get("owner");
    if (!b) return { pub: cur ? cur.pub : null };
    if (cur && cur.id !== b.id) return { error: "taken" };
    const pub = { kty: "EC", crv: "P-256", x: String(b.pub.x || ""), y: String(b.pub.y || "") };
    await this.ctx.storage.put("owner", { id: b.id, pub, at: Date.now() });
    return { pub };
  }
  async handle(path, body) {
    const keys = (await this.ctx.storage.get("keys")) || {};
    if (path === "/pull") return { keys };
    if (path === "/wipe") { await this.ctx.storage.deleteAll(); return { ok: true }; }
    const inc = body && body.keys;
    if (!inc || typeof inc !== "object") return { error: "bad_keys" };
    const now = Date.now() + 60 * 1000;
    for (const k of Object.keys(inc)) {
      const e = inc[k];
      if (!KEY.test(k) || !e || typeof e.v !== "string" || typeof e.t !== "number" || e.t > now) continue;
      if (!keys[k] || e.t > keys[k].t) keys[k] = { v: e.v, t: e.t };
    }
    if (Object.keys(keys).length > MAX_KEYS) return { error: "too_many" };
    await this.ctx.storage.put("keys", keys);
    return { keys };
  }
}

async function sha(s) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("hibiki-ip:" + s));
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED.includes(origin) ? origin : ALLOWED[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}
function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...cors(origin) } });
}
