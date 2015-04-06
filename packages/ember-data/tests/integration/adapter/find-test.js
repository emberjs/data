var Person, store;
var run = Ember.run;

module("integration/adapter/find - Finding Records", {
  setup: function() {
    Person = DS.Model.extend({
      updatedAt: DS.attr('string'),
      name: DS.attr('string'),
      firstName: DS.attr('string'),
      lastName: DS.attr('string')
    });
  },

  teardown: function() {
    run(store, 'destroy');
  }
});

test("It raises an assertion when no type is passed", function() {
  store = createStore();

  expectAssertion(function() {
    store.find();
  }, "You need to pass a type to the store's find method");
});

test("It raises an assertion when `undefined` is passed as id (#1705)", function() {
  store = createStore();

  expectAssertion(function() {
    store.find(Person, undefined);
  }, "You may not pass `undefined` as id to the store's find method");

  expectAssertion(function() {
    store.find(Person, null);
  }, "You may not pass `null` as id to the store's find method");
});

test("When a single record is requested, the adapter's find method should be called unless it's loaded.", function() {
  expect(2);

  var count = 0;

  store = createStore({ adapter: DS.Adapter.extend({
      find: function(store, type, id, snapshot) {
        equal(type, Person, "the find method is called with the correct type");
        equal(count, 0, "the find method is only called once");

        count++;
        return { id: 1, name: "Braaaahm Dale" };
      }
    })
  });

  run(function() {
    store.find(Person, 1);
    store.find(Person, 1);
  });
});

test("When a single record is requested multiple times, all .find() calls are resolved after the promise is resolved", function() {
  var deferred = Ember.RSVP.defer();

  store = createStore({ adapter: DS.Adapter.extend({
      find: function(store, type, id, snapshot) {
        return deferred.promise;
      }
    })
  });

  run(function() {
    store.find(Person, 1).then(async(function(person) {
      equal(person.get('id'), "1");
      equal(person.get('name'), "Braaaahm Dale");

      stop();
      deferred.promise.then(function(value) {
        start();
        ok(true, 'expected deferred.promise to fulfill');
      }, function(reason) {
        start();
        ok(false, 'expected deferred.promise to fulfill, but rejected');
      });
    }));
  });

  run(function() {
    store.find(Person, 1).then(async(function(post) {
      equal(post.get('id'), "1");
      equal(post.get('name'), "Braaaahm Dale");

      stop();
      deferred.promise.then(function(value) {
        start();
        ok(true, 'expected deferred.promise to fulfill');
      }, function(reason) {
        start();
        ok(false, 'expected deferred.promise to fulfill, but rejected');
      });

    }));
  });

  Ember.run(function() {
    deferred.resolve({ id: 1, name: "Braaaahm Dale" });
  });
});

test("When a single record is requested, and the promise is rejected, .find() is rejected.", function() {
  store = createStore({ adapter: DS.Adapter.extend({
      find: function(store, type, id, snapshot) {
        return Ember.RSVP.reject();
      }
    })
  });

  run(function() {
    store.find(Person, 1).then(null, async(function(reason) {
      ok(true, "The rejection handler was called");
    }));
  });
});

test("When a single record is requested, and the promise is rejected, the record should be unloaded.", function() {
  expect(2);

  store = createStore({ adapter: DS.Adapter.extend({
      find: function(store, type, id, snapshot) {
        return Ember.RSVP.reject();
      }
    })
  });

  run(function() {
    store.find(Person, 1).then(null, async(function(reason) {
      ok(true, "The rejection handler was called");
    }));
  });

  ok(!store.hasRecordForId(Person, 1), "The record has been unloaded");
});
