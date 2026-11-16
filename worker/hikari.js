// 光さがし（トライアスロン play/hikari）の記録置き場（2026-11-16）
// POST /hikari/sync { state } → { state }（まぜた後の全部）  POST /hikari/wipe → { ok }
// トライアスロンの Firebase ログインの札（Authorization: Bearer）が要る。uid ごとに1つの箱。
// 記録は本人だけが読める。管理者用の読み口は作らない（2026-11-16 ひびき：本人だけが見る）。
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const LIGHTS = ["move", "make", "care", "talk", "teach", "out", "learn", "sort", "idea"];
const KINDS = ["grow", "find", "rest"];
export const HIKARI_MAX_DAYS = 1500;

export function hikariClean(s, now = Date.now()) {
  const out = { v: 1, days: {}, tries: {} };
  if (!s || typeof s !== "object") return out;
  const limit = now + 24 * 3600 * 1000;
  for (const k of Object.keys(s.days || {}).slice(0, HIKARI_MAX_DAYS * 2)) {
    const d = s.days[k];
    if (!DAY.test(k) || !d || typeof d.t !== "number" || d.t > limit) continue;
    const a = {};
    for (const id of LIGHTS) { const r = d.a && d.a[id]; if (r && [1, 2, 3].includes(r.f)) a[id] = { f: r.f, s: !!r.s }; }
    out.days[k] = { t: d.t, a };
  }
  for (const k of Object.keys(s.tries || {}).slice(0, 400)) {
    const w = s.tries[k];
    if (!DAY.test(k) || !w || typeof w.t !== "number" || w.t > limit) continue;
    out.tries[k] = { t: w.t, done: (Array.isArray(w.done) ? w.done : []).filter((x) => KINDS.includes(x)) };
  }
  return out;
}

export function hikariMerge(a, b, now = Date.now()) {
  a = hikariClean(a, now); b = hikariClean(b, now);
  const out = { v: 1, days: {}, tries: {} };
  for (const part of ["days", "tries"]) {
    for (const k of new Set([...Object.keys(a[part]), ...Object.keys(b[part])])) {
      const x = a[part][k], y = b[part][k];
      out[part][k] = !x ? y : !y ? x : (y.t > x.t ? y : x);
    }
  }
  const days = Object.keys(out.days).sort();
  for (const k of days.slice(0, Math.max(0, days.length - HIKARI_MAX_DAYS))) delete out.days[k];
  return out;
}

// storage: Durable Object の storage と同じ形
export async function hikariHandle(storage, action, input = {}, now = Date.now()) {
  if (action === "wipe") { await storage.delete("hikari"); return { ok: true }; }
  if (action !== "sync") return { error: "bad" };
  const merged = hikariMerge(await storage.get("hikari"), input.state, now);
  await storage.put("hikari", merged);
  return { state: merged };
}
