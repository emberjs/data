import DS from 'ember-data';

import {module, test} from 'qunit';

module('unit/transform - DS.StringTransform');

test('#serialize', function(assert) {
  let transform = new DS.StringTransform();

  assert.equal(transform.serialize(null), null);
  assert.equal(transform.serialize(undefined), null);

  assert.equal(transform.serialize('foo'), 'foo');
  assert.equal(transform.serialize(1), '1');
});

test('#deserialize', function(assert) {
  let transform = new DS.StringTransform();

  assert.equal(transform.deserialize(null), null);
  assert.equal(transform.deserialize(undefined), null);

  assert.equal(transform.deserialize('foo'), 'foo');
  assert.equal(transform.deserialize(1), '1');
});
