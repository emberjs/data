import DS from 'ember-data';

import { module, test } from 'qunit';

module('unit/transform - DS.NumberTransform');

test('#serialize', function(assert) {
  let transform = new DS.NumberTransform();

  assert.equal(transform.serialize(null), null);
  assert.equal(transform.serialize(undefined), null);
  assert.equal(transform.serialize("1.1"), 1.1);
  assert.equal(transform.serialize(1.1), 1.1);
  assert.equal(transform.serialize(new Number(1.1)), 1.1);
  assert.equal(transform.serialize(NaN), null);
  assert.equal(transform.serialize(Infinity), null);
  assert.equal(transform.serialize(-Infinity), null);
});

test('#deserialize', function(assert) {
  let transform = new DS.NumberTransform();

  assert.equal(transform.deserialize(null), null);
  assert.equal(transform.deserialize(undefined), null);
  assert.equal(transform.deserialize('1.1'), 1.1);
  assert.equal(transform.deserialize(1.1), 1.1);
  assert.equal(transform.deserialize(new Number(1.1)), 1.1);
  assert.equal(transform.deserialize(NaN), null);
  assert.equal(transform.deserialize(Infinity), null);
  assert.equal(transform.deserialize(-Infinity), null);
});
