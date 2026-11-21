// HIYOKO 社内資料の置き場（2026-11-20）。中身はこの箱（Durable Object "hiyoko"）だけに置き、公開リポジトリには置かない。
// トライアスロンのログインの札（Authorization: Bearer）で本人を確かめ、許可リストのメールの人だけに渡す。
//   POST /hiyoko/doc     { id }                     → { html, title, at }       関係者（＋オーナー）
//   POST /hiyoko/list                               → { members, docs }         オーナー
//   POST /hiyoko/member  { email, on }              → { members }               オーナー
//   POST /hiyoko/put     { id, html }               → { ok, at }                オーナー
// 関係者はメール（Googleで確認ずみのもの）で決める。オーナーは ai-code.js の OWNER（uid）。
export const HIYOKO_DOCS = ["strategy", "review"];
export const HIYOKO_MAX_HTML = 900 * 1024;
const EMAIL = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}$/;
const MAX_MEMBERS = 200;

export function hiyokoEmail(s) {
  const e = String(s || "").trim().toLowerCase();
  return EMAIL.test(e) ? e : "";
}

// who: { owner: bool, email: 確認ずみメール or "" }
export async function hiyokoHandle(storage, action, input = {}, who = {}, now = Date.now()) {
  const members = (await storage.get("members")) || [];
  if (action === "doc") {
    const id = String(input.id || "");
    if (!HIYOKO_DOCS.includes(id)) return { error: "bad" };
    if (!who.owner && !(who.email && members.includes(who.email))) return { error: "forbidden" };
    const d = await storage.get("doc:" + id);
    return d ? { html: d.html, title: d.title, at: d.at } : { error: "none" };
  }
  if (!who.owner) return { error: "forbidden" };
  if (action === "list") {
    const docs = {};
    for (const id of HIYOKO_DOCS) { const d = await storage.get("doc:" + id); docs[id] = d ? { title: d.title, at: d.at, size: d.html.length } : null; }
    return { members, docs };
  }
  if (action === "member") {
    const e = hiyokoEmail(input.email);
    if (!e) return { error: "bad_email" };
    let next = members.filter((x) => x !== e);
    if (input.on) next.push(e);
    if (next.length > MAX_MEMBERS) return { error: "too_many" };
    await storage.put("members", next);
    return { members: next };
  }
  if (action === "put") {
    const id = String(input.id || ""), html = input.html;
    if (!HIYOKO_DOCS.includes(id) || typeof html !== "string" || !html) return { error: "bad" };
    if (html.length > HIYOKO_MAX_HTML) return { error: "too_big" };
    const m = html.match(/<title>([^<]{0,200})<\/title>/i);
    await storage.put("doc:" + id, { html, title: m ? m[1] : id, at: now });
    return { ok: true, at: now };
  }
  return { error: "bad" };
}

// ── 閲覧数（2026-11-20）。ページのパスと日付ごとの回数だけを数える。IP・端末・だれかは持たない。
//   POST /hiyoko/hit   { path }   → { ok }        だれでも（towananika.github.io から）
//   POST /hiyoko/stats { days }   → { days: { "YYYY-MM-DD": { path: 回数 } } }   オーナー
const PATH = /^\/hiyoko\/(?:[a-z0-9-]{1,40}\/){0,3}$/;
export const HIYOKO_KEEP_DAYS = 400;
const MAX_PATHS_PER_DAY = 200;
export function hiyokoPath(p) {
  let s = String(p || "").split(/[?#]/)[0].toLowerCase();
  if (s.endsWith("/index.html")) s = s.slice(0, -10);
  if (!s.endsWith("/")) s += "/";
  return PATH.test(s) ? s : "";
}
export function hiyokoDay(now) { return new Date(now + 9 * 3600 * 1000).toISOString().slice(0, 10); } // 韓国・日本時間の日付

export async function hiyokoHit(storage, input = {}, now = Date.now()) {
  const path = hiyokoPath(input.path);
  if (!path) return { error: "bad" };
  const day = hiyokoDay(now), key = "hit:" + day;
  const counts = (await storage.get(key)) || {};
  if (!counts[path] && Object.keys(counts).length >= MAX_PATHS_PER_DAY) return { error: "full" };
  counts[path] = (counts[path] || 0) + 1;
  await storage.put(key, counts);
  if (Math.random() < 0.01) {
    const old = hiyokoDay(now - HIYOKO_KEEP_DAYS * 86400000);
    const all = await storage.list({ prefix: "hit:", end: "hit:" + old });
    if (all.size) await storage.delete([...all.keys()].slice(0, 128));
  }
  return { ok: true };
}

export async function hiyokoStats(storage, input = {}, who = {}, now = Date.now()) {
  if (!who.owner) return { error: "forbidden" };
  const n = Math.min(Math.max(parseInt(input.days, 10) || 30, 1), 365);
  const from = hiyokoDay(now - (n - 1) * 86400000);
  const all = await storage.list({ prefix: "hit:", start: "hit:" + from });
  const days = {};
  for (const [k, v] of all) days[k.slice(4)] = v;
  return { days, from, to: hiyokoDay(now) };
}
