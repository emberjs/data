import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';
import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {module, test} from 'qunit';
import DS from 'ember-data';

const { run } = Ember;
const { attr } = DS;
const { reject } = Ember.RSVP;

let Person, store, env;

module("integration/adapter/find - Finding Records", {
  beforeEach() {
    Person = DS.Model.extend({
      updatedAt: attr('string'),
      name: attr('string'),
      firstName: attr('string'),
      lastName: attr('string')
    });

    env = setupStore({
      person: Person
    });
    store = env.store;
  },

  afterEach() {
    run(store, 'destroy');
  }
});

testInDebug("It raises an assertion when `undefined` is passed as id (#1705)", (assert) => {
  assert.expectAssertion(() => {
    store.find('person', undefined);
  }, `You cannot pass 'undefined' as id to the store's find method`);

  assert.expectAssertion(() => {
    store.find('person', null);
  }, `You cannot pass 'null' as id to the store's find method`);
});

test("When a single record is requested, the adapter's find method should be called unless it's loaded.", (assert) => {
  assert.expect(2);

  var count = 0;

  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord(_, type) {
      assert.equal(type, Person, "the find method is called with the correct type");
      assert.equal(count, 0, "the find method is only called once");

      count++;
      return { id: 1, name: "Braaaahm Dale" };
    }
  }));

  run(() => {
    store.findRecord('person', 1);
    store.findRecord('person', 1);
  });
});

test("When a single record is requested multiple times, all .findRecord() calls are resolved after the promise is resolved", (assert) => {
  var deferred = Ember.RSVP.defer();

  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord: () => deferred.promise
  }));

  run(() => {
    store.findRecord('person', 1).then(assert.wait(function(person) {
      assert.equal(person.get('id'), "1");
      assert.equal(person.get('name'), "Braaaahm Dale");

      let done = assert.async();
      deferred.promise.then(() => {
        assert.ok(true, 'expected deferred.promise to fulfill');
        done();
      }, () => {
        assert.ok(false, 'expected deferred.promise to fulfill, but rejected');
        done();
      });
    }));
  });

  run(() => {
    store.findRecord('person', 1).then(assert.wait((post) => {
      assert.equal(post.get('id'), "1");
      assert.equal(post.get('name'), "Braaaahm Dale");

      let done = assert.async();
      deferred.promise.then(() => {
        assert.ok(true, 'expected deferred.promise to fulfill');
        done();
      }, () => {
        assert.ok(false, 'expected deferred.promise to fulfill, but rejected');
        done();
      });

    }));
  });

  run(() => deferred.resolve({ id: 1, name: "Braaaahm Dale" }));
});

test("When a single record is requested, and the promise is rejected, .findRecord() is rejected.", (assert) => {
  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord: () => reject()
  }));

  run(() => {
    store.findRecord('person', 1).then(null, assert.wait(() => {
      assert.ok(true, "The rejection handler was called");
    }));
  });
});

test("When a single record is requested, and the promise is rejected, the record should be unloaded.", (assert) => {
  assert.expect(2);

  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord: () => reject()
  }));

  run(() => {
    store.findRecord('person', 1).then(null, assert.wait((reason) => {
      assert.ok(true, "The rejection handler was called");
      assert.ok(!store.hasRecordForId('person', 1), "The record has been unloaded");
    }));
  });
});

testInDebug('When a single record is requested, and the payload is blank', (assert) => {
  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord: () => Ember.RSVP.resolve({})
  }));

  assert.expectAssertion(() => {
    run(() => store.findRecord('person', 'the-id'));
  }, /You made a `findRecord` request for a person with id the-id, but the adapter's response did not have any data/);
});

testInDebug('When multiple records are requested, and the payload is blank', (assert) => {
  env.registry.register('adapter:person', DS.Adapter.extend({
    coalesceFindRequests: true,
    findMany: () => Ember.RSVP.resolve({})
  }));

  assert.expectAssertion(() => {
    run(() => {
      store.findRecord('person', '1');
      store.findRecord('person', '2');
    });
  }, /You made a `findMany` request for person records with ids 1,2, but the adapter's response did not have any data/);
});

testInDebug("warns when returned record has different id", function(assert) {
  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord() {
      return { id: 1, name: "Braaaahm Dale" };
    }
  }));

  assert.expectWarning(/You requested a record of type 'person' with id 'me' but the adapter returned a payload with primary data having an id of '1'/);

  run(function() {
    env.store.findRecord('person', 'me');
  });
});
