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

import { DurableObject } from "cloudflare:workers";

const ALLOWED = ["https://towananika.github.io", "http://localhost:8899", "http://127.0.0.1:8899"];
const MAX_BODY = 512 * 1024;
const MAX_KEYS = 60;
const ID = /^[0-9a-f]{64}$/;
const KEY = /^hibiki-[a-z0-9-]{1,40}$/;

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { headers: cors(origin) });
    const url = new URL(request.url);
    let id = "", body = null;
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
    if (!ID.test(id)) return json({ error: "bad_id" }, 400, origin);
    const box = env.BOX.get(env.BOX.idFromName(id));
    const out = await box.handle(url.pathname, body);
    return json(out, out.error ? 400 : 200, origin);
  },
};

export class SyncBox extends DurableObject {
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
