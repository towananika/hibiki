(function (root) {
  'use strict';
  function normalize(text) {
    return String(text || '').normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 96); });
  }
  function find(pages, query) {
    var tokens = normalize(query).trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];
    return pages.map(function (page, index) {
      var title = normalize(page.title), keywords = normalize(page.keywords), description = normalize(page.description), text = normalize(page.text);
      var score = 0;
      for (var token of tokens) {
        if (title.indexOf(token) >= 0) score += 12;
        else if (keywords.indexOf(token) >= 0) score += 6;
        else if (description.indexOf(token) >= 0) score += 3;
        else if (text.indexOf(token) >= 0) score += 1;
        else return null;
      }
      if (title === normalize(query).trim()) score += 30;
      return { page: page, score: score, index: index };
    }).filter(Boolean).sort(function (a,b) { return b.score-a.score || a.index-b.index; }).map(function (x) { return x.page; });
  }
  if (typeof module === 'object' && module.exports) { module.exports = { normalize: normalize, find: find }; return; }
  var input = document.getElementById('site-query'); if (!input) return;
  var results = document.getElementById('search-results'), status = document.getElementById('search-status');
  var menu = document.getElementById('menu'), priority = document.getElementById('priority-slot'), clear = document.getElementById('search-clear');
  var pages = null, pending = null;
  function load() {
    if (pages) return Promise.resolve(pages);
    if (!pending) pending = fetch('search/index.json', {cache:'no-cache'}).then(function (r) { if (!r.ok) throw new Error('index'); return r.json(); }).then(function (data) { pages=data; pending=null; return data; }, function (err) { pending=null; throw err; });
    return pending;
  }
  function render() {
    var query = input.value.trim(), active = !!query;
    menu.hidden = active; if (priority) priority.hidden = active; results.hidden = !active; clear.hidden = !input.value;
    results.replaceChildren(); status.textContent = '';
    if (!active) return;
    status.textContent = '探しています…';
    load().then(function (data) {
      if (input.value.trim() !== query) return;
      results.replaceChildren();
      var matches = find(data, query);
      status.textContent = matches.length ? matches.length + '件見つかりました' : '見つかりませんでした。短い言葉や、別の言い方で探してみてください。';
      matches.forEach(function (page) {
        var a=document.createElement('a'); a.className='search-result'; a.href=page.url;
        var title=document.createElement('strong'); title.textContent=page.title;
        var description=document.createElement('span'); description.textContent=page.description;
        a.appendChild(title); a.appendChild(description); results.appendChild(a);
      });
    }).catch(function () { if (input.value.trim() === query) status.textContent='検索を読み込めませんでした。もう一度検索してください。'; });
  }
  input.addEventListener('input', function (e) { if (!e.isComposing) render(); });
  input.addEventListener('compositionend', render);
  document.getElementById('site-search').addEventListener('submit', function (e) { e.preventDefault(); render(); });
  clear.addEventListener('click', function () { input.value=''; render(); input.focus(); });
  root.addEventListener('pageshow', render);
})(typeof window === 'object' ? window : globalThis);
