import DS from 'ember-data';

module("unit/transform - DS.BooleanTransform");

test("#serialize", function() {
  var transform = new DS.BooleanTransform();

  equal(transform.serialize(null), false);
  equal(transform.serialize(undefined), false);

  equal(transform.serialize(true), true);
  equal(transform.serialize(false), false);
});

test("#deserialize", function() {
  var transform = new DS.BooleanTransform();

  equal(transform.deserialize(null), false);
  equal(transform.deserialize(undefined), false);

  equal(transform.deserialize(true), true);
  equal(transform.deserialize(false), false);

  equal(transform.deserialize("true"), true);
  equal(transform.deserialize("TRUE"), true);
  equal(transform.deserialize("false"), false);
  equal(transform.deserialize("FALSE"), false);

  equal(transform.deserialize("t"), true);
  equal(transform.deserialize("T"), true);
  equal(transform.deserialize("f"), false);
  equal(transform.deserialize("F"), false);

  equal(transform.deserialize("1"), true);
  equal(transform.deserialize("0"), false);

  equal(transform.deserialize(1), true);
  equal(transform.deserialize(2), false);
  equal(transform.deserialize(0), false);
});
