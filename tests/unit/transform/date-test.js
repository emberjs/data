import Ember from 'ember';

import DS from 'ember-data';

module("unit/transform - DS.DateTransform");

var dateString = "2015-01-01T00:00:00.000Z";
var dateInMillis = Ember.Date.parse(dateString);
var date = new Date(dateInMillis);

test("#serialize", function() {
  var transform = new DS.DateTransform();

  equal(transform.serialize(null), null);
  equal(transform.serialize(undefined), null);

  equal(transform.serialize(date), dateString);
});

test("#deserialize", function() {
  var transform = new DS.DateTransform();

  // from String
  equal(transform.deserialize(dateString).toISOString(), dateString);

  // from Number
  equal(transform.deserialize(dateInMillis).valueOf(), dateInMillis);

  // from other
  equal(transform.deserialize({}), null);

  // from none
  equal(transform.deserialize(null), null);
  equal(transform.deserialize(undefined), null);
});
