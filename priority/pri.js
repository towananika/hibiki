// 「いま、これを」：優先の順番と、いまの達成を、この端末の記録から出す（2026-10-15）
// 順番の考え方：健康（土台）→ お金の見える化 → 守り（生活防衛資金）→ 次の住まい → 期限のある勉強 → 増やす → 楽しみ
(function () {
  function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function sum(a) { return (a || []).reduce(function (t, x) { return t + (+x.amt || 0); }, 0); }
  function ymd(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  var now = new Date();
  var H = jget("hibiki-health-v1", {}), t = H[ymd(now)] || {};
  var hn = ["sleep", "walk", "water", "veg", "enough"].filter(function (k) { return t[k]; }).length;
  var B = jget("hibiki-budget-v1", null), A = jget("hibiki-assets-v1", null);
  var inc = B ? sum(B.income) : 0, out = B ? sum(B.expense) : 0;
  var safe = A ? (A.items || []).filter(function (x) { return x.cat === "cash" || x.cat === "safe"; }).reduce(function (a, x) { return a + (x.shares > 0 ? Math.round(x.shares * (+x.price || 0)) : (+x.amt || 0)); }, 0) : 0;
  var months = out ? safe / out : 0;
  var daysLeft = Math.ceil((new Date("2026-12-13T23:59:59+09:00") - now) / 864e5);
  var dreams = jget("hibiki-dreams-v1", { items: [] }).items.length;
  var items = [
    { k: "sleep", t: "夜しっかり眠る", why: "体が元気でないと、ほかの全部が進まない。いちばんの土台。", href: "../health/", ok: !!t.sleep, st: t.sleep ? "今日はOK" : "今日はまだ", tier: "土台" },
    { k: "health", t: "毎日の健康、3つ以上", why: "寝る・歩く・水・野菜・腹八分のうち3つで合格。", href: "../health/", ok: hn >= 3, st: hn + " / 5", tier: "土台" },
    { k: "budget", t: "毎月の収入と費用を入れる", why: "見えないお金は増やせない。まず現状をつかむ。", href: "../money/budget.html", ok: inc > 0 && out > 0, st: inc > 0 && out > 0 ? "入力ずみ" : "まだ", tier: "お金の見える化" },
    { k: "runway", t: "生活防衛資金を3か月分", why: "仕事が止まっても暮らせれば、安心して選べる。", href: "../money/assets.html", ok: months >= 3, st: out ? (Math.round(months * 10) / 10) + "か月分" : "家計が先", tier: "守り" },
    { k: "house", t: "次の住まいの条件を決める", why: "家は毎晩いる場所。眠りと静かさにつながる。住まい代の上限を目安に。", href: "../money/budget.html", ok: false, st: "進行中", tier: "暮らし" },
    { k: "study", t: "形成評価の期限まで", why: "期限があるものは、決まった日までに進める。", href: "../study/", ok: false, st: daysLeft > 0 ? "あと" + daysLeft + "日" : "期限をすぎた", tier: "期限あり" },
    { k: "grow", t: "お金を育てる（投資）", why: "守りができてから。新しく手を広げず、いまの分を見守る。", href: "../money/assets.html", ok: false, st: "あとで", tier: "育てる" },
    { k: "dream", t: "夢日記・大切な人", why: "幸せの理由。急がないが、毎日少し。", href: "../dreams/", ok: false, st: dreams ? dreams + "個" : "0個", tier: "楽しみ" }
  ];
  var next = items.filter(function (x) { return !x.ok; })[0] || items[0];
  window.HBPRI = { items: items, next: next };
})();
