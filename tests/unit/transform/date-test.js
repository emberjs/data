import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

module("unit/transform - DS.DateTransform");

var dateString = "2015-01-01T00:00:00.000Z";
var dateInMillis = Ember.Date.parse(dateString);
var date = new Date(dateInMillis);

test("#serialize", function(assert) {
  var transform = new DS.DateTransform();

  assert.equal(transform.serialize(null), null);
  assert.equal(transform.serialize(undefined), null);

  assert.equal(transform.serialize(date), dateString);

  assert.equal(transform.serialize('2015-01-01'), '2015-01-01');
});

test("#deserialize", function(assert) {
  var transform = new DS.DateTransform();

  // from String
  assert.equal(transform.deserialize(dateString).toISOString(), dateString);

  // from Number
  assert.equal(transform.deserialize(dateInMillis).valueOf(), dateInMillis);

  // from other
  assert.equal(transform.deserialize({}), null);

  // from none
  assert.equal(transform.deserialize(null), null);
  assert.equal(transform.deserialize(undefined), null);
});
