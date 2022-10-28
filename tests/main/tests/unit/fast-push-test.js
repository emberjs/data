import { module, test } from 'qunit';

import { fastPush } from '@ember-data/store/-private';

const SLICE_BATCH_SIZE = 1200;

module('unit | fast-push', function () {
  test('works as expected with 0 elements', function (assert) {
    const target = [];
    const source = Object.freeze([]);

    fastPush(target, source);

    assert.strictEqual(target.length, 0, 'no elements are in the array');
  });

  test('works as expected with < SLICE_BATCH_SIZE elements', function (assert) {
    const target = [];
    const source = Object.freeze([1, 2, 3, 4]);

    fastPush(target, source);

    assert.strictEqual(target.length, 4, 'four elements are in the array');
    assert.deepEqual(target, source, 'the arrays are copies');
  });

  test('works as expected with === SLICE_BATCH_SIZE elements', function (assert) {
    const target = [];
    const source = Object.freeze(new Array(SLICE_BATCH_SIZE).fill(0).map((v, i) => i));

    fastPush(target, source);

    assert.strictEqual(target.length, SLICE_BATCH_SIZE, `${SLICE_BATCH_SIZE} elements are in the array`);
    assert.deepEqual(target, source, 'the arrays are copies');
  });

  test('works as expected with > SLICE_BATCH_SIZE elements', function (assert) {
    const target = [];
    const source = Object.freeze(new Array(SLICE_BATCH_SIZE + 1).fill(0).map((v, i) => i));

    fastPush(target, source);

    assert.strictEqual(target.length, SLICE_BATCH_SIZE + 1, `${SLICE_BATCH_SIZE + 1} elements are in the array`);
    assert.deepEqual(target, source, 'the arrays are copies');
  });

  test('works as expected with 2*SLICE_BATCH_SIZE elements', function (assert) {
    const target = [];
    const source = Object.freeze(new Array(SLICE_BATCH_SIZE * 2).fill(0).map((v, i) => i));

    fastPush(target, source);

    assert.strictEqual(target.length, SLICE_BATCH_SIZE * 2, `${SLICE_BATCH_SIZE * 2} elements are in the array`);
    assert.deepEqual(target, source, 'the arrays are copies');
  });

  test('works as expected with > 2*SLICE_BATCH_SIZE elements', function (assert) {
    const target = [];
    const source = Object.freeze(new Array(SLICE_BATCH_SIZE * 2 + 1).fill(0).map((v, i) => i));

    fastPush(target, source);

    assert.strictEqual(
      target.length,
      SLICE_BATCH_SIZE * 2 + 1,
      `${SLICE_BATCH_SIZE * 2 + 1} elements are in the array`
    );
    assert.deepEqual(target, source, 'the arrays are copies');
  });
});
