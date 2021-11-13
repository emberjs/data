import { module, test } from 'qunit';

import { diffArray } from '@ember-data/model/-private';

const a = 'aaa';
const b = 'bbb';
const c = 'ccc';
const d = 'ddd';
const e = 'eee';
const f = 'fff';
const g = 'ggg';
const h = 'hhh';
const w = 'www';
const x = 'xxx';
const y = 'yyy';
const z = 'zzz';

module('unit/diff-array Diff Array tests', function () {
  test('diff array returns no change given two empty arrays', function (assert) {
    const result = diffArray([], []);
    assert.strictEqual(result.firstChangeIndex, null);
    assert.strictEqual(result.addedCount, 0);
    assert.strictEqual(result.removedCount, 0);
  });

  test('diff array returns no change given two identical arrays length 1', function (assert) {
    const result = diffArray([a], [a]);
    assert.strictEqual(result.firstChangeIndex, null);
    assert.strictEqual(result.addedCount, 0);
    assert.strictEqual(result.removedCount, 0);
  });

  test('diff array returns no change given two identical arrays length 3', function (assert) {
    const result = diffArray([a, b, c], [a, b, c]);
    assert.strictEqual(result.firstChangeIndex, null);
    assert.strictEqual(result.addedCount, 0);
    assert.strictEqual(result.removedCount, 0);
  });

  test('diff array returns correctly given one appended item with old length 0', function (assert) {
    const result = diffArray([], [a]);
    assert.strictEqual(result.firstChangeIndex, 0);
    assert.strictEqual(result.addedCount, 1);
    assert.strictEqual(result.removedCount, 0);
  });

  test('diff array returns correctly given one appended item with old length 1', function (assert) {
    const result = diffArray([a], [a, b]);
    assert.strictEqual(result.firstChangeIndex, 1);
    assert.strictEqual(result.addedCount, 1);
    assert.strictEqual(result.removedCount, 0);
  });

  test('diff array returns correctly given one appended item with old length 2', function (assert) {
    const result = diffArray([a, b], [a, b, c]);
    assert.strictEqual(result.firstChangeIndex, 2);
    assert.strictEqual(result.addedCount, 1);
    assert.strictEqual(result.removedCount, 0);
  });

  test('diff array returns correctly given 3 appended items with old length 0', function (assert) {
    const result = diffArray([], [a, b, c]);
    assert.strictEqual(result.firstChangeIndex, 0);
    assert.strictEqual(result.addedCount, 3);
    assert.strictEqual(result.removedCount, 0);
  });

  test('diff array returns correctly given 3 appended items with old length 1', function (assert) {
    const result = diffArray([a], [a, b, c, d]);
    assert.strictEqual(result.firstChangeIndex, 1);
    assert.strictEqual(result.addedCount, 3);
    assert.strictEqual(result.removedCount, 0);
  });

  test('diff array returns correctly given 3 appended items with old length 2', function (assert) {
    const result = diffArray([a, b], [a, b, c, d, e]);
    assert.strictEqual(result.firstChangeIndex, 2);
    assert.strictEqual(result.addedCount, 3);
    assert.strictEqual(result.removedCount, 0);
  });

  test('diff array returns correctly given one item removed from end with old length 1', function (assert) {
    const result = diffArray([a], []);
    assert.strictEqual(result.firstChangeIndex, 0);
    assert.strictEqual(result.addedCount, 0);
    assert.strictEqual(result.removedCount, 1);
  });

  test('diff array returns correctly given one item removed from end with old length 2', function (assert) {
    const result = diffArray([a, b], [a]);
    assert.strictEqual(result.firstChangeIndex, 1);
    assert.strictEqual(result.addedCount, 0);
    assert.strictEqual(result.removedCount, 1);
  });

  test('diff array returns correctly given one item removed from end with old length 3', function (assert) {
    const result = diffArray([a, b, c], [a, b]);
    assert.strictEqual(result.firstChangeIndex, 2);
    assert.strictEqual(result.addedCount, 0);
    assert.strictEqual(result.removedCount, 1);
  });

  test('diff array returns correctly given 3 items removed from end with old length 3', function (assert) {
    const result = diffArray([a, b, c], []);
    assert.strictEqual(result.firstChangeIndex, 0);
    assert.strictEqual(result.addedCount, 0);
    assert.strictEqual(result.removedCount, 3);
  });

  test('diff array returns correctly given 3 items removed from end with old length 4', function (assert) {
    const result = diffArray([a, b, c, d], [a]);
    assert.strictEqual(result.firstChangeIndex, 1);
    assert.strictEqual(result.addedCount, 0);
    assert.strictEqual(result.removedCount, 3);
  });

  test('diff array returns correctly given 3 items removed from end with old length 5', function (assert) {
    const result = diffArray([a, b, c, d, e], [a, b]);
    assert.strictEqual(result.firstChangeIndex, 2);
    assert.strictEqual(result.addedCount, 0);
    assert.strictEqual(result.removedCount, 3);
  });

  test('diff array returns correctly given one item removed from beginning with old length 2', function (assert) {
    const result = diffArray([a, b], [b]);
    assert.strictEqual(result.firstChangeIndex, 0);
    assert.strictEqual(result.addedCount, 0);
    assert.strictEqual(result.removedCount, 1);
  });

  test('diff array returns correctly given one item removed from beginning with old length 3', function (assert) {
    const result = diffArray([a, b, c], [b, c]);
    assert.strictEqual(result.firstChangeIndex, 0);
    assert.strictEqual(result.addedCount, 0);
    assert.strictEqual(result.removedCount, 1);
  });

  test('diff array returns correctly given 3 items removed from beginning with old length 4', function (assert) {
    const result = diffArray([a, b, c, d], [d]);
    assert.strictEqual(result.firstChangeIndex, 0);
    assert.strictEqual(result.addedCount, 0);
    assert.strictEqual(result.removedCount, 3);
  });

  test('diff array returns correctly given 3 items removed from beginning with old length 5', function (assert) {
    const result = diffArray([a, b, c, d, e], [d, e]);
    assert.strictEqual(result.firstChangeIndex, 0);
    assert.strictEqual(result.addedCount, 0);
    assert.strictEqual(result.removedCount, 3);
  });

  test('diff array returns correctly given one item removed from middle with old length 3', function (assert) {
    const result = diffArray([a, b, c], [a, c]);
    assert.strictEqual(result.firstChangeIndex, 1);
    assert.strictEqual(result.addedCount, 0);
    assert.strictEqual(result.removedCount, 1);
  });

  test('diff array returns correctly given one item removed from middle with old length 5', function (assert) {
    const result = diffArray([a, b, c, d, e], [a, b, d, e]);
    assert.strictEqual(result.firstChangeIndex, 2);
    assert.strictEqual(result.addedCount, 0);
    assert.strictEqual(result.removedCount, 1);
  });

  test('diff array returns correctly given 3 items removed from middle with old length 5', function (assert) {
    const result = diffArray([a, b, c, d, e], [a, e]);
    assert.strictEqual(result.firstChangeIndex, 1);
    assert.strictEqual(result.addedCount, 0);
    assert.strictEqual(result.removedCount, 3);
  });

  test('diff array returns correctly given 3 items removed from middle with old length 7', function (assert) {
    const result = diffArray([a, b, c, d, e, f, g], [a, b, f, g]);
    assert.strictEqual(result.firstChangeIndex, 2);
    assert.strictEqual(result.addedCount, 0);
    assert.strictEqual(result.removedCount, 3);
  });

  test('diff array returns correctly given one item added to middle with old length 2', function (assert) {
    const result = diffArray([a, c], [a, b, c]);
    assert.strictEqual(result.firstChangeIndex, 1);
    assert.strictEqual(result.addedCount, 1);
    assert.strictEqual(result.removedCount, 0);
  });

  test('diff array returns correctly given one item added to middle with old length 4', function (assert) {
    const result = diffArray([a, b, d, e], [a, b, c, d, e]);
    assert.strictEqual(result.firstChangeIndex, 2);
    assert.strictEqual(result.addedCount, 1);
    assert.strictEqual(result.removedCount, 0);
  });

  test('diff array returns correctly given 3 items added to middle with old length 2', function (assert) {
    const result = diffArray([a, e], [a, b, c, d, e]);
    assert.strictEqual(result.firstChangeIndex, 1);
    assert.strictEqual(result.addedCount, 3);
    assert.strictEqual(result.removedCount, 0);
  });

  test('diff array returns correctly given 3 items added to middle with old length 4', function (assert) {
    const result = diffArray([a, b, f, g], [a, b, c, d, e, f, g]);
    assert.strictEqual(result.firstChangeIndex, 2);
    assert.strictEqual(result.addedCount, 3);
    assert.strictEqual(result.removedCount, 0);
  });

  test('diff array returns correctly given complete replacement with length 1', function (assert) {
    const result = diffArray([a], [b]);
    assert.strictEqual(result.firstChangeIndex, 0);
    assert.strictEqual(result.addedCount, 1);
    assert.strictEqual(result.removedCount, 1);
  });

  test('diff array returns correctly given complete replacement with length 3', function (assert) {
    const result = diffArray([a, b, c], [x, y, z]);
    assert.strictEqual(result.firstChangeIndex, 0);
    assert.strictEqual(result.addedCount, 3);
    assert.strictEqual(result.removedCount, 3);
  });

  test('diff array returns correctly given complete replacement with longer length', function (assert) {
    const result = diffArray([a, b], [x, y, z]);
    assert.strictEqual(result.firstChangeIndex, 0);
    assert.strictEqual(result.addedCount, 3);
    assert.strictEqual(result.removedCount, 2);
  });

  test('diff array returns correctly given one item replaced in middle with old length 3', function (assert) {
    const result = diffArray([a, b, c], [a, x, c]);
    assert.strictEqual(result.firstChangeIndex, 1);
    assert.strictEqual(result.addedCount, 1);
    assert.strictEqual(result.removedCount, 1);
  });

  test('diff array returns correctly given one item replaced in middle with old length 5', function (assert) {
    const result = diffArray([a, b, c, d, e], [a, b, x, d, e]);
    assert.strictEqual(result.firstChangeIndex, 2);
    assert.strictEqual(result.addedCount, 1);
    assert.strictEqual(result.removedCount, 1);
  });

  test('diff array returns correctly given 3 items replaced in middle with old length 5', function (assert) {
    const result = diffArray([a, b, c, d, e], [a, x, y, z, e]);
    assert.strictEqual(result.firstChangeIndex, 1);
    assert.strictEqual(result.addedCount, 3);
    assert.strictEqual(result.removedCount, 3);
  });

  test('diff array returns correctly given 3 items replaced in middle with old length 7', function (assert) {
    const result = diffArray([a, b, c, d, e, f, g], [a, b, x, y, z, f, g]);
    assert.strictEqual(result.firstChangeIndex, 2);
    assert.strictEqual(result.addedCount, 3);
    assert.strictEqual(result.removedCount, 3);
  });

  test('diff array returns correctly given one item replaced at beginning with old length 2', function (assert) {
    const result = diffArray([a, b], [x, b]);
    assert.strictEqual(result.firstChangeIndex, 0);
    assert.strictEqual(result.addedCount, 1);
    assert.strictEqual(result.removedCount, 1);
  });

  test('diff array returns correctly given one item replaced at beginning with old length 3', function (assert) {
    const result = diffArray([a, b, c], [x, b, c]);
    assert.strictEqual(result.firstChangeIndex, 0);
    assert.strictEqual(result.addedCount, 1);
    assert.strictEqual(result.removedCount, 1);
  });

  test('diff array returns correctly given 3 items replaced at beginning with old length 4', function (assert) {
    const result = diffArray([a, b, c, d], [x, y, z, d]);
    assert.strictEqual(result.firstChangeIndex, 0);
    assert.strictEqual(result.addedCount, 3);
    assert.strictEqual(result.removedCount, 3);
  });

  test('diff array returns correctly given 3 items replaced at beginning with old length 6', function (assert) {
    const result = diffArray([a, b, c, d, e, f], [x, y, z, d, e, f]);
    assert.strictEqual(result.firstChangeIndex, 0);
    assert.strictEqual(result.addedCount, 3);
    assert.strictEqual(result.removedCount, 3);
  });

  test('diff array returns correctly given one item replaced at end with old length 2', function (assert) {
    const result = diffArray([a, b], [a, x]);
    assert.strictEqual(result.firstChangeIndex, 1);
    assert.strictEqual(result.addedCount, 1);
    assert.strictEqual(result.removedCount, 1);
  });

  test('diff array returns correctly given one item replaced at end with old length 3', function (assert) {
    const result = diffArray([a, b, c], [a, b, x]);
    assert.strictEqual(result.firstChangeIndex, 2);
    assert.strictEqual(result.addedCount, 1);
    assert.strictEqual(result.removedCount, 1);
  });

  test('diff array returns correctly given 3 items replaced at end with old length 4', function (assert) {
    const result = diffArray([a, b, c, d], [a, x, y, z]);
    assert.strictEqual(result.firstChangeIndex, 1);
    assert.strictEqual(result.addedCount, 3);
    assert.strictEqual(result.removedCount, 3);
  });

  test('diff array returns correctly given 3 items replaced at end with old length 6', function (assert) {
    const result = diffArray([a, b, c, d, e, f], [a, b, c, x, y, z]);
    assert.strictEqual(result.firstChangeIndex, 3);
    assert.strictEqual(result.addedCount, 3);
    assert.strictEqual(result.removedCount, 3);
  });

  test('diff array returns correctly given one item replaced with two in middle with old length 3', function (assert) {
    const result = diffArray([a, b, c], [a, x, y, c]);
    assert.strictEqual(result.firstChangeIndex, 1);
    assert.strictEqual(result.addedCount, 2);
    assert.strictEqual(result.removedCount, 1);
  });

  test('diff array returns correctly given one item replaced with two in middle with old length 5', function (assert) {
    const result = diffArray([a, b, c, d, e], [a, b, x, y, d, e]);
    assert.strictEqual(result.firstChangeIndex, 2);
    assert.strictEqual(result.addedCount, 2);
    assert.strictEqual(result.removedCount, 1);
  });

  test('diff array returns correctly given 3 items replaced with 4 in middle with old length 5', function (assert) {
    const result = diffArray([a, b, c, d, e], [a, w, x, y, z, e]);
    assert.strictEqual(result.firstChangeIndex, 1);
    assert.strictEqual(result.addedCount, 4);
    assert.strictEqual(result.removedCount, 3);
  });

  test('diff array returns correctly given 3 items replaced with 4 in middle with old length 7', function (assert) {
    const result = diffArray([a, b, c, d, e, f, g], [a, b, w, x, y, z, f, g]);
    assert.strictEqual(result.firstChangeIndex, 2);
    assert.strictEqual(result.addedCount, 4);
    assert.strictEqual(result.removedCount, 3);
  });

  test('diff array returns correctly given one item replaced with two at beginning with old length 2', function (assert) {
    const result = diffArray([a, b], [x, y, b]);
    assert.strictEqual(result.firstChangeIndex, 0);
    assert.strictEqual(result.addedCount, 2);
    assert.strictEqual(result.removedCount, 1);
  });

  test('diff array returns correctly given one item replaced with two at beginning with old length 3', function (assert) {
    const result = diffArray([a, b, c], [x, y, b, c]);
    assert.strictEqual(result.firstChangeIndex, 0);
    assert.strictEqual(result.addedCount, 2);
    assert.strictEqual(result.removedCount, 1);
  });

  test('diff array returns correctly given 3 items replaced with 4 at beginning with old length 4', function (assert) {
    const result = diffArray([a, b, c, d], [w, x, y, z, d]);
    assert.strictEqual(result.firstChangeIndex, 0);
    assert.strictEqual(result.addedCount, 4);
    assert.strictEqual(result.removedCount, 3);
  });

  test('diff array returns correctly given 3 items replaced with 4 at beginning with old length 6', function (assert) {
    const result = diffArray([a, b, c, d, e, f], [w, x, y, z, d, e, f]);
    assert.strictEqual(result.firstChangeIndex, 0);
    assert.strictEqual(result.addedCount, 4);
    assert.strictEqual(result.removedCount, 3);
  });

  test('diff array returns correctly given one item replaced with two at end with old length 2', function (assert) {
    const result = diffArray([a, b], [a, x, y]);
    assert.strictEqual(result.firstChangeIndex, 1);
    assert.strictEqual(result.addedCount, 2);
    assert.strictEqual(result.removedCount, 1);
  });

  test('diff array returns correctly given one item replaced with two at end with old length 3', function (assert) {
    const result = diffArray([a, b, c], [a, b, x, y]);
    assert.strictEqual(result.firstChangeIndex, 2);
    assert.strictEqual(result.addedCount, 2);
    assert.strictEqual(result.removedCount, 1);
  });

  test('diff array returns correctly given 3 items replaced with 4 at end with old length 4', function (assert) {
    const result = diffArray([a, b, c, d], [a, w, x, y, z]);
    assert.strictEqual(result.firstChangeIndex, 1);
    assert.strictEqual(result.addedCount, 4);
    assert.strictEqual(result.removedCount, 3);
  });

  test('diff array returns correctly given 3 items replaced with 4 at end with old length 6', function (assert) {
    const result = diffArray([a, b, c, d, e, f], [a, b, c, w, x, y, z]);
    assert.strictEqual(result.firstChangeIndex, 3);
    assert.strictEqual(result.addedCount, 4);
    assert.strictEqual(result.removedCount, 3);
  });

  test('diff array returns correctly given two items replaced with one in middle with old length 4', function (assert) {
    const result = diffArray([a, b, c, d], [a, x, d]);
    assert.strictEqual(result.firstChangeIndex, 1);
    assert.strictEqual(result.addedCount, 1);
    assert.strictEqual(result.removedCount, 2);
  });

  test('diff array returns correctly given two items replaced with one in middle with old length 6', function (assert) {
    const result = diffArray([a, b, c, d, e, f], [a, b, x, e, f]);
    assert.strictEqual(result.firstChangeIndex, 2);
    assert.strictEqual(result.addedCount, 1);
    assert.strictEqual(result.removedCount, 2);
  });

  test('diff array returns correctly given 4 items replaced with 3 in middle with old length 6', function (assert) {
    const result = diffArray([a, b, c, d, e, f], [a, x, y, z, f]);
    assert.strictEqual(result.firstChangeIndex, 1);
    assert.strictEqual(result.addedCount, 3);
    assert.strictEqual(result.removedCount, 4);
  });

  test('diff array returns correctly given 4 items replaced with 3 in middle with old length 8', function (assert) {
    const result = diffArray([a, b, c, d, e, f, g, h], [a, b, x, y, z, g, h]);
    assert.strictEqual(result.firstChangeIndex, 2);
    assert.strictEqual(result.addedCount, 3);
    assert.strictEqual(result.removedCount, 4);
  });

  test('diff array returns correctly given two items replaced with one at beginning with old length 3', function (assert) {
    const result = diffArray([a, b, c], [x, c]);
    assert.strictEqual(result.firstChangeIndex, 0);
    assert.strictEqual(result.addedCount, 1);
    assert.strictEqual(result.removedCount, 2);
  });

  test('diff array returns correctly given two items replaced with one at beginning with old length 4', function (assert) {
    const result = diffArray([a, b, c, d], [x, c, d]);
    assert.strictEqual(result.firstChangeIndex, 0);
    assert.strictEqual(result.addedCount, 1);
    assert.strictEqual(result.removedCount, 2);
  });

  test('diff array returns correctly given 4 items replaced with 3 at beginning with old length 5', function (assert) {
    const result = diffArray([a, b, c, d, e], [x, y, z, e]);
    assert.strictEqual(result.firstChangeIndex, 0);
    assert.strictEqual(result.addedCount, 3);
    assert.strictEqual(result.removedCount, 4);
  });

  test('diff array returns correctly given 4 items replaced with 3 at beginning with old length 6', function (assert) {
    const result = diffArray([a, b, c, d, e, f], [x, y, z, e, f]);
    assert.strictEqual(result.firstChangeIndex, 0);
    assert.strictEqual(result.addedCount, 3);
    assert.strictEqual(result.removedCount, 4);
  });

  test('diff array returns correctly given two items replaced with one at end with old length 3', function (assert) {
    const result = diffArray([a, b, c], [a, x]);
    assert.strictEqual(result.firstChangeIndex, 1);
    assert.strictEqual(result.addedCount, 1);
    assert.strictEqual(result.removedCount, 2);
  });

  test('diff array returns correctly given two items replaced with one at end with old length 4', function (assert) {
    const result = diffArray([a, b, c, d], [a, b, x]);
    assert.strictEqual(result.firstChangeIndex, 2);
    assert.strictEqual(result.addedCount, 1);
    assert.strictEqual(result.removedCount, 2);
  });

  test('diff array returns correctly given 4 items replaced with 3 at end with old length 5', function (assert) {
    const result = diffArray([a, b, c, d, e], [a, x, y, z]);
    assert.strictEqual(result.firstChangeIndex, 1);
    assert.strictEqual(result.addedCount, 3);
    assert.strictEqual(result.removedCount, 4);
  });

  test('diff array returns correctly given 4 items replaced with 3 at end with old length 6', function (assert) {
    const result = diffArray([a, b, c, d, e, f], [a, b, x, y, z]);
    assert.strictEqual(result.firstChangeIndex, 2);
    assert.strictEqual(result.addedCount, 3);
    assert.strictEqual(result.removedCount, 4);
  });

  test('diff array returns correctly given non-contiguous insertion', function (assert) {
    const result = diffArray([a, c, e], [a, b, c, d, e]);
    assert.strictEqual(result.firstChangeIndex, 1);
    assert.strictEqual(result.addedCount, 3);
    assert.strictEqual(result.removedCount, 1);
  });
});
