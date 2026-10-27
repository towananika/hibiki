import test from 'node:test';
import assert from 'node:assert/strict';
import {amount, remaining, safeSource} from './wishlist-model.mjs';
test('unknown values remain unknown and zero is valid', () => {
  assert.equal(amount(''), null); assert.equal(amount('0'), 0);
  assert.equal(remaining(1000, null), null); assert.equal(remaining(null, 0), null);
  assert.equal(remaining(1000, 200), 800); assert.equal(remaining(1000, 1200), 0);
  for (const v of ['-1','NaN','Infinity','1.5']) assert.throws(() => amount(v));
});
test('only https sources are navigable', () => {
  assert.equal(safeSource('javascript:alert(1)'), null);
  assert.equal(safeSource('http://example.com'), null);
  assert.equal(safeSource('https://example.com'), 'https://example.com/');
});
