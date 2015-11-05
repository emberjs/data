/* jshint -W053 */

module("unit/transform - DS.NumberTransform");

test("#serialize", function() {
  var transform = new DS.NumberTransform();

  equal(transform.serialize(null), null);
  equal(transform.serialize(undefined), null);
  equal(transform.serialize("1.1"), 1.1);
  equal(transform.serialize(1.1), 1.1);
  equal(transform.serialize(new Number(1.1)), 1.1);
  equal(transform.serialize(NaN), null);
  equal(transform.serialize(Infinity), null);
  equal(transform.serialize(-Infinity), null);
});

test("#deserialize", function() {
  var transform = new DS.NumberTransform();

  equal(transform.deserialize(null), null);
  equal(transform.deserialize(undefined), null);
  equal(transform.deserialize("1.1"), 1.1);
  equal(transform.deserialize(1.1), 1.1);
  equal(transform.deserialize(new Number(1.1)), 1.1);
  equal(transform.deserialize(NaN), null);
  equal(transform.deserialize(Infinity), null);
  equal(transform.deserialize(-Infinity), null);
});
