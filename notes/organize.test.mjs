import test from 'node:test';
import assert from 'node:assert/strict';
import {organize, consultation} from './organize.mjs';
test('keeps original wishes and removes only exact duplicates', () => {
  const r = organize('静かな家がほしい。\n静かな家がほしい。\n冷蔵庫の騒音が気になる。\n窓を確認する。');
  assert.deepEqual(r['ほしいこと'], ['静かな家がほしい']);
  assert.deepEqual(r['気になること'], ['冷蔵庫の騒音が気になる']);
  assert.deepEqual(r['やってみたいこと'], ['窓を確認する']);
});
test('does not invent summaries or omit unclassified content', () => {
  assert.deepEqual(organize(''), {'ほしいこと':[], '気になること':[], 'やってみたいこと':[], 'そのほか':[]});
  assert.deepEqual(organize('今日は散歩した')['そのほか'], ['今日は散歩した']);
});
test('consultation preserves source text and excludes unselected notes', () => {
  const text = consultation([{text:'選んだメモ\n二行目'}], '考えてほしい');
  assert.ok(text.includes('選んだメモ\n二行目'));
  assert.ok(text.includes('考えてほしい'));
  assert.throws(() => consultation([], ''));
});
