var get = Ember.get, set = Ember.set;
var Person, store, adapter;

module("Finding Records", {
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

test("When a single record is requested, the adapter's find method should be called unless it's loaded.", function() {
  expect(2);

  var count = 0;

  adapter.find = function(store, type, id) {
    equal(type, Person, "the find method is called with the correct type");
    equal(count, 0, "the find method is only called once");

    store.load(type, id, { id: 1, name: "Braaaahm Dale" });

    count++;
  };

  store.find(Person, 1);
  store.find(Person, 1);
});

test("When a record is requested but has not yet been loaded, its `id` property should be the ID used to request the record.", function() {
  adapter.find = Ember.K;

  var record = store.find(Person, 1);
  equal(get(record, 'id'), 1, "should report its id while loading");
});

test("When multiple records are requested, the adapter's `findMany` method should be called.", function() {
  expect(1);

  adapter.findMany = function(store, type, ids) {
    deepEqual(ids, ['1','2','3'], "ids are passed");
  };

  store.findMany(Person, [1,2,3]);
  store.findMany(Person, [1,2,3]);
});

test("When multiple records are requested, the default adapter should call the `find` method once per record if findMany is not implemented", function() {
  expect(3);

  var count = 0;
  adapter.find = function(store, type, id) {
    count++;

    equal(id, count);
  };

  store.findMany(Person, [1,2,3]);
  store.findMany(Person, [1,2,3]);
});

test("When multiple records are requested, the store should not call findMany on the adapter if all the requested records are already loaded.", function() {
  expect(0);

  adapter.find = function(store, type, id) {
    ok(false, "This should not be called");
  };

  store.load(Person, { id: 1 });
  store.findMany(Person, [ 1 ]);
});
