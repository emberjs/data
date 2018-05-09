import DS from 'ember-data';

import { module, test } from 'qunit';

module('unit/transform - DS.NumberTransform');

test('#serialize', function(assert) {
  let transform = new DS.NumberTransform();

  assert.strictEqual(transform.serialize(null), null);
  assert.strictEqual(transform.serialize(undefined), null);
  assert.equal(transform.serialize('1.1'), 1.1);
  assert.equal(transform.serialize(1.1), 1.1);
  assert.equal(transform.serialize(new Number(1.1)), 1.1);
  assert.strictEqual(transform.serialize(NaN), null);
  assert.strictEqual(transform.serialize(Infinity), null);
  assert.strictEqual(transform.serialize(-Infinity), null);
});

test('#deserialize', function(assert) {
  let transform = new DS.NumberTransform();

  assert.strictEqual(transform.deserialize(null), null);
  assert.strictEqual(transform.deserialize(undefined), null);
  assert.equal(transform.deserialize('1.1'), 1.1);
  assert.equal(transform.deserialize(1.1), 1.1);
  assert.equal(transform.deserialize(new Number(1.1)), 1.1);
  assert.strictEqual(transform.deserialize(NaN), null);
  assert.strictEqual(transform.deserialize(Infinity), null);
  assert.strictEqual(transform.deserialize(-Infinity), null);
});
