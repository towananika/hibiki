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
