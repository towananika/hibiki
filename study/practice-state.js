// 復習の判定。直後の答え直しと、間隔をあけた確認を区別する。
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.StudyRecall = factory();
}(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  var GAP = 10 * 60 * 1000, DAY = 24 * 60 * 60 * 1000;
  function valid(r) {
    return !!r && typeof r.firstCorrect === 'boolean' && typeof r.needsReview === 'boolean' &&
      ['firstAt', 'lastAt', 'due', 'attempts', 'spacedCorrect', 'intervalDays'].every(function (k) { return Number.isFinite(r[k]) && r[k] >= 0; });
  }
  function answer(previous, correct, now) {
    if (!Number.isFinite(now) || now < 0 || typeof correct !== 'boolean') throw new Error('Invalid answer');
    var r = valid(previous) ? Object.assign({}, previous) : null;
    if (!r) return { firstCorrect: correct, firstAt: now, lastAt: now, attempts: 1,
      spacedCorrect: 0, intervalDays: correct ? 1 : 0, needsReview: !correct, due: now + (correct ? DAY : GAP) };
    var spaced = now >= r.due && now - r.lastAt >= GAP;
    r.lastAt = now; r.attempts++;
    if (!correct) { r.needsReview = true; r.intervalDays = 0; r.due = now + GAP; }
    else if (spaced) {
      r.spacedCorrect++; r.needsReview = false;
      r.intervalDays = r.intervalDays < 1 ? 1 : r.intervalDays < 3 ? 3 : r.intervalDays < 7 ? 7 : r.intervalDays < 14 ? 14 : 30;
      r.due = now + r.intervalDays * DAY;
    }
    return r;
  }
  function summarize(records, now) {
    var result = { answered: 0, firstCorrect: 0, spacedCorrect: 0, pending: 0, due: 0, next: null };
    records.filter(valid).forEach(function (r) {
      result.answered++; if (r.firstCorrect) result.firstCorrect++;
      if (r.spacedCorrect > 0) result.spacedCorrect++;
      if (r.needsReview || r.due <= now) result.pending++;
      if (r.due <= now) result.due++;
      if (result.next === null || r.due < result.next) result.next = r.due;
    });
    return result;
  }
  return { answer: answer, summarize: summarize, valid: valid, GAP: GAP, DAY: DAY };
}));
