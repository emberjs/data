var store, serializer;

module("Record Attribute Transforms", {
  setup: function() {
    store = DS.Store.create();

    store.registerTransform('unobtainium', {
      toJSON: function(value) {
        return 'toJSON';
      },

      fromJSON: function(value) {
        return 'fromJSON';
      }
    });

    serializer = store.getPath('_adapter.serializer');
  },

  teardown: function() {
    //serializer.destroy();
    store.destroy();
  }
});

test("registered transformations should be called when serializing and materializing records", function() {
  var value;

  value = serializer.transformValueFromJSON('unknown', 'unobtainium');
  equal(value, 'fromJSON', "the fromJSON transform was called");

  value = serializer.transformValueToJSON('unknown', 'unobtainium');
  equal(value, 'toJSON', "the toJSON transform was called");

  raises(function() {
    serializer.transformValueFromJSON('unknown', 'obtainium');
  });

  raises(function() {
    serializer.transformValueToJSON('unknown', 'obtainium');
  });
});

test("transformed values should be materialized on the record", function() {
  var Person = DS.Model.extend({
    name: DS.attr('unobtainium')
  });

  store.load(Person, { id: 1, name: "James Cameron" });

  var person = store.find(Person, 1);
  equal(person.get('name'), 'fromJSON', "value of attribute on the record should be transformed");

  var json = store.toJSON(person);
  equal(json.name, "toJSON", "value of attribute in the JSON hash should be transformed");
});
