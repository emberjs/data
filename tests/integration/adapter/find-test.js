import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var Person, store, env;
var run = Ember.run;

module("integration/adapter/find - Finding Records", {
  beforeEach: function() {
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

  afterEach: function() {
    run(store, 'destroy');
  }
});

test("It raises an assertion when `undefined` is passed as id (#1705)", function(assert) {
  assert.expectAssertion(function() {
    store.find('person', undefined);
  }, "You cannot pass `undefined` as id to the store's find method");

  assert.expectAssertion(function() {
    store.find('person', null);
  }, "You cannot pass `null` as id to the store's find method");
});

test("When a single record is requested, the adapter's find method should be called unless it's loaded.", function(assert) {
  assert.expect(2);

  var count = 0;

  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord: function(store, type, id, snapshot) {
      assert.equal(type, Person, "the find method is called with the correct type");
      assert.equal(count, 0, "the find method is only called once");

      count++;
      return { id: 1, name: "Braaaahm Dale" };
    }
  }));

  run(function() {
    store.findRecord('person', 1);
    store.findRecord('person', 1);
  });
});

test("When a single record is requested multiple times, all .find() calls are resolved after the promise is resolved", function(assert) {
  var deferred = Ember.RSVP.defer();

  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord: function(store, type, id, snapshot) {
      return deferred.promise;
    }
  }));

  run(function() {
    store.findRecord('person', 1).then(assert.wait(function(person) {
      assert.equal(person.get('id'), "1");
      assert.equal(person.get('name'), "Braaaahm Dale");

      let done = assert.async();
      deferred.promise.then(function(value) {
        assert.ok(true, 'expected deferred.promise to fulfill');
        done();
      }, function(reason) {
        assert.ok(false, 'expected deferred.promise to fulfill, but rejected');
        done();
      });
    }));
  });

  run(function() {
    store.findRecord('person', 1).then(assert.wait(function(post) {
      assert.equal(post.get('id'), "1");
      assert.equal(post.get('name'), "Braaaahm Dale");

      let done = assert.async();
      deferred.promise.then(function(value) {
        assert.ok(true, 'expected deferred.promise to fulfill');
        done();
      }, function(reason) {
        assert.ok(false, 'expected deferred.promise to fulfill, but rejected');
        done();
      });

    }));
  });

  Ember.run(function() {
    deferred.resolve({ id: 1, name: "Braaaahm Dale" });
  });
});

test("When a single record is requested, and the promise is rejected, .find() is rejected.", function(assert) {
  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord: function(store, type, id, snapshot) {
      return Ember.RSVP.reject();
    }
  }));

  run(function() {
    store.findRecord('person', 1).then(null, assert.wait(function(reason) {
      assert.ok(true, "The rejection handler was called");
    }));
  });
});

test("When a single record is requested, and the promise is rejected, the record should be unloaded.", function(assert) {
  assert.expect(2);

  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord: function(store, type, id, snapshot) {
      return Ember.RSVP.reject();
    }
  }));

  run(function() {
    store.findRecord('person', 1).then(null, assert.wait(function(reason) {
      assert.ok(true, "The rejection handler was called");
      assert.ok(!store.hasRecordForId('person', 1), "The record has been unloaded");
    }));
  });

});

test('When a single record is requested, and the payload is blank', (assert) => {
  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord: () => Ember.RSVP.resolve({})
  }));

  assert.expectAssertion(() => {
    run(() => store.find('person', 'the-id'));
  }, /the adapter's response did not have any data/);
});

test('When multiple records are requested, and the payload is blank', (assert) => {
  env.registry.register('adapter:person', DS.Adapter.extend({
    coalesceFindRequests: true,
    findMany: () => Ember.RSVP.resolve({})
  }));

  assert.expectAssertion(() => {
    run(() => {
      store.findRecord('person', '1');
      store.findRecord('person', '2');
    });
  }, /the adapter's response did not have any data/);
});
