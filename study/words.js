// 選んだ言葉を「あとで聞く」に保存する。答えは glossary.json にあれば、その場でも出る。
(function () {
  var KEY = "hibiki-words-v1", gl = {};
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} }
  window.HBWords = { load: load, save: save, gloss: function () { return gl; }, find: find };
  function find(w) {
    if (gl[w]) return gl[w];
    for (var k in gl) if ((k.length > 1 && w.indexOf(k) >= 0) || (w.length > 1 && k.indexOf(w) === 0)) return gl[k];
    return "";
  }
  fetch("glossary.json").then(function (r) { return r.json(); }).then(function (j) { gl = j; window.dispatchEvent(new Event("hbgloss")); }).catch(function () {});
  if (!document.body || document.body.getAttribute("data-nowords") != null) return;
  var bar = document.createElement("div");
  bar.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:9;display:none;padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:var(--surface,#fbf9f4);border-top:1px solid var(--border,#e2dac8);box-shadow:0 -8px 24px rgba(0,0,0,.12);font-size:14px;line-height:1.6";
  bar.innerHTML = '<div style="max-width:480px;margin:0 auto"><div id="hbw" style="font-weight:600"></div><div id="hbm" style="color:var(--muted,#8a8271);font-size:13px"></div><div style="display:flex;gap:8px;margin-top:6px"><button id="hbs" style="flex:1;padding:8px;border-radius:999px;border:0;background:var(--wood,#93704b);color:#fff;font:inherit;font-weight:600">あとで聞く</button><a id="hbl" href="words.html" style="padding:8px 12px;border-radius:999px;border:1px solid var(--border,#e2dac8);color:inherit;text-decoration:none">一覧</a></div></div>';
  document.body.appendChild(bar);
  var cur = "", ctx = "", t;
  function show() {
    var s = window.getSelection(), w = (s ? s.toString() : "").replace(/\s+/g, " ").trim();
    if (!w || w.length > 24 || w.length < 1) { if (!bar.contains(document.activeElement)) bar.style.display = "none"; return; }
    var n = s.anchorNode && (s.anchorNode.nodeType === 3 ? s.anchorNode.parentNode : s.anchorNode);
    if (!n || !n.closest || !n.closest("main") || n.closest("button")) return;
    var blk = n.closest("li,p,td,th,blockquote,h2,h3,.one,.term,.me,div") || n;
    cur = w; ctx = (blk.textContent || "").replace(/\s+/g, " ").trim().slice(0, 90);
    document.getElementById("hbw").textContent = "「" + w + "」";
    var m = find(w);
    document.getElementById("hbm").textContent = m || "";
    document.getElementById("hbs").textContent = m ? "あとで見直す" : "あとで聞く";
    bar.style.display = "block";
  }
  document.addEventListener("selectionchange", function () { clearTimeout(t); t = setTimeout(show, 350); });
  document.getElementById("hbs").onclick = function () {
    if (!cur) return;
    var a = load();
    if (!a.some(function (x) { return x.w === cur; })) a.push({ id: Date.now().toString(36), w: cur, ctx: ctx, src: location.pathname.split("/").pop() + location.search, d: new Date().toISOString().slice(0, 10) });
    save(a); this.textContent = "保存しました ✓";
    var b = this; setTimeout(function () { b.textContent = "あとで聞く"; bar.style.display = "none"; if (window.getSelection) window.getSelection().removeAllRanges(); }, 900);
  };
})();
