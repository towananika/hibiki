// 選んだ言葉を「あとで聞く」に保存する。答えは glossary.json にあれば、その場でも出る。
(function () {
  var KEY = "hibiki-words-v1", gl = {};
  function load() { try { var a = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  function save(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); return true; } catch (e) { return false; } }
  window.HBWords = { load: load, save: save, gloss: function () { return gl; }, find: find };
  function find(w) {
    if (gl[w]) return gl[w];
    for (var k in gl) if ((k.length > 1 && w.indexOf(k) >= 0) || (w.length > 1 && k.indexOf(w) === 0)) return gl[k];
    return "";
  }
  fetch("glossary.json").then(function (r) { return r.json(); }).then(function (j) { gl = j; window.dispatchEvent(new Event("hbgloss")); }).catch(function () {});
  if (!document.body || document.body.getAttribute("data-nowords") != null) return;
  var bar = document.createElement("div");
  bar.id = 'hb-word-popup'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', '選んだ言葉をあとで聞く');
  bar.style.cssText = "position:fixed;left:0;top:0;z-index:20;display:none;gap:6px;width:300px;box-sizing:border-box;padding:10px;background:var(--surface,#fbf9f4);color:var(--text,#2b2924);border:1px solid var(--border,#e2dac8);border-radius:14px;box-shadow:0 4px 20px rgba(0,0,0,.16);font-size:14px;line-height:1.6;overflow-y:auto;overflow-wrap:anywhere";
  bar.innerHTML = '<div style="display:flex;gap:6px;align-items:center"><button type="button" id="hbs" style="flex:1;min-height:40px;padding:6px 10px;border-radius:999px;border:0;background:var(--wood,#93704b);color:#fff;font:inherit;font-weight:600">あとで聞く</button><a id="hbl" href="words.html" style="padding:8px 10px;border-radius:999px;border:1px solid var(--border,#e2dac8);color:inherit;text-decoration:none">一覧</a><button type="button" id="hbwc" aria-label="言葉のメニューを閉じる" style="width:36px;min-height:40px;padding:4px;border:0;border-radius:999px;background:none;color:inherit;font:inherit">×</button></div><div id="hbw" style="font-weight:600"></div><div id="hbm" style="color:var(--muted,#8a8271);font-size:13px"></div>';
  document.body.appendChild(bar);
  var cur = "", ctx = "", t, savedTimer, pointer = null, dragging = false;
  function hide() { clearTimeout(t); clearTimeout(savedTimer); bar.style.display = 'none'; }
  function element(node) { return node && (node.nodeType === 3 ? node.parentElement : node); }
  function place(selection) {
    var range = selection.getRangeAt(0), rect = range.getBoundingClientRect(), anchor = null;
    if (pointer && pointer.type === 'mouse') anchor = { x: pointer.x, top: pointer.y, bottom: pointer.y };
    if (!anchor) {
      var caret = document.createRange(); caret.setStart(selection.focusNode, selection.focusOffset); caret.collapse(true);
      var end = caret.getBoundingClientRect();
      if (end.height) rect = end;
      anchor = { x: rect.right, top: rect.top, bottom: rect.bottom };
    }
    var view = window.visualViewport;
    var left = view ? view.offsetLeft : 0, top = view ? view.offsetTop : 0;
    var width = view ? view.width : window.innerWidth, height = view ? view.height : window.innerHeight;
    // サイト共通の body{zoom:1.3/1.5} を含め、画面上の座標で収める。
    var scale = bar.getBoundingClientRect().width / bar.offsetWidth || 1;
    bar.style.width = Math.min(320, (width - 16) / scale) + 'px';
    bar.style.maxHeight = (height - 16) / scale + 'px';
    bar.style.flexDirection = 'column';
    var bounds = bar.getBoundingClientRect();
    var above = anchor.bottom + 12 + bounds.height > top + height - 8;
    bar.style.flexDirection = above ? 'column-reverse' : 'column';
    var x = Math.max(left + 8, Math.min(anchor.x - 18, left + width - bounds.width - 8));
    var y = above ? anchor.top - bounds.height - 12 : anchor.bottom + 12;
    y = Math.max(top + 8, Math.min(y, top + height - bounds.height - 8));
    bar.style.left = x / scale + 'px'; bar.style.top = y / scale + 'px';
  }
  function show() {
    if (dragging) return;
    var s = window.getSelection(), w = (s ? s.toString() : "").replace(/\s+/g, " ").trim();
    if (!w || w.length > 24 || !s.rangeCount) { if (!bar.contains(document.activeElement)) hide(); return; }
    var n = element(s.anchorNode), end = element(s.focusNode);
    if (!n || !end || !n.closest || !end.closest || !n.closest('main') || n.closest('main') !== end.closest('main') || n.closest('button') || end.closest('button')) { hide(); return; }
    clearTimeout(savedTimer);
    var blk = n.closest("li,p,td,th,blockquote,h2,h3,.one,.term,.me,div") || n;
    cur = w; ctx = (blk.textContent || "").replace(/\s+/g, " ").trim().slice(0, 90);
    document.getElementById("hbw").textContent = "「" + w + "」";
    var m = find(w);
    document.getElementById("hbm").textContent = m || "";
    document.getElementById("hbs").textContent = m ? "あとで見直す" : "あとで聞く";
    bar.style.display = "flex"; place(s);
  }
  function schedule() { clearTimeout(t); t = setTimeout(show, 120); }
  document.addEventListener('selectionchange', schedule);
  document.addEventListener('pointerdown', function (event) {
    if (bar.contains(event.target)) return;
    hide(); dragging = true; pointer = null;
  });
  document.addEventListener('pointerup', function (event) {
    if (bar.contains(event.target)) return;
    dragging = false; pointer = { x: event.clientX, y: event.clientY, type: event.pointerType }; schedule();
  });
  document.addEventListener('pointercancel', function () { dragging = false; hide(); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') { hide(); return; }
    if (event.shiftKey || event.key.indexOf('Arrow') === 0) { pointer = null; schedule(); }
  });
  bar.addEventListener('pointerdown', function (event) { if (event.pointerType === 'mouse') event.preventDefault(); });
  document.getElementById('hbwc').onclick = hide;
  document.addEventListener('scroll', function (event) { if (!bar.contains(event.target)) hide(); }, true);
  window.addEventListener('resize', hide);
  if (window.visualViewport) { window.visualViewport.addEventListener('resize', hide); window.visualViewport.addEventListener('scroll', hide); }
  document.getElementById("hbs").onclick = function () {
    if (!cur) return;
    var a = load();
    if (!a.some(function (x) { return x.w === cur; })) a.push({ id: Date.now().toString(36), w: cur, ctx: ctx, src: location.pathname.split("/").pop() + location.search, d: new Date().toISOString().slice(0, 10) });
    if (!save(a)) { this.textContent = '保存できません。もう一度'; return; }
    this.textContent = "保存しました ✓";
    var b = this, word = cur;
    savedTimer = setTimeout(function () { if (cur !== word) return; b.textContent = "あとで聞く"; hide(); if (window.getSelection) window.getSelection().removeAllRanges(); }, 900);
  };
})();
