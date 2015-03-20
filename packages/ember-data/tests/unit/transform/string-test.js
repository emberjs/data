module("unit/transform - DS.StringTransform");

test("#serialize", function() {
  var transform = new DS.StringTransform();

  equal(transform.serialize(null), null);
  equal(transform.serialize(undefined), null);

  equal(transform.serialize("foo"), "foo");
  equal(transform.serialize(1), "1");
});

test("#deserialize", function() {
  var transform = new DS.StringTransform();

  equal(transform.deserialize(null), null);
  equal(transform.deserialize(undefined), null);

  equal(transform.deserialize("foo"), "foo");
  equal(transform.deserialize(1), "1");
});
