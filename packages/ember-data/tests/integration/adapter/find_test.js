var get = Ember.get, set = Ember.set;
var Person, store, adapter;

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
    store.destroy();
  }
});

test("When a single record is requested, the adapter's find method should be called unless it's loaded.", function() {
  expect(2);

  var count = 0;

  store = createStore({ adapter: DS.Adapter.extend({
      find: function(store, type, id) {
        equal(type, Person, "the find method is called with the correct type");
        equal(count, 0, "the find method is only called once");

        count++;
        return { id: 1, name: "Braaaahm Dale" };
      }
    })
  });

  store.find(Person, 1);
  store.find(Person, 1);
});

test("When a single record is requested multiple times, all .find() calls are resolved after the promise is resolved", function() {
  var deferred = Ember.RSVP.defer();

  store = createStore({ adapter: DS.Adapter.extend({
      find:  function(store, type, id) {
        return deferred.promise;
      },
    })
  });

  store.find(Person, 1).then(async(function(person) {
    equal(person.get('id'), "1");
    equal(person.get('name'), "Braaaahm Dale");
    equal(deferred.promise.isFulfilled, true);
  }));

  store.find(Person, 1).then(async(function(post) {
    equal(post.get('id'), "1");
    equal(post.get('name'), "Braaaahm Dale");
    equal(deferred.promise.isFulfilled, true);
  }));

  Ember.run(function() {
    deferred.resolve({ id: 1, name: "Braaaahm Dale" });
  });
});

test("When a single record is requested, and the promise is rejected, .find() is rejected.", function() {
  var count = 0;

  store = createStore({ adapter: DS.Adapter.extend({
      find: function(store, type, id) {
        return Ember.RSVP.reject();
      }
    })
  });

  store.find(Person, 1).then(null, async(function(reason) {
    ok(true, "The rejection handler was called");
  }));
});
