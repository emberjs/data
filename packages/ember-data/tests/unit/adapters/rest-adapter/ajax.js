var Person, Place, store, adapter, env;
var run = Ember.run;

module("integration/adapter/ajax - building requests", {
  setup: function() {
    Person = { typeKey: 'person' };
    Place = { typeKey: 'place' };
    env = setupStore({ adapter: DS.RESTAdapter, person: Person, place: Place });
    store = env.store;
    adapter = env.adapter;
  },

  teardown: function() {
    run(function() {
      store.destroy();
      env.container.destroy();
    });
  }
});

test("When an id is searched, the correct url should be generated", function() {
  expect(2);
  var count = 0;
  adapter.ajax = function(url, method) {
    if (count === 0) { equal(url, '/people/1', "should create the correct url"); }
    if (count === 1) { equal(url, '/places/1', "should create the correct url"); }
    count++;
    return Ember.RSVP.resolve();
  };
  run(function() {
    adapter.find(store, Person, 1);
    adapter.find(store, Place, 1);
  });
});
test("id's should be sanatized", function() {
  expect(1);
  adapter.ajax= function(url, method) {
    equal(url, '/people/..%2Fplace%2F1', "should create the correct url");
    return Ember.RSVP.resolve();
  };
  run(function() {
    adapter.find(store, Person, '../place/1');
  });
});
