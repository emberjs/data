import DS from 'ember-data';

import { module, test } from 'qunit';

module('unit/transform - DS.BooleanTransform');

test("#serialize", function(assert) {
  let transform = new DS.BooleanTransform();

  assert.equal(transform.serialize(null, { allowNull: true }), null);
  assert.equal(transform.serialize(undefined, { allowNull: true }), null);

  assert.equal(transform.serialize(null, { allowNull: false }), false);
  assert.equal(transform.serialize(undefined, { allowNull: false }), false);

  assert.equal(transform.serialize(null, {}), false);
  assert.equal(transform.serialize(undefined, {}), false);

  assert.equal(transform.serialize(true), true);
  assert.equal(transform.serialize(false), false);
});

test('#deserialize', function(assert) {
  let transform = new DS.BooleanTransform();

  assert.equal(transform.deserialize(null, { allowNull: true }), null);
  assert.equal(transform.deserialize(undefined, { allowNull: true }), null);

  assert.equal(transform.deserialize(null, { allowNull: false }), false);
  assert.equal(transform.deserialize(undefined, { allowNull: false }), false);

  assert.equal(transform.deserialize(null, {}), false);
  assert.equal(transform.deserialize(undefined, {}), false);

  assert.equal(transform.deserialize(true), true);
  assert.equal(transform.deserialize(false), false);

  assert.equal(transform.deserialize('true'), true);
  assert.equal(transform.deserialize('TRUE'), true);
  assert.equal(transform.deserialize('false'), false);
  assert.equal(transform.deserialize('FALSE'), false);

  assert.equal(transform.deserialize('t'), true);
  assert.equal(transform.deserialize('T'), true);
  assert.equal(transform.deserialize('f'), false);
  assert.equal(transform.deserialize('F'), false);

  assert.equal(transform.deserialize('1'), true);
  assert.equal(transform.deserialize('0'), false);

  assert.equal(transform.deserialize(1), true);
  assert.equal(transform.deserialize(2), false);
  assert.equal(transform.deserialize(0), false);
});
