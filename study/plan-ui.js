(function () {
  'use strict';
  var P = window.StudyPlan, KEY = 'hibiki-study-plan-v1', DIGITAL = 'hibiki-study-digital-v1';
  var courses = [
    { key: 'dig', name: 'デジタル経済の理解', unit: '章' },
    { key: 'trad', name: '伝統社会と生活文化', unit: '講' },
    { key: 'money', name: '貨幣金融論', unit: '講' },
    { key: 'macro', name: '上級マクロ経済論', unit: '講' },
    { key: 'rel', name: '世界の宗教', unit: '講' },
    { key: 'open', name: '開かれた社会と21世紀', unit: '講' }
  ];
  var host = document.getElementById('study-progress');
  function read(k, fallback) { try { return JSON.parse(localStorage.getItem(k)) || fallback; } catch (e) { return fallback; } }
  function store(k, data) {
    try { localStorage.setItem(k, JSON.stringify(data)); return true; }
    catch (e) { document.getElementById('plan-status').textContent = '保存できませんでした。この画面を閉じると変更が失われます。'; return false; }
  }
  function fresh() { return { mode: 'university', start: '2026-08-17', count: 17, totals: {}, enabled: {}, first: {}, pace: {}, done: {}, weeks: [] }; }
  var state = read(KEY, null);
  if (!state || state.mode !== 'university' || !state.totals || !state.enabled || !state.first || !state.pace || !state.done || !Array.isArray(state.weeks)) state = fresh();
  function config() { return courses.map(function (c) { return { key: c.key, total: state.totals[c.key] || 15, first: state.first[c.key] || 1, pace: state.pace[c.key] || 1, enabled: state.enabled[c.key] !== false }; }); }
  function done(key, n) { return key === 'dig' ? !!read(DIGITAL, {})[n - 1] : !!state.done[key + ':' + n]; }
  var materials = window.StudyMaterials || {};
  function ready(key, n) { return !!(materials[key] && materials[key][n]); }
  function link(key, n) {
    if (ready(key, n)) return materials[key][n];
    return key === 'dig' && n >= 1 && n <= 15 ? 'digital.html#c' + (n - 1) : '';
  }
  function materialLabel(key, n) { return ready(key, n) ? '教材あり' : (key === 'dig' && n <= 15 ? '要点のみ' : '準備中'); }
  function lessonRanges(numbers) {
    var groups = [], start, end;
    numbers.forEach(function (n) { if (start === undefined) start = end = n; else if (n === end + 1) end = n; else { groups.push(start === end ? '' + start : start + '〜' + end); start = end = n; } });
    if (start !== undefined) groups.push(start === end ? '' + start : start + '〜' + end);
    return groups.join('・');
  }
  function current() {
    var day = P.today(), i = state.weeks.findIndex(function (w) { return w.start <= day && w.end >= day; });
    return i >= 0 ? i : (day < state.start ? 0 : state.weeks.length - 1);
  }
  function itemsHTML(items, prefix) {
    return courses.map(function (c) {
      var list = items.filter(function (x) { return x.key === c.key; });
      if (!list.length) return '';
      return '<div class="plan-course" data-course-group="' + c.key + '"><h3>' + c.name + '</h3><div class="plan-lessons">' + list.map(function (x) {
        var href = link(x.key, x.n), id = prefix + '-' + x.key + '-' + x.n;
        return '<div class="plan-lesson' + (href ? '' : ' is-unavailable') + '"><label for="' + id + '"><input id="' + id + '" type="checkbox" data-course="' + x.key + '" data-lesson="' + x.n + '"' + (done(x.key, x.n) ? ' checked' : '') + '>第' + x.n + c.unit + '</label>' + (href ? '<a class="' + (ready(x.key, x.n) ? 'material-ready' : '') + '" href="' + href + '">' + materialLabel(x.key, x.n) + ' ›</a>' : '<small>準備中</small>') + '</div>';
      }).join('') + '</div></div>';
    }).join('');
  }
  function paintCourseGraphs(week) {
    courses.forEach(function (c) {
      var slot = document.querySelector('[data-subject-graph="' + c.key + '"]'); if (!slot) return;
      var total = state.totals[c.key] || 15, finished = 0, segments = [];
      var enabled = state.enabled[c.key] !== false;
      var targets = enabled ? week.items.filter(function (x) { return x.key === c.key; }).map(function (x) { return x.n; }) : [];
      for (var n = 1; n <= total; n++) {
        var isDone = done(c.key, n), isGoal = targets.indexOf(n) >= 0;
        if (isDone) finished++;
        segments.push('<i class="chart-segment' + (isDone ? ' is-done' : '') + (isGoal ? ' is-goal' : '') + '"></i>');
      }
      var goal = targets.length ? '第' + targets.join('・') + c.unit : (enabled ? (week.items.length ? '予定なし' : '復習') : '計画の対象外');
      var now = week.start <= P.today() && week.end >= P.today();
      var caption = targets.length ? (now ? '今週 ' : '選択した週 ') + goal : goal;
      var available = Object.keys(materials[c.key] || {}).map(Number).sort(function (a,b) { return a-b; });
      var summary = available.length ? '教材あり：第' + lessonRanges(available) + c.unit : '教材は準備中';
      var status = targets.length ? targets.map(function (n) { return materialLabel(c.key, n); }).filter(function (x,i,a) { return a.indexOf(x) === i; }).join('・') : '';
      var complete = targets.length > 0 && targets.every(function (n) { return done(c.key, n); });
      var tiles = [];
      for (var k = 1; k <= total; k++) {
        var href = link(c.key, k);
        var cls = 'lec-tile' + (href ? ' has-page' : ' is-unavailable') + (done(c.key, k) ? ' is-done' : '') + (targets.indexOf(k) >= 0 ? ' is-now' : '');
        var label = '第' + k + c.unit + '（' + materialLabel(c.key, k) + '）' + (done(c.key, k) ? '・済み' : '');
        tiles.push(href ? '<a class="' + cls + '" href="' + href + '" aria-label="' + label + '">' + k + '</a>' : '<span class="' + cls + '" aria-disabled="true" aria-label="' + label + '">' + k + '</span>');
      }
      slot.innerHTML = '<div class="lec-grid">' + tiles.join('') + '</div><button type="button" class="course-graph" data-chart-course="' + c.key + '" aria-label="' + c.name + 'の学習記録を開く"><span class="week-tag">' + caption + '</span>' + (complete ? '<span class="done-tag">✓ 完了</span>' : '') + '<span class="rec">記録 ›</span></button>';
    });
  }
  host.innerHTML = '<dialog id="progress-dialog" aria-labelledby="progress-title"><div class="progress-heading"><h2 id="progress-title"></h2><button type="button" id="progress-close">閉じる</button></div><p class="plan-note">学習した講にチェックを入れます。</p><div id="progress-list"></div><p id="plan-status" role="status"></p></dialog>';
  var dialog = document.getElementById('progress-dialog'), activeCourse = null;
  if (!state.weeks.length) { state.weeks = P.build(state.start, state.count, config()); store(KEY, state); }
  function paint() {
    if (state.weeks.length) paintCourseGraphs(state.weeks[current()]);
    document.getElementById('goal-legend').textContent = '今週';
  }
  function paintRecords() {
    if (!activeCourse) return;
    var total = state.totals[activeCourse.key] || 15, items = [];
    for (var n = 1; n <= total; n++) items.push({ key: activeCourse.key, n: n });
    document.getElementById('progress-title').textContent = activeCourse.name;
    document.getElementById('progress-list').innerHTML = itemsHTML(items, 'record');
  }
  document.getElementById('subjects').addEventListener('click', function (e) {
    var row = e.target.closest('[data-chart-course]'); if (!row) return;
    activeCourse = courses.find(function (c) { return c.key === row.dataset.chartCourse; });
    paintRecords(); dialog.showModal();
  });
  document.getElementById('progress-close').onclick = function () { dialog.close(); };
  dialog.addEventListener('close', function () {
    var graph = activeCourse && document.querySelector('[data-chart-course="' + activeCourse.key + '"]');
    if (graph) graph.focus();
  });
  host.addEventListener('change', function (e) {
    var key = e.target.dataset.course, n = +e.target.dataset.lesson;
    if (!key || !n) return;
    if (key === 'dig') { var digital = read(DIGITAL, {}); digital[n - 1] = e.target.checked ? Date.now() : 0; store(DIGITAL, digital); }
    else { state.done[key + ':' + n] = e.target.checked; store(KEY, state); }
    window.dispatchEvent(new Event('studyprogress')); paint();
  });
  window.addEventListener('studycardsrendered', paint);
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) { var next = read(KEY, null); if (next && next.mode === 'university' && Array.isArray(next.weeks)) state = next; }
    if (e.key === KEY || e.key === DIGITAL) { paint(); if (dialog.open) paintRecords(); }
  });
  window.addEventListener('pageshow', paint);
  paint();
})();
