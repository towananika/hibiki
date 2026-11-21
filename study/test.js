// 講のおわりの「確認テスト」（学校の小テストの形）。書き方は notes/README.md の「テスト」。
// ```test ブロックを HBTest.render(text) で HTML にし、HBTest.init(root) で順番をまぜる。
// 大問ごとに形をかえる：穴うめ（文の中に {{正解|×|×|×}}）・4択（問いの最後に {{…}}、空らんは出ない）／○×（行頭が ○ か ×）／組み合わせ（A = B）／並べかえ（A → B → C）。
// 重要度：行の頭に ★★★（必ず覚える）・★★（大事）・★（知っておく）。書かないと ★★。配点は重要度に比例し、合計がちょうど100点になるよう配る。
// 採点後は、まちがえた問題を重要度の高い順に「まず覚える」として正しい答えつきで出す。
// 合格は「合格:」の点（ふつう70点）以上。最高点は hibiki-study-test-v1 に残る。
(function () {
  var KEY = "hibiki-study-test-v1";
  var css = [
    ".test{border:2px solid var(--wood);border-radius:14px;padding:12px 14px 16px;margin:16px 0;background:var(--surface)}",
    ".test .th{display:flex;justify-content:space-between;align-items:baseline;gap:8px;border-bottom:2px solid var(--wood);padding-bottom:6px}",
    ".test .th b{color:var(--wood);font-size:calc(17px*var(--k,1))}",
    ".test .th small{color:var(--muted);font-size:calc(12px*var(--k,1));text-align:right}",
    ".test .how{color:var(--muted);font-size:calc(13px*var(--k,1));margin:6px 0 0}",
    ".test h4{margin:18px 0 4px;font-size:calc(15px*var(--k,1));color:var(--text);background:rgba(147,112,75,.12);border-radius:8px;padding:4px 10px}",
    ".test .it{margin:12px 0 16px;font-size:calc(16px*var(--k,1));line-height:1.9}",
    ".test .no{font-weight:700;color:var(--wood);margin-right:4px}",
    ".test .slot{display:inline-block;min-width:4.5em;padding:0 6px;border-bottom:2px solid var(--wood);color:var(--wood);font-weight:700;text-align:center}",
    ".test .opts{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}",
    ".test .opt{all:unset;cursor:pointer;box-sizing:border-box;padding:5px 12px;border:1px solid var(--border);border-radius:999px;background:var(--bg);font-size:calc(15px*var(--k,1));line-height:1.5}",
    ".test .opt.sel{border-color:var(--wood);background:rgba(147,112,75,.18);font-weight:700}",
    ".test .opt.right{border-color:var(--sage);background:rgba(116,136,109,.22)}.test .opt.wrong{border-color:var(--red);background:rgba(181,88,63,.14)}",
    ".test .opt:disabled{cursor:default}",
    ".test .tf .opt{min-width:3em;text-align:center;font-size:calc(18px*var(--k,1))}",
    ".test select{font:inherit;font-size:calc(15px*var(--k,1));color:var(--text);background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:4px 6px;max-width:100%;margin-top:4px}",
    ".test select.right{border-color:var(--sage);background:rgba(116,136,109,.22)}.test select.wrong{border-color:var(--red);background:rgba(181,88,63,.14)}",
    ".test .ans{display:flex;flex-wrap:wrap;gap:6px;min-height:36px;padding:6px;border:1px dashed var(--wood);border-radius:10px;margin-top:6px}",
    ".test .ans:empty::before{content:'下の言葉を、正しい順にさわる';color:var(--muted);font-size:calc(13px*var(--k,1))}",
    ".test .ans .opt::before{content:attr(data-i) '. ';color:var(--wood)}",
    ".test .mark{font-weight:700;margin-left:4px;font-size:calc(14px*var(--k,1))}.test .mark.ok{color:var(--sage)}.test .mark.ng{color:var(--red)}",
    ".test .fix{display:block;color:var(--red);font-size:calc(13px*var(--k,1));line-height:1.6}",
    ".test .go{all:unset;cursor:pointer;display:inline-block;padding:9px 20px;border-radius:10px;background:var(--wood);color:var(--surface);font-weight:700;margin-top:10px}",
    ".test .res{margin-top:12px;padding:12px;border-radius:12px;text-align:center;border:2px solid var(--border)}",
    ".test .res.pass{border-color:var(--sage)}.test .res.fail{border-color:var(--red)}",
    ".test .res strong{display:block;font-size:calc(30px*var(--k,1));background:none;box-shadow:none;padding:0}",
    ".test .res .stamp{display:inline-block;margin:4px 0;padding:2px 14px;border-radius:999px;font-weight:700;color:var(--surface)}",
    ".test .res.pass .stamp{background:var(--sage)}.test .res.fail .stamp{background:var(--red)}",
    ".test .res p{margin:6px 0 0;font-size:calc(14px*var(--k,1))}",
    ".test .imp{font-size:calc(12px*var(--k,1));letter-spacing:-1px;margin-right:4px;color:var(--muted)}.test .imp.i3{color:var(--red)}.test .imp.i2{color:var(--wood)}",
    ".test .pt{font-size:calc(11px*var(--k,1));color:var(--muted);border:1px solid var(--border);border-radius:6px;padding:0 4px;margin-right:6px;vertical-align:2px}",
    ".test .legend{font-size:calc(12px*var(--k,1));color:var(--muted);margin:4px 0 0}",
    ".test .review{text-align:left;margin-top:10px}.test .review b{display:block;margin-top:8px;font-size:calc(14px*var(--k,1))}",
    ".test .review ul{margin:4px 0 0;padding-left:1.2em}.test .review li{font-size:calc(14px*var(--k,1));line-height:1.7;margin:2px 0}",
    ".test [hidden]{display:none!important}"
  ].join("");
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function mix(box) { for (var i = box.children.length; i > 1; i--) box.appendChild(box.children[Math.floor(Math.random() * i)]); }
  function chips(list) { return list.map(function (x) { return '<button type="button" class="opt">' + esc(x) + '</button>'; }).join(""); }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  function lec() { return new URLSearchParams(location.search).get("n") || "?"; }

  var STARS = ["", "★", "★★", "★★★"], TIER = ["", "知っておく", "大事", "必ず覚える"];
  // 重みに比例して、合計100点になるよう配る（あまりは端数の大きい順に1点ずつ）
  function points(ws) {
    var sum = ws.reduce(function (a, b) { return a + b; }, 0) || 1, raw = ws.map(function (w) { return w * 100 / sum; }),
      p = raw.map(Math.floor), left = 100 - p.reduce(function (a, b) { return a + b; }, 0);
    raw.map(function (r, i) { return [r - p[i], i]; }).sort(function (a, b) { return b[0] - a[0]; }).slice(0, left).forEach(function (x) { p[x[1]]++; });
    return p;
  }

  function render(t) {
    var pass = 70, secs = [], cur = null, no = 0, all = [];
    t.trim().split("\n").forEach(function (l) {
      l = l.trim(); if (!l) return;
      var m = l.match(/^合格[:：]\s*(\d+)/); if (m) { pass = +m[1]; return; }
      if (/^##\s/.test(l)) { cur = { title: l.replace(/^##\s*/, ""), items: [] }; secs.push(cur); return; }
      if (!cur) { cur = { title: "", items: [] }; secs.push(cur); }
      var w = 2, sm = l.match(/^(★{1,3})\s*/); if (sm) { w = sm[1].length; l = l.slice(sm[0].length); }
      // 形を見分ける：{{ }} があれば選ぶ問題（選択肢の中の → や = に引っぱられない）
      var it = { l: l, w: w, k: /^[○×〇✕]/.test(l) ? "tf" : /\{\{.+?\}\}/.test(l) ? "pick" : / = /.test(l) ? "match" : / → /.test(l) ? "order" : "pick" };
      cur.items.push(it); all.push(it);
    });
    var pts = points(all.map(function (x) { return x.w; }));
    all.forEach(function (x, i) { x.p = pts[i]; });
    var html = secs.map(function (s, si) {
      var h = s.title ? '<h4>' + "一二三四五六七八九十".charAt(si) + "　" + esc(s.title) + '</h4>' : "";
      var rights = s.items.filter(function (x) { return x.k === "match"; }).map(function (x) { return x.l.split(" = ")[1].trim(); });
      return h + s.items.map(function (x) {
        no++; var l = x.l, attr = ' data-w="' + x.w + '" data-p="' + x.p + '"',
          n = '<span class="no">(' + no + ')</span><span class="imp i' + x.w + '" title="' + TIER[x.w] + '">' + STARS[x.w] + '</span><span class="pt">' + x.p + '点</span>';
        if (x.k === "tf") { var tf = l.match(/^([○×〇✕])\s*(.+)$/), a = /[○〇]/.test(tf[1]) ? "○" : "×";
          return '<div class="it tf" data-k="tf" data-a="' + a + '" data-q="' + esc(tf[2]) + '"' + attr + '>' + n + esc(tf[2]) + '<span class="mark"></span><div class="opts">' + chips(["○", "×"]) + '</div></div>'; }
        if (x.k === "match") { var p = l.split(" = ");
          return '<div class="it" data-k="match" data-a="' + esc(p[1].trim()) + '" data-q="' + esc(p[0].trim()) + '"' + attr + '>' + n + '<b>' + esc(p[0].trim()) + '</b><span class="mark"></span><br><select><option value="">えらぶ…</option>' + rights.map(function (r) { return '<option>' + esc(r) + '</option>'; }).join("") + '</select></div>'; }
        if (x.k === "order") { var seq = l.split(" → ").map(function (y) { return y.trim(); });
          return '<div class="it" data-k="order" data-a="' + esc(seq.join("→")) + '" data-q=""' + attr + '>' + n + '正しい順にならべる<span class="mark"></span><div class="ans"></div><div class="opts pool">' + chips(seq) + '</div></div>'; }
        var o = [], tail = /\}\}[。]?$/.test(l), q = esc(l).replace(/\{\{(.+?)\}\}([。]?)/, function (_, a, dot) { o = a.split("|"); return tail ? dot : '<span class="slot">？</span>'; });
        var full = esc(l).replace(/\{\{(.+?)\}\}/, function (_, a) { return tail ? " → " + a.split("|")[0] : "【" + a.split("|")[0] + "】"; });
        return '<div class="it" data-k="pick" data-a="' + o[0] + '" data-q="' + full + '"' + attr + '>' + n + q + '<span class="mark"></span><div class="opts">' + o.map(function (y) { return '<button type="button" class="opt">' + y + '</button>'; }).join("") + '</div></div>';
      }).join("");
    }).join("");
    return '<div class="test" data-pass="' + pass + '"><div class="th"><b>確認テスト</b><small>100点満点・' + pass + '点で合格<br><span class="best"></span></small></div><p class="how">本文を閉じて、全部答えてから「採点する」。</p>' +
      '<p class="legend"><span class="imp i3">★★★</span>必ず覚える　<span class="imp i2">★★</span>大事　<span class="imp i1">★</span>知っておく（大事なものほど点が高い）</p>' + html +
      '<button type="button" class="go">採点する</button><div class="res" hidden></div></div>';
  }

  function prep(box) {
    box.querySelectorAll(".it").forEach(function (it) {
      var k = it.dataset.k;
      if (k === "pick" || k === "order") mix(it.querySelector(".opts"));
      if (k === "match") { var s = it.querySelector("select"), first = s.options[0]; s.removeChild(first); mix(s); s.insertBefore(first, s.firstChild); s.selectedIndex = 0; }
    });
    var b = load()[lec()]; box.querySelector(".best").textContent = b ? "これまでの最高 " + b.best + "点" : "";
  }
  function init(root) { root.querySelectorAll(".test").forEach(prep); }

  function answer(it) {
    var k = it.dataset.k;
    if (k === "match") return it.querySelector("select").value;
    if (k === "order") return [].map.call(it.querySelectorAll(".ans .opt"), function (x) { return x.textContent; }).join("→");
    var s = it.querySelector(".opt.sel"); return s ? s.textContent : "";
  }

  // まちがえた問題の「正しい形」を1行で
  function fixText(it) {
    var k = it.dataset.k, a = it.dataset.a, q = it.dataset.q;
    if (k === "tf") return q + " → " + a;
    if (k === "match") return q + " ＝ " + a;
    if (k === "order") return a.replace(/→/g, " → ");
    return q;
  }

  function grade(box) {
    var its = box.querySelectorAll(".it"), ok = 0, got = 0, miss = { 1: [], 2: [], 3: [] }, top = [0, 0];
    its.forEach(function (it, i) {
      var k = it.dataset.k, a = answer(it), good = a !== "" && a === it.dataset.a, m = it.querySelector(".mark"), w = +it.dataset.w || 2;
      if (good) { ok++; got += +it.dataset.p || 0; } else miss[w].push("(" + (i + 1) + ") " + esc(fixText(it)));
      if (w === 3) { top[1]++; if (good) top[0]++; }
      it.querySelectorAll(".opt").forEach(function (x) { x.disabled = true; if (k !== "order") { if (x.textContent === it.dataset.a) x.classList.add("right"); else if (x.classList.contains("sel")) x.classList.add("wrong"); } });
      if (k === "match") { var s = it.querySelector("select"); s.disabled = true; s.className = good ? "right" : "wrong"; }
      m.className = "mark " + (good ? "ok" : "ng"); m.textContent = good ? "○" : a ? "✕" : "✕（答えていない）";
      if (!good && (k === "match" || k === "order")) { var f = document.createElement("span"); f.className = "fix"; f.textContent = "正しくは：" + it.dataset.a.replace(/→/g, " → "); it.appendChild(f); }
    });
    var score = got, pass = +box.dataset.pass, okp = score >= pass, d = load(), id = lec(), prev = d[id];
    d[id] = { best: Math.max(score, prev ? prev.best : 0), last: score, passed: okp || !!(prev && prev.passed), at: new Date().toISOString().slice(0, 10) }; save(d);
    var rv = "";
    [3, 2, 1].forEach(function (w) {
      if (!miss[w].length) return;
      rv += '<b><span class="imp i' + w + '">' + STARS[w] + '</span>' + (w === 3 ? "まず覚える（" + TIER[w] + "）" : w === 2 ? "次に覚える（" + TIER[w] + "）" : "余裕があれば（" + TIER[w] + "）") + '</b><ul>' +
        miss[w].map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>";
    });
    var r = box.querySelector(".res"); r.hidden = false; r.className = "res " + (okp ? "pass" : "fail");
    r.innerHTML = '<strong>' + score + '点</strong><span class="stamp">' + (okp ? "合格" : "もう少し") + '</span><p>' + its.length + "問中 " + ok + "問 正解（合格は" + pass + "点）</p>" +
      (top[1] ? "<p>★★★（必ず覚える）は " + top[1] + "問中 " + top[0] + "問 正解" + (top[0] === top[1] ? "。いちばん大事なところは押さえられた。" : "") + "</p>" : "") +
      "<p>" + (okp ? (score === 100 ? "満点です。" : "下の問題だけ、★の多い順に見直そう。") + "明日もう一度ためすと、記憶に残りやすい。" : "下の問題を★の多い順に読み直してから、もう一度。") + "</p>" +
      (rv ? '<div class="review">' + rv + "</div>" : "");
    box.querySelector(".best").textContent = "これまでの最高 " + d[id].best + "点";
    var go = box.querySelector(".go"); go.textContent = "もう一度"; box.dataset.done = 1;
  }

  function reset(box) {
    box.querySelectorAll(".it").forEach(function (it) {
      var k = it.dataset.k, m = it.querySelector(".mark"); m.textContent = ""; m.className = "mark";
      var f = it.querySelector(".fix"); if (f) f.remove();
      if (k === "order") { var pool = it.querySelector(".pool"); [].slice.call(it.querySelectorAll(".ans .opt")).forEach(function (x) { pool.appendChild(x); }); }
      it.querySelectorAll(".opt").forEach(function (x) { x.disabled = false; x.className = "opt"; x.removeAttribute("data-i"); });
      var s = it.querySelector("select"); if (s) { s.disabled = false; s.className = ""; }
      var sl = it.querySelector(".slot"); if (sl) sl.textContent = "？";
    });
    prep(box); delete box.dataset.done; box.querySelector(".res").hidden = true; box.querySelector(".go").textContent = "採点する"; box.scrollIntoView({ block: "start" });
  }

  document.addEventListener("click", function (e) {
    var b = e.target.closest(".test button"); if (!b || b.disabled) return;
    var box = b.closest(".test");
    if (b.classList.contains("go")) { box.dataset.done ? reset(box) : grade(box); return; }
    var it = b.closest(".it"), k = it.dataset.k;
    if (k === "order") {
      var ans = it.querySelector(".ans"), pool = it.querySelector(".pool");
      (b.parentNode === pool ? ans : pool).appendChild(b);
      [].forEach.call(ans.children, function (x, i) { x.setAttribute("data-i", i + 1); });
      [].forEach.call(pool.children, function (x) { x.removeAttribute("data-i"); });
      return;
    }
    it.querySelectorAll(".opt").forEach(function (x) { x.classList.toggle("sel", x === b); });
    var sl = it.querySelector(".slot"); if (sl) sl.textContent = b.textContent;
  });

  window.HBTest = { render: render, init: init };
})();
