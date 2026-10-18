const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../practice-state.js');
const start = Date.UTC(2026, 9, 18);
test('first answer remains distinct from immediate correction and repeated clicks', () => {
  const wrong = P.answer(null, false, start);
  const corrected = P.answer(wrong, true, start + 1000);
  assert.equal(corrected.firstCorrect, false);
  assert.equal(corrected.needsReview, true);
  assert.equal(corrected.spacedCorrect, 0);
  assert.equal(corrected.due, start + P.GAP);
  const again = P.answer(corrected, true, start + 2000);
  assert.equal(again.spacedCorrect, 0);
  assert.equal(again.due, wrong.due);
});
test('due review after a gap counts recall and schedules increasingly spaced reviews', () => {
  let r = P.answer(null, false, start);
  r = P.answer(r, true, start + P.GAP);
  assert.equal(r.needsReview, false);
  assert.equal(r.spacedCorrect, 1);
  assert.equal(r.due, start + P.GAP + P.DAY);
  r = P.answer(r, true, r.due);
  assert.equal(r.intervalDays, 3);
  r = P.answer(r, true, r.due);
  assert.equal(r.intervalDays, 7);
  r = P.answer(r, false, r.due);
  assert.equal(r.needsReview, true);
  assert.equal(r.intervalDays, 0);
  assert.equal(r.due, r.lastAt + P.GAP);
});
test('early practice cannot advance a successful review schedule', () => {
  let r = P.answer(null, true, start);
  r = P.answer(r, true, start + P.GAP);
  assert.equal(r.spacedCorrect, 0);
  assert.equal(r.due, start + P.DAY);
  assert.equal(r.firstCorrect, true);
});
test('summary counts questions rather than repeated answers and keeps unknowns unanswered', () => {
  const a = P.answer(null, false, start);
  const b = P.answer(null, true, start);
  const c = P.answer(P.answer(null, false, start), true, start + P.GAP);
  assert.deepEqual(P.summarize([a, b, c, null, {due: 0}], start + P.GAP), {
    answered: 3, firstCorrect: 1, spacedCorrect: 1, pending: 1, due: 1, next: start + P.GAP
  });
});
test('corrupt stored records and clock reversal cannot create spaced success', () => {
  assert.equal(P.valid({attempts: Infinity}), false);
  assert.equal(P.answer({due: 'bad'}, true, start).attempts, 1);
  const r = P.answer(P.answer(null, true, start), true, start - 1000);
  assert.equal(r.spacedCorrect, 0);
  assert.throws(() => P.answer(null, true, NaN));
});
