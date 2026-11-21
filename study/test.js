// 講のおわりの「確認テスト」（学校の小テストの形）。書き方は notes/README.md の「テスト」。
// ```test ブロックを HBTest.render(text) で HTML にし、HBTest.init(root) で順番をまぜる。
// 大問ごとに形をかえる：穴うめ（文の中に {{正解|×|×|×}}）・4択（問いの最後に {{…}}、空らんは出ない）／○×（行頭が ○ か ×）／組み合わせ（A = B）／並べかえ（A → B → C）。
// 1問1点、100点に直して「合格:」の点（ふつう70点）以上で合格。最高点は hibiki-study-test-v1 に残る。
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
    ".test [hidden]{display:none!important}"
  ].join("");
  var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function mix(box) { for (var i = box.children.length; i > 1; i--) box.appendChild(box.children[Math.floor(Math.random() * i)]); }
  function chips(list) { return list.map(function (x) { return '<button type="button" class="opt">' + esc(x) + '</button>'; }).join(""); }
  function load() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  function lec() { return new URLSearchParams(location.search).get("n") || "?"; }

  function render(t) {
    var pass = 70, secs = [], cur = null, no = 0;
    t.trim().split("\n").forEach(function (l) {
      l = l.trim(); if (!l) return;
      var m = l.match(/^合格[:：]\s*(\d+)/); if (m) { pass = +m[1]; return; }
      if (/^##\s/.test(l)) { cur = { title: l.replace(/^##\s*/, ""), items: [] }; secs.push(cur); return; }
      if (!cur) { cur = { title: "", items: [] }; secs.push(cur); }
      cur.items.push(l);
    });
    var html = secs.map(function (s, si) {
      var h = s.title ? '<h4>' + "一二三四五六七八九十".charAt(si) + "　" + esc(s.title) + '</h4>' : "";
      var rights = s.items.filter(function (l) { return / = /.test(l); }).map(function (l) { return l.split(" = ")[1].trim(); });
      return h + s.items.map(function (l) {
        no++; var n = '<span class="no">(' + no + ')</span>';
        var tf = l.match(/^([○×〇✕])\s*(.+)$/);
        if (tf) { var a = /[○〇]/.test(tf[1]) ? "○" : "×";
          return '<div class="it tf" data-k="tf" data-a="' + a + '">' + n + esc(tf[2]) + '<span class="mark"></span><div class="opts">' + chips(["○", "×"]) + '</div></div>'; }
        if (/ = /.test(l)) { var p = l.split(" = ");
          return '<div class="it" data-k="match" data-a="' + esc(p[1].trim()) + '">' + n + '<b>' + esc(p[0].trim()) + '</b><span class="mark"></span><br><select><option value="">えらぶ…</option>' + rights.map(function (r) { return '<option>' + esc(r) + '</option>'; }).join("") + '</select></div>'; }
        if (/ → /.test(l)) { var seq = l.split(" → ").map(function (x) { return x.trim(); });
          return '<div class="it" data-k="order" data-a="' + esc(seq.join("→")) + '">' + n + '正しい順にならべる<span class="mark"></span><div class="ans"></div><div class="opts pool">' + chips(seq) + '</div></div>'; }
        var o = [], tail = /\}\}[。]?$/.test(l), q = esc(l).replace(/\{\{(.+?)\}\}[。]?/, function (_, a) { o = a.split("|"); return tail ? "" : '<span class="slot">？</span>'; });
        return '<div class="it" data-k="pick" data-a="' + o[0] + '">' + n + q + '<span class="mark"></span><div class="opts">' + o.map(function (x) { return '<button type="button" class="opt">' + x + '</button>'; }).join("") + '</div></div>';
      }).join("");
    }).join("");
    return '<div class="test" data-pass="' + pass + '"><div class="th"><b>確認テスト</b><small>100点満点・' + pass + '点で合格<br><span class="best"></span></small></div><p class="how">本文を閉じて、全部答えてから「採点する」。</p>' + html +
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

  function grade(box) {
    var its = box.querySelectorAll(".it"), ok = 0;
    its.forEach(function (it) {
      var k = it.dataset.k, a = answer(it), good = a !== "" && a === it.dataset.a, m = it.querySelector(".mark");
      if (good) ok++;
      it.querySelectorAll(".opt").forEach(function (x) { x.disabled = true; if (k !== "order") { if (x.textContent === it.dataset.a) x.classList.add("right"); else if (x.classList.contains("sel")) x.classList.add("wrong"); } });
      if (k === "match") { var s = it.querySelector("select"); s.disabled = true; s.className = good ? "right" : "wrong"; }
      m.className = "mark " + (good ? "ok" : "ng"); m.textContent = good ? "○" : a ? "✕" : "✕（答えていない）";
      if (!good && (k === "match" || k === "order")) { var f = document.createElement("span"); f.className = "fix"; f.textContent = "正しくは：" + it.dataset.a.replace(/→/g, " → "); it.appendChild(f); }
    });
    var score = Math.round(ok / its.length * 100), pass = +box.dataset.pass, okp = score >= pass, d = load(), id = lec(), prev = d[id];
    d[id] = { best: Math.max(score, prev ? prev.best : 0), last: score, passed: okp || !!(prev && prev.passed), at: new Date().toISOString().slice(0, 10) }; save(d);
    var r = box.querySelector(".res"); r.hidden = false; r.className = "res " + (okp ? "pass" : "fail");
    r.innerHTML = '<strong>' + score + '点</strong><span class="stamp">' + (okp ? "合格" : "もう少し") + '</span><p>' + its.length + "問中 " + ok + "問 正解（合格は" + pass + "点）</p><p>" +
      (okp ? (score === 100 ? "満点です。" : "✕の問題だけ本文で見直そう。") + "明日もう一度ためすと、記憶に残りやすい。" : "✕の問題の節を読み直してから、もう一度。") + "</p>";
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
