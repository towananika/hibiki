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
  var shortNames = { dig: 'デジタル経済', trad: '生活文化', money: '貨幣金融', macro: 'マクロ経済', rel: '世界の宗教', open: '社会と21世紀' };
  var host = document.getElementById('weekly-plan'), selected = -1;
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
  function completedTo(c) { var n = 0, max = state.totals[c.key] || 15; while (n < max && done(c.key, n + 1)) n++; return n; }
  function link(key, n) {
    if (key === 'dig') return 'digital.html#c' + (n - 1);
    if (key === 'macro' && n >= 8 && n <= 15) return 'view.html?n=macro' + n;
    if (key === 'trad' && n === 7) return 'view.html?n=tradition7';
    if (key === 'money' && n === 8) return 'view.html?n=money8';
    if (key === 'rel' && n === 8) return 'view.html?n=religion8';
    return '';
  }
  function range(w) { return w.start.replace(/^\d{4}-/, '').replace('-', '/') + '〜' + w.end.replace(/^\d{4}-/, '').replace('-', '/'); }
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
  function chartHTML(week) {
    return courses.filter(function (c) { return state.enabled[c.key] !== false; }).map(function (c) {
      var total = state.totals[c.key] || 15, finished = 0, segments = [];
      var targets = week.items.filter(function (x) { return x.key === c.key; }).map(function (x) { return x.n; });
      for (var n = 1; n <= total; n++) {
        var isDone = done(c.key, n), isGoal = targets.indexOf(n) >= 0;
        if (isDone) finished++;
        segments.push('<i class="chart-segment' + (isDone ? ' is-done' : '') + (isGoal ? ' is-goal' : '') + '"></i>');
      }
      var goal = targets.length ? '第' + targets.join('・') + c.unit : (week.items.length ? '予定なし' : '復習');
      return '<button type="button" class="chart-row" data-chart-course="' + c.key + '" aria-label="' + c.name + '、' + total + c.unit + '中' + finished + c.unit + '完了。この週は' + goal + '。予定と記録を開く"><span class="chart-label"><span class="chart-name">' + shortNames[c.key] + '</span><span class="chart-goal">' + goal + '</span></span><span class="chart-track" aria-hidden="true">' + segments.join('') + '</span></button>';
    }).join('') || '<p class="plan-note">設定から、学習する科目を選べます。</p>';
  }
  function paint() {
    var hasPlan = state.weeks.length > 0;
    document.getElementById('plan-content').hidden = !hasPlan;
    document.getElementById('plan-empty').hidden = hasPlan;
    if (!hasPlan) { document.getElementById('plan-title').textContent = '週別の学習プラン'; return; }
    if (selected < 0 || selected >= state.weeks.length) selected = current();
    var w = state.weeks[selected], count = w.items.filter(function (x) { return done(x.key, x.n); }).length;
    var day = P.today(), overdue = [], seen = {};
    state.weeks.forEach(function (week) { if (week.end < day) week.items.forEach(function (x) { var id = x.key + ':' + x.n; if (!done(x.key, x.n) && !seen[id]) { overdue.push(x); seen[id] = true; } }); });
    var isNow = w.start <= day && w.end >= day;
    document.getElementById('plan-title').textContent = isNow ? '今週の目安' : '学習の進み具合';
    document.getElementById('plan-date').textContent = range(w);
    document.getElementById('plan-chart').innerHTML = chartHTML(w);
    document.getElementById('plan-week').innerHTML = state.weeks.map(function (week, i) { return '<option value="' + i + '"' + (selected === i ? ' selected' : '') + '>' + '第' + (i + 1) + '週 ' + range(week) + (week.start <= day && week.end >= day ? '（今週）' : '') + '</option>'; }).join('');
    document.getElementById('plan-summary').textContent = 'この週 ' + count + ' / ' + w.items.length + ' 完了';
    document.getElementById('plan-list').innerHTML = w.items.length ? itemsHTML(w.items, 'week') : '<p class="plan-note">この週は新しい講の予定がありません。復習や形成評価の見直しに使えます。</p>';
    document.getElementById('plan-carry').innerHTML = overdue.length ? '<details><summary>前の週の続き ' + overdue.length + '件</summary>' + itemsHTML(overdue, 'carry') + '</details>' : '';
    document.getElementById('plan-note').textContent = day > state.weeks[state.weeks.length - 1].end ? '登録した期間は終了しています。最後の週を表示しています。' : (day < state.start ? '登録した期間の開始前です。最初の週を表示しています。' : '完了しても、ほかの講が今週へ繰り上がることはありません。');
  }
  function openSettings() {
    var form = document.getElementById('plan-settings'); form.hidden = false;
    document.getElementById('plan-details').open = true;
    document.getElementById('plan-start').value = state.start;
    document.getElementById('plan-count').value = state.count;
    document.getElementById('plan-fields').innerHTML = courses.map(function (c) {
      return '<fieldset><legend>' + c.name + '</legend><label class="plan-include"><input type="checkbox" name="include-' + c.key + '"' + (state.enabled[c.key] !== false ? ' checked' : '') + '>計画に入れる</label><div class="plan-inputs"><label>全' + c.unit + '数<input name="total-' + c.key + '" type="number" min="1" max="' + (c.key === 'dig' ? 15 : 60) + '" value="' + (state.totals[c.key] || 15) + '"' + (c.key === 'dig' ? ' readonly' : '') + ' required></label><label>基準週の最初の' + c.unit + '<input name="first-' + c.key + '" type="number" min="1" max="60" value="' + (state.first[c.key] || 1) + '" required></label><label>1週に進む' + c.unit + '数<input name="pace-' + c.key + '" type="number" min="1" max="10" value="' + (state.pace[c.key] || 1) + '" required></label><label>ここまで完了（' + c.unit + '）<input name="done-' + c.key + '" type="number" min="0" max="60" value="' + completedTo(c) + '" required></label></div></fieldset>';
    }).join('');
    document.getElementById('plan-edit').setAttribute('aria-expanded', 'true');
  }
  host.innerHTML = '<div class="plan-heading"><h2 id="plan-title">今週の目安</h2><span id="plan-date"></span></div>' +
    '<p id="plan-empty" class="plan-note" hidden>学習する週を設定すると、今週進める講がここに出ます。</p><div id="plan-content" hidden><div id="plan-chart" aria-label="科目ごとの進み具合と、この週の目安"></div><div class="chart-legend"><span><i class="legend-done" aria-hidden="true"></i>完了</span><span><i class="legend-goal" aria-hidden="true"></i>この週</span><span>1目盛り＝1講・章</span></div></div>' +
    '<details id="plan-details"><summary>予定と記録</summary><div class="plan-expanded"><p class="plan-note">形成評価 8/17〜12/13に合わせた目安です。初期案は各15講・週1講、最後の2週は復習。大学の公式講割りではありません。</p><button type="button" id="plan-edit" aria-expanded="false" aria-controls="plan-settings">学習週・進み具合を設定</button>' +
    '<form id="plan-settings" hidden><h3>授業の予定に合わせる</h3><div class="plan-inputs"><label>基準週の月曜日<input id="plan-start" type="date" required></label><label>表示する週数<input id="plan-count" type="number" min="1" max="60" required></label></div><p class="plan-note">各科目の講数と週のペースを直せます。週ごとに違う場合は、登録後に「この週の予定を直す」で調整できます。全体を登録し直すと、週ごとの調整は置き換わります。</p><p class="plan-note">「ここまで完了」を変更した科目だけ、完了記録を指定した講までにそろえます。デジタル経済の記録も共通です。</p><div id="plan-fields"></div><p id="plan-error" role="alert"></p><div class="plan-actions"><button type="submit">週別プランを保存する</button><button id="plan-cancel" type="button">閉じる</button></div></form>' +
    '<label class="plan-week-label" for="plan-week">週を選ぶ</label><select id="plan-week"></select><p id="plan-summary" aria-live="polite"></p><div id="plan-list"></div><button type="button" id="plan-week-edit">この週の予定を直す</button><form id="plan-week-settings" hidden><p class="plan-note">「8」「8,9」「8-10」のように指定します。予定がない科目は空欄にします。</p><div id="plan-week-fields"></div><p id="plan-week-error" role="alert"></p><div class="plan-actions"><button type="submit">この週を保存</button><button type="button" id="plan-week-cancel">閉じる</button></div></form><div id="plan-carry"></div><p class="plan-note" id="plan-note"></p></div></details><p id="plan-status" role="status"></p>';
  if (!state.weeks.length) { state.weeks = P.build(state.start, state.count, config()); store(KEY, state); }
  document.getElementById('plan-chart').addEventListener('click', function (e) {
    var row = e.target.closest('[data-chart-course]'); if (!row) return;
    document.getElementById('plan-details').open = true;
    var group = document.querySelector('#plan-list [data-course-group="' + row.dataset.chartCourse + '"]');
    var target = group ? group.querySelector('input') : document.getElementById('plan-week');
    if (target) target.focus();
  });
  document.getElementById('plan-edit').onclick = openSettings;
  function closeSettings() { document.getElementById('plan-settings').hidden = true; document.getElementById('plan-edit').setAttribute('aria-expanded', 'false'); document.getElementById('plan-edit').focus(); }
  document.getElementById('plan-cancel').onclick = closeSettings;
  function closeWeek() { document.getElementById('plan-week-settings').hidden = true; }
  document.getElementById('plan-week-cancel').onclick = closeWeek;
  document.getElementById('plan-week').onchange = function () { selected = +this.value; closeWeek(); paint(); };
  document.getElementById('plan-week-edit').onclick = function () {
    document.getElementById('plan-week-settings').hidden = false;
    document.getElementById('plan-week-fields').innerHTML = courses.filter(function (c) { return state.enabled[c.key] !== false; }).map(function (c) {
      var values = state.weeks[selected].items.filter(function (x) { return x.key === c.key; }).map(function (x) { return x.n; });
      return '<label class="plan-override">' + c.name + '<input name="week-' + c.key + '" value="' + values.join(',') + '" placeholder="予定なし"></label>';
    }).join('');
    document.getElementById('plan-week-error').textContent = '';
  };
  document.getElementById('plan-week-settings').onsubmit = function (e) {
    e.preventDefault(); var form = this, items = [];
    try {
      courses.forEach(function (c) {
        if (state.enabled[c.key] === false) return;
        P.parseLessons(form.elements['week-' + c.key].value, state.totals[c.key] || 15).forEach(function (n) { items.push({ key: c.key, n: n }); });
      });
      state.weeks[selected].items = items; store(KEY, state); closeWeek(); paint();
    } catch (err) { document.getElementById('plan-week-error').textContent = err.message; }
  };
  host.addEventListener('change', function (e) {
    var key = e.target.dataset.course, n = +e.target.dataset.lesson;
    if (!key || !n) return;
    if (key === 'dig') { var digital = read(DIGITAL, {}); digital[n - 1] = e.target.checked ? Date.now() : 0; store(DIGITAL, digital); }
    else { state.done[key + ':' + n] = e.target.checked; store(KEY, state); }
    var focused = e.target.id;
    window.dispatchEvent(new Event('studyprogress'));
    paint();
    var target = document.getElementById(focused); if (target) target.focus();
  });
  document.getElementById('plan-settings').onsubmit = function (e) {
    e.preventDefault(); var form = this, prev = JSON.parse(JSON.stringify(state)), digital = read(DIGITAL, {}), nextDigital = Object.assign({}, digital);
    try {
      var start = document.getElementById('plan-start').value, count = +document.getElementById('plan-count').value;
      courses.forEach(function (c) {
        var total = +form.elements['total-' + c.key].value, n = +form.elements['done-' + c.key].value, old = completedTo(c);
        if (!Number.isInteger(total) || total < 1 || total > (c.key === 'dig' ? 15 : 60) || !Number.isInteger(n) || n < 0 || n > total) throw new Error(c.name + '：完了数は0〜全講数で入力してください');
        state.totals[c.key] = total; state.enabled[c.key] = form.elements['include-' + c.key].checked;
        state.first[c.key] = +form.elements['first-' + c.key].value; state.pace[c.key] = +form.elements['pace-' + c.key].value;
        if (n !== old) for (var i = 1; i <= 60; i++) {
          if (c.key === 'dig') { if (i <= 15) nextDigital[i - 1] = i <= n ? (digital[i - 1] || Date.now()) : 0; }
          else state.done[c.key + ':' + i] = i <= n;
        }
      });
      var weeks = P.build(start, count, config());
      state.start = start; state.count = count; state.weeks = weeks;
      if (JSON.stringify(digital) !== JSON.stringify(nextDigital)) store(DIGITAL, nextDigital);
      store(KEY, state); window.dispatchEvent(new Event('studyprogress')); selected = -1; document.getElementById('plan-error').textContent = ''; closeWeek(); closeSettings(); paint();
    } catch (err) { state = prev; document.getElementById('plan-error').textContent = err.message; }
  };
  window.addEventListener('storage', function (e) {
    if (e.key === KEY) { var next = read(KEY, null); if (next && next.mode === 'university' && Array.isArray(next.weeks)) { state = next; closeWeek(); } }
    if (e.key === KEY || e.key === DIGITAL) paint();
  });
  window.addEventListener('pageshow', function () { paint(); });
  paint();
})();
