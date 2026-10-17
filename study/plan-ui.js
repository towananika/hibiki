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
  function link(key, n) {
    if (key === 'dig') return n >= 7 && n <= 15 ? 'view.html?n=ch' + n : 'digital.html#c' + (n - 1);
    if (key === 'macro' && n >= 8 && n <= 15) return 'view.html?n=macro' + n;
    if (key === 'trad' && n === 7) return 'view.html?n=tradition7';
    if (key === 'money' && n === 8) return 'view.html?n=money8';
    if (key === 'open' && n === 8) return 'view.html?n=open8';
    if (key === 'rel' && n === 8) return 'view.html?n=religion8';
    return '';
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
        return '<div class="plan-lesson"><label for="' + id + '"><input id="' + id + '" type="checkbox" data-course="' + x.key + '" data-lesson="' + x.n + '"' + (done(x.key, x.n) ? ' checked' : '') + '>第' + x.n + c.unit + '</label>' + (href ? '<a href="' + href + '">ノート</a>' : '<small>講義で学ぶ</small>') + '</div>';
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
      var complete = targets.length > 0 && targets.every(function (n) { return done(c.key, n); });
      slot.innerHTML = '<button type="button" class="course-graph" data-chart-course="' + c.key + '" aria-label="' + c.name + '、' + total + c.unit + '中' + finished + c.unit + '完了。この週は' + goal + '。' + (complete ? 'この週の学習は完了。' : '') + '学習記録を開く"><span class="chart-track" aria-hidden="true">' + segments.join('') + '</span><span class="chart-caption">' + '<span class="week-tag">' + caption + '</span>' + (complete ? '<span class="done-tag">✓ 完了</span>' : '') + '</span></button>';
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
