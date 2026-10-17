/* 学習の日付は韓国・日本時間、週は月曜始まり。 */
(function (root) {
  'use strict';
  var DAY = 86400000;
  function date(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error('日付を確認してください');
    var t = Date.parse(s + 'T00:00:00Z');
    if (!Number.isFinite(t) || iso(t) !== s) throw new Error('日付を確認してください');
    return t;
  }
  function iso(t) { return new Date(t).toISOString().slice(0, 10); }
  function today(now) {
    var parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now || new Date());
    var p = {}; parts.forEach(function (x) { p[x.type] = x.value; });
    return p.year + '-' + p.month + '-' + p.day;
  }
  function monday(t) { return t - ((new Date(t).getUTCDay() + 6) % 7) * DAY; }
  function build(start, count, courses) {
    var a = date(start);
    if (monday(a) !== a) throw new Error('基準週は月曜日を指定してください');
    if (!Number.isInteger(count) || count < 1 || count > 60) throw new Error('表示する週数は1〜60で入力してください');
    var weeks = [];
    for (var i = 0; i < count; i++) weeks.push({ start: iso(a + i * 7 * DAY), end: iso(a + (i * 7 + 6) * DAY), items: [] });
    courses.forEach(function (c) {
      if (!Number.isInteger(c.total) || c.total < 1 || c.total > 60 || !Number.isInteger(c.first) || c.first < 1 || c.first > c.total || !Number.isInteger(c.pace) || c.pace < 1 || c.pace > 10) throw new Error('全講数・基準週の講・週あたりの講数を確認してください');
      if (!c.enabled) return;
      weeks.forEach(function (week, i) {
        for (var j = 0; j < c.pace; j++) {
          var n = c.first + i * c.pace + j;
          if (n <= c.total) week.items.push({ key: c.key, n: n });
        }
      });
    });
    return weeks;
  }
  function parseLessons(text, total) {
    if (!text.trim()) return [];
    var out = [];
    text.trim().split(/[,、\s]+/).forEach(function (part) {
      var m = part.match(/^(\d+)(?:[-〜～](\d+))?$/);
      if (!m) throw new Error('講は「8」「8,9」「8-10」の形で入力してください');
      var a = +m[1], b = m[2] ? +m[2] : a;
      if (a < 1 || b > total || b < a) throw new Error('講は1〜全講数の範囲で入力してください');
      for (var i = a; i <= b; i++) if (out.indexOf(i) < 0) out.push(i);
    });
    return out.sort(function (a,b) { return a-b; });
  }
  var api = { today: today, build: build, parseLessons: parseLessons, date: date, iso: iso, DAY: DAY };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.StudyPlan = api;
})(typeof window !== 'undefined' ? window : globalThis);
