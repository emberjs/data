module("unit/transform - DS.DateTransform");

var dateString = "2015-01-01T00:00:00.000Z";
var dateStringNoTz = "2015-01-01";
var localNewYear = new Date(2015, 0, 1).toISOString();
var dateInMillis = Ember.Date.parse(dateString);
var date = new Date(dateInMillis);

test("#serialize", function() {
  var transform = new DS.DateTransform();

  equal(transform.serialize(null),      null);
  equal(transform.serialize(undefined), null);

  equal(transform.serialize(date), dateString);
});

test("#deserialize", function() {
  var transform = new DS.DateTransform();

  // from String
  equal(transform.deserialize(dateString).toISOString(),        dateString);

  equal(transform.deserialize(dateStringNoTz).toISOString(),    localNewYear);

  // from Number
  equal(transform.deserialize(dateInMillis).valueOf(),          dateInMillis);

  // from other
  equal(transform.deserialize({}),                              null);

  // from none
  equal(transform.deserialize(null),                            null);
  equal(transform.deserialize(undefined),                       null);
});
