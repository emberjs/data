var Person, store, env;
var run = Ember.run;

module("integration/store/query-record - Query one record with a query object", {
  setup: function() {
    Person = DS.Model.extend({
      updatedAt: DS.attr('string'),
      name: DS.attr('string'),
      firstName: DS.attr('string'),
      lastName: DS.attr('string')
    });

    env = setupStore({
      person: Person
    });
    store = env.store;
  },

  teardown: function() {
    run(store, 'destroy');
  }
});

test("It raises an assertion when no type is passed", function() {
  expectAssertion(function() {
    store.queryRecord();
  }, "You need to pass a type to the store's queryRecord method");
});

test("It raises a deprecation when the query is not namespaced in a object", function() {
  env.registry.register('adapter:person', DS.Adapter.extend({
    queryRecord: function() {
      return Ember.RSVP.resolve({ id: 1 });
    }
  }));

  expectDeprecation(function() {
    run(function() {
      store.queryRecord('person', { withRelated: 'posts' });
    });
  }, "You need to pass a query object in the options object of the store's queryRecord method");
});

test("When a record is requested, the adapter's queryRecord method should be called.", function() {
  expect(1);

  env.registry.register('adapter:person', DS.Adapter.extend({
    queryRecord: function(store, type, query) {
      equal(type, Person, "the query method is called with the correct type");
      return Ember.RSVP.resolve({ id: 1, name: "Peter Wagenet" });
    }
  }));

  run(function() {
    store.queryRecord('person', { query: { related: 'posts' } });
  });
});

test("When a record is requested, and the promise is rejected, .queryRecord() is rejected.", function() {
  env.registry.register('adapter:person', DS.Adapter.extend({
    queryRecord: function(store, type, query) {
      return Ember.RSVP.reject();
    }
  }));

  run(function() {
    store.queryRecord('person', { query : {} }).then(null, async(function(reason) {
      ok(true, "The rejection handler was called");
    }));
  });
});

test("When a record is requested, the serializer's normalizeQueryRecordResponse method should be called.", function() {
  expect(1);

  env.registry.register('serializer:person', DS.JSONAPISerializer.extend({
    normalizeQueryRecordResponse: function(store, primaryModelClass, payload, id, requestType) {
      equal(payload.data.id , '1', "the normalizeQueryRecordResponse method was called with the right payload");
      return this._super(...arguments);
    }
  }));

  env.registry.register('adapter:person', DS.Adapter.extend({
    queryRecord: function(store, type, query) {
      return Ember.RSVP.resolve({
        data: {
          id: '1',
          type: 'person',
          attributes: {
            name: "Peter Wagenet"
          }
        }
      });
    }
  }));

  run(function() {
    store.queryRecord('person', { query: { related: 'posts' } });
  });
});
