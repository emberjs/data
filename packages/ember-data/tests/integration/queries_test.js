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

test("When a query is made, the adapter should receive a record array it can populate with the results of the query.", function() {
  expect(7);

  adapter.findQuery = function(store, type, query, recordArray) {
    equal(type, Person, "the find method is called with the correct type");

    stop();

    // Simulate latency to ensure correct behavior in asynchronous conditions.
    // Once 100ms has passed, load the results of the query into the record array.
    setTimeout(function() {
      recordArray.load([{ id: 1, name: "Peter Wagenet" }, { id: 2, name: "Brohuda Katz" }]);
    }, 100);
  };

  var queryResults = store.find(Person, { page: 1 });
  equal(get(queryResults, 'length'), 0, "the record array has a length of zero before the results are loaded");
  equal(get(queryResults, 'isLoaded'), false, "the record array's `isLoaded` property is false");

  queryResults.one('didLoad', function() {
    start();

    equal(get(queryResults, 'length'), 2, "the record array has a length of 2 after the results are loaded");
    equal(get(queryResults, 'isLoaded'), true, "the record array's `isLoaded` property should be true");

    equal(queryResults.objectAt(0).get('name'), "Peter Wagenet", "the first record is 'Peter Wagenet'");
    equal(queryResults.objectAt(1).get('name'), "Brohuda Katz", "the second record is 'Brohuda Katz'");
  });
});
