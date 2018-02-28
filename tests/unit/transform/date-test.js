import { module, test } from 'qunit';

import DS from 'ember-data';

module('unit/transform - DS.DateTransform');

let dateString = '2015-01-01T00:00:00.000Z';
let dateInMillis = Date.parse(dateString);
let date = new Date(dateString);

test('#serialize', function(assert) {
  let transform = new DS.DateTransform();

  assert.strictEqual(transform.serialize(null), null);
  assert.strictEqual(transform.serialize(undefined), null);
  assert.strictEqual(transform.serialize(new Date('invalid')), null);

  assert.equal(transform.serialize(date), dateString);
});

test('#deserialize', function(assert) {
  let transform = new DS.DateTransform();

  // from String
  assert.equal(transform.deserialize(dateString).toISOString(), dateString);

  // from Number
  assert.equal(transform.deserialize(dateInMillis).valueOf(), dateInMillis);

  // from other
  assert.strictEqual(transform.deserialize({}), null);

  // from none
  assert.strictEqual(transform.deserialize(null), null);
  assert.strictEqual(transform.deserialize(undefined), undefined);
});
