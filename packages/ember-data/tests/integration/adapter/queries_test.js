var get = Ember.get;
var Person, env, store, adapter;
var run = Ember.run;

module("integration/adapter/queries - Queries", {
  setup: function() {
    Person = DS.Model.extend({
      updatedAt: DS.attr('string'),
      name: DS.attr('string'),
      firstName: DS.attr('string'),
      lastName: DS.attr('string')
    });

    env = setupStore({ person: Person });
    store = env.store;
    adapter = env.adapter;
  },

  teardown: function() {
    run(env.container, 'destroy');
  }
});

test("When a query is made, the adapter should receive a record array it can populate with the results of the query.", function() {
  adapter.findQuery = function(store, type, query, recordArray) {
    equal(type, Person, "the find method is called with the correct type");

    return Ember.RSVP.resolve([{ id: 1, name: "Peter Wagenet" }, { id: 2, name: "Brohuda Katz" }]);
  };

  store.find('person', { page: 1 }).then(async(function(queryResults) {
    equal(get(queryResults, 'length'), 2, "the record array has a length of 2 after the results are loaded");
    equal(get(queryResults, 'isLoaded'), true, "the record array's `isLoaded` property should be true");

    equal(queryResults.objectAt(0).get('name'), "Peter Wagenet", "the first record is 'Peter Wagenet'");
    equal(queryResults.objectAt(1).get('name'), "Brohuda Katz", "the second record is 'Brohuda Katz'");
  }));
});
