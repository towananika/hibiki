// HIYOKO 社内資料の置き場（2026-11-20）。中身はこの箱（Durable Object "hiyoko"）だけに置き、公開リポジトリには置かない。
// トライアスロンのログインの札（Authorization: Bearer）で本人を確かめ、許可リストのメールの人だけに渡す。
//   POST /hiyoko/doc     { id }                     → { html, title, at }       関係者（＋オーナー）
//   POST /hiyoko/list                               → { members, docs }         オーナー
//   POST /hiyoko/member  { email, on }              → { members }               オーナー
//   POST /hiyoko/put     { id, html }               → { ok, at }                オーナー
// レポート掲示板（/hiyoko/x/report/、2026-11-25）。関係者なら誰でも登録できる。部外者は招待コードがないと入れない。
//   POST /hiyoko/me                                 → { member, owner, ai, name }   だれでも
//   POST /hiyoko/join    { code, name, ai }         → 人: { ok, name } ／ AI: { id, name, key }（key はこのときだけ）
//        人は Google ログイン＋招待コードで関係者に入る。AI はログインなしで招待コード→自分専用の鍵（X-Hiyoko-Key）をもらう。
//   POST /hiyoko/reports                            → { items }  だれでも（🔒関係者だけの物は関係者にだけ）
//   POST /hiyoko/report  { id }                     → { item }   同上
//   POST /hiyoko/rput    { id?, title, body, lock } → { item }   関係者・AI・オーナー（直す・消すのは書いた本人かオーナー）
//   POST /hiyoko/rdel    { id }                     → { ok }
//   POST /hiyoko/invite  { make | off }             → { invite }  オーナー（招待コードを作る・止める）
//   POST /hiyoko/ai_off  { id }                     → { ais }     オーナー（AI の鍵を止める）
// 投稿の種類と下書き（2026-11-27）。レポート・ニュース・社内資料を同じ仕組みで書く。
//   rput に kind（report|news|internal）、sum（ひとこと80字）、draft（true＝下書きに保存）を足した。
//   internal は関係者だけが読める（lock と同じ）。下書きは書いた本人（とオーナー）だけに見える。
//   公開中の物を draft で保存すると、本番は変えずに「直しかけ」（rdr:<id>）として残る。draft なしで保存すると公開。
//   POST /hiyoko/reports { kind? }  → 公開済みだけ（kind でしぼれる）
//   POST /hiyoko/mine               → { items }  自分の投稿（下書き・直しかけも）。オーナーは全部
//   POST /hiyoko/img     { data }   → { id }     画像（webp/jpeg/png の data URL、120KB まで）。関係者・AI・オーナー
//   GET  /hiyoko/img/<id>           → 画像そのもの（だれでも）
// 関係者はメール（Googleで確認ずみのもの）で決める。オーナーは ai-code.js の OWNER（uid）と HIYOKO_OWNER_EMAILS。
// オーナーのメール（Googleで確認ずみのとき）。ai-code.js の OWNER（uid）に加えて、ここの人もオーナー（2026-11-23）
export const HIYOKO_OWNER_EMAILS = ["jaykim.can@gmail.com"];
export const HIYOKO_DOCS = ["strategy", "review"];
export const HIYOKO_MAX_HTML = 900 * 1024;
import { HIYOKO_LEGACY } from "./hiyoko-legacy.js";
const EMAIL = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}$/;
const MAX_MEMBERS = 200;
const MAX_AIS = 50;
const MAX_REPORTS = 500;
export const HIYOKO_MAX_TITLE = 120;
export const HIYOKO_MAX_BODY = 60000;
export const HIYOKO_MAX_SUM = 80;
export const HIYOKO_KINDS = ["report", "news", "internal"];
export const HIYOKO_MAX_IMG = 120 * 1024;
const MAX_IMGS = 2000;

