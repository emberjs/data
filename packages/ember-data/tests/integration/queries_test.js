var get = Ember.get, set = Ember.set;
var Person, store, adapter;

module("Queries", {
  setup: function() {
    Person = DS.Model.extend({
      updatedAt: DS.attr('string'),
      name: DS.attr('string'),
      firstName: DS.attr('string'),
      lastName: DS.attr('string')
    });

    adapter = DS.Adapter.create();
    store = DS.Store.create({ adapter: adapter });
  },

  teardown: function() {
    adapter.destroy();
    store.destroy();
  }
});

test("when many records are requested with query parameters, the adapter's findQuery method is called", function() {
  expect(6);
  adapter.findQuery = function(store, type, query, recordArray) {
    equal(type, Person, "the find method is called with the correct type");

    stop();

    setTimeout(function() {
      recordArray.load([{ id: 1, name: "Peter Wagenet" }, { id: 2, name: "Brohuda Katz" }]);
      start();
    }, 100);
  };

  var array = store.find(Person, { page: 1 });
  equal(get(array, 'length'), 0, "The array is 0 length do far");

  array.addArrayObserver(this, {
    willChange: function(target, start, removed, added) {
      equal(removed, 0, "0 items are being removed");
    },

    didChange: function(target, start, removed, added) {
      equal(added, 2, "2 items are being added");

      equal(get(array, 'length'), 2, "The array is now populated");
      equal(get(array.objectAt(0), 'name'), "Peter Wagenet", "The array is populated correctly");
    }
  });
});
