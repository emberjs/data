var Adapter, adapter, store, serializer;

module("Record Attribute Transforms", {
  setup: function() {
    Adapter = DS.Adapter.extend();

    Adapter.registerTransform('unobtainium', {
      toJSON: function(value) {
        return 'toJSON';
      },

      fromJSON: function(value) {
        return 'fromJSON';
      }
    });

    adapter = Adapter.create();
    store = DS.Store.create({
      adapter: adapter
    });
    serializer = adapter.get('serializer');
  },

  teardown: function() {
    serializer.destroy();
    adapter.destroy();
    store.destroy();
  }
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