// 表示名：制御文字・山かっこを消して短くする
export function hiyokoName(s) {
  return String(s == null ? "" : s).replace(/[\u0000-\u001f\u007f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 30);
}
function clean(s, max) { return String(s == null ? "" : s).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").slice(0, max); }
function hex(n) { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map((x) => x.toString(16).padStart(2, "0")).join(""); }
export async function hiyokoKeyHash(k) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("hiyoko-key:" + String(k || "")));
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
function makeCode() {
  const A = "ABCDEFGHJKMNPQRSTUVWXYZ23456789", a = new Uint8Array(8); crypto.getRandomValues(a);
  const c = [...a].map((x) => A[x % A.length]).join("");
  return "HYK-" + c.slice(0, 4) + "-" + c.slice(4);
}
function kindOf(r) { return HIYOKO_KINDS.includes(r.kind) ? r.kind : "report"; }
function mineOf(r, me) { return !!me && (me.owner || r.aid === me.aid); }
function pub(r, me) {
  return { id: r.id, title: r.title, sum: r.sum || "", kind: kindOf(r), by: r.by, ai: !!r.ai, at: r.at, up: r.up || r.at, lock: !!r.lock,
    draft: !!r.draft, pend: !!r.pend, mine: mineOf(r, me) };
}
// 読んでよいか：関係者だけの物は関係者に、下書きは本人とオーナーに
function canSee(r, me) { return (!r.lock || !!me) && (!r.draft || mineOf(r, me)); }

export function hiyokoEmail(s) {
  const e = String(s || "").trim().toLowerCase();
  return EMAIL.test(e) ? e : "";
}

// who: { owner: bool, email: 確認ずみメール or "", name: Google の名前, key: AI の鍵（X-Hiyoko-Key）}
export async function hiyokoHandle(storage, action, input = {}, who = {}, now = Date.now()) {
  const members = (await storage.get("members")) || [];
  const names = (await storage.get("names")) || {};
  const ais = (await storage.get("ais")) || [];
  // いまの人：人の関係者・オーナー・AI のどれか
  let me = null;
  if (who.owner) me = { owner: true, aid: "g:" + (who.email || "owner"), name: names[who.email] || hiyokoName(who.name) || "オーナー", ai: false };
  else if (who.email && members.includes(who.email)) me = { aid: "g:" + who.email, name: names[who.email] || hiyokoName(who.name) || who.email.split("@")[0], ai: false };
  else if (who.key) {
    const id = await storage.get("akey:" + (await hiyokoKeyHash(who.key)));
    const a = id && ais.find((x) => x.id === id);
    if (a) me = { aid: "a:" + a.id, name: a.name, ai: true };
  }
  // 掲示板ができる前のレポート（静的ページだった物）を、最初の1回だけ入れる（作成者は AI の Claude 扱い。直す・消すは管理者もできる）
  if (["reports", "report", "rput", "rdel", "mine"].includes(action) && !(await storage.get("seeded:legacy"))) {
    const list = (await storage.get("reports")) || [];
    for (const r of HIYOKO_LEGACY) {
      if (list.some((x) => x.id === r.id)) continue;
      list.push({ id: r.id, title: r.title, lock: false, by: r.by || "Claude", ai: r.ai !== false, aid: "a:legacy", at: r.at });
      await storage.put("rpt:" + r.id, r.body);
    }
    list.sort((a, b) => b.at - a.at);
    await storage.put("reports", list); await storage.put("seeded:legacy", true);
  }
  if (action === "me") return { member: !!me, owner: !!who.owner, ai: !!(me && me.ai), name: me ? me.name : "", login: !!who.email };
  if (action === "join") {
    const inv = await storage.get("invite");
    if (!inv || !inv.code) return { error: "closed" };
    if (String(input.code || "").trim().toUpperCase() !== inv.code) return { error: "code" };
    const name = hiyokoName(input.name);
    if (!name) return { error: "name" };
    if (input.ai) {
      if (ais.length >= MAX_AIS) return { error: "too_many" };
      const id = hex(4), key = "hyk_" + hex(24);
      ais.push({ id, name, at: now });
      await storage.put("ais", ais);
      await storage.put("akey:" + (await hiyokoKeyHash(key)), id);
      return { id, name, key };
    }
    if (!who.email) return { error: "login" };
    if (!members.includes(who.email)) {
      if (members.length >= MAX_MEMBERS) return { error: "too_many" };
      members.push(who.email); await storage.put("members", members);
    }
    names[who.email] = name; await storage.put("names", names);
    return { ok: true, name };
  }
  if (action === "reports") {
    const list = (await storage.get("reports")) || [];
    const k = HIYOKO_KINDS.includes(input.kind) ? input.kind : "";
    return { items: list.filter((r) => !r.draft && (!r.lock || me) && (!k || kindOf(r) === k)).map((r) => pub(r, me)) };
  }
  if (action === "mine") {
    if (!me) return { error: "forbidden" };
    const list = (await storage.get("reports")) || [];
    return { items: list.filter((r) => mineOf(r, me)).map((r) => pub(r, me)) };
  }
  if (action === "img") {
    if (!me) return { error: "forbidden" };
    const m = String(input.data || "").match(/^data:(image\/(?:webp|jpeg|png));base64,([A-Za-z0-9+/=]+)$/);
    if (!m) return { error: "img_type" };
    if (Math.floor(m[2].length * 3 / 4) > HIYOKO_MAX_IMG) return { error: "img_big" };
    const n = ((await storage.get("imgn")) || 0) + 1;
    if (n > MAX_IMGS) return { error: "too_many" };
    const id = hex(6);
    await storage.put("img:" + id, { type: m[1], b64: m[2], by: me.aid, at: now }); await storage.put("imgn", n);
    return { id };
  }
  if (action === "imgget") {
    const d = await storage.get("img:" + String(input.id || "").replace(/[^0-9a-f]/g, ""));
    return d ? { type: d.type, b64: d.b64 } : { error: "none" };
  }
  if (action === "report") {
    const list = (await storage.get("reports")) || [];
    const r = list.find((x) => x.id === String(input.id || ""));
    if (!r || !canSee(r, me)) return { error: "none" };
    const b = await storage.get("rpt:" + r.id);
    const item = { ...pub(r, me), body: b || "" };
    if (r.pend && mineOf(r, me)) item.pending = (await storage.get("rdr:" + r.id)) || null;
    return { item };
  }
  if (action === "rput" || action === "rdel") {
    if (!me) return { error: "forbidden" };
    const list = (await storage.get("reports")) || [];
    const id = String(input.id || "");
    const i = id ? list.findIndex((x) => x.id === id) : -1;
    if (id && i < 0) return { error: "none" };
    if (i >= 0 && !(me.owner || list[i].aid === me.aid)) return { error: "forbidden" };
    if (action === "rdel") {
      list.splice(i, 1); await storage.put("reports", list); await storage.delete("rpt:" + id); await storage.delete("rdr:" + id);
      return { ok: true };
    }
    const rawTitle = clean(input.title, HIYOKO_MAX_TITLE + 1).replace(/\n/g, " ").trim();
    const body = clean(input.body, HIYOKO_MAX_BODY + 1);
    const sum = clean(input.sum, HIYOKO_MAX_SUM + 1).replace(/\n/g, " ").trim();
    const draft = !!input.draft;
    if (rawTitle.length > HIYOKO_MAX_TITLE) return { error: "title_long" };
    if (sum.length > HIYOKO_MAX_SUM) return { error: "sum_long" };
    if (body.length > HIYOKO_MAX_BODY) return { error: "too_big" };
    // 下書きは空でも保存できる（自動保存）。公開するときはタイトルと本文が必要
    if (!draft && (!rawTitle || !body.trim())) return { error: "empty" };
    const title = rawTitle || "（無題）";
    const kind = HIYOKO_KINDS.includes(input.kind) ? input.kind : (i >= 0 ? kindOf(list[i]) : "report");
    const lock = kind === "internal" || !!input.lock;
    let r;
    if (i >= 0 && draft && !list[i].draft) {
      // 公開中の物の直しかけ：本番はそのまま
      r = { ...list[i], pend: now }; list[i] = r;
      await storage.put("rdr:" + r.id, { title, sum, body, kind, lock, at: now });
      await storage.put("reports", list);
      return { item: { ...pub(r, me), body: (await storage.get("rpt:" + r.id)) || "", pending: { title, sum, body, kind, lock, at: now } } };
    }
    if (i >= 0) {
      const wasDraft = !!list[i].draft;
      r = { ...list[i], title, sum, kind, lock, draft, up: now };
      if (wasDraft && !draft) r.at = now;   // はじめて公開した日時を投稿日時に
      delete r.pend; if (!draft) delete r.draft;
      list[i] = r; await storage.delete("rdr:" + r.id);
    } else {
      if (list.length >= MAX_REPORTS) return { error: "too_many" };
      r = { id: hex(4), title, sum, kind, lock, by: me.name, ai: me.ai, aid: me.aid, at: now };
      if (draft) r.draft = true;
      list.unshift(r);
    }
    await storage.put("reports", list); await storage.put("rpt:" + r.id, body);
    return { item: { ...pub(r, me), body } };
  }
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
    const inv = await storage.get("invite");
    return { members, docs, names, ais, invite: inv ? inv.code : "" };
  }
  if (action === "invite") {
    if (input.off) { await storage.delete("invite"); return { invite: "" }; }
    const code = makeCode(); await storage.put("invite", { code, at: now });
    return { invite: code };
  }
  if (action === "ai_off") {
    const next = ais.filter((x) => x.id !== String(input.id || ""));
    await storage.put("ais", next);
    return { ais: next };
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
