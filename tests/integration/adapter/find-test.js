import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';
import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {module, test} from 'qunit';
import DS from 'ember-data';

const { run } = Ember;
const { attr } = DS;
const { reject, Promise } = Ember.RSVP;

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

testInDebug("It raises an assertion when `undefined` is passed as id (#1705)", function(assert) {
  assert.expectAssertion(() => {
    store.find('person', undefined);
  }, `You cannot pass 'undefined' as id to the store's find method`);

  assert.expectAssertion(() => {
    store.find('person', null);
  }, `You cannot pass 'null' as id to the store's find method`);
});

test("When a single record is requested, the adapter's find method should be called unless it's loaded.", function(assert) {
  assert.expect(2);

  let count = 0;

  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord(_, type) {
      assert.equal(type, Person, "the find method is called with the correct type");
      assert.equal(count, 0, "the find method is only called once");

      count++;
      return {
        data: {
          id: 1,
          type: "person",
          attributes: {
            name: "Braaaahm Dale"
          }
        }
      };
    }
  }));

  run(() => {
    store.findRecord('person', 1);
    store.findRecord('person', 1);
  });
});

test("When a single record is requested multiple times, all .findRecord() calls are resolved after the promise is resolved", function(assert) {
  let deferred = Ember.RSVP.defer();

  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord() {
      return deferred.promise;
    }
  }));

  let requestOne = run(() => {
    return store.findRecord('person', 1).then(person => {
      assert.equal(person.get('id'), "1");
      assert.equal(person.get('name'), "Braaaahm Dale");
    });
  });

  let requestTwo = run(() => {
    return store.findRecord('person', 1).then(post => {
      assert.equal(post.get('id'), "1");
      assert.equal(post.get('name'), "Braaaahm Dale");
    });
  });

  run(() => {
    deferred.resolve({
      data: {
        id: 1,
        type: "person",
        attributes: {
          name: "Braaaahm Dale"
        }
      }
    });
  });

  return Promise.all([
    requestOne,
    requestTwo
  ])
});

test("When a single record is requested, and the promise is rejected, .findRecord() is rejected.", function(assert) {
  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord() {
      return reject();
    }
  }));

  return run(() => {
    return store.findRecord('person', 1).catch(() => {
      assert.ok(true, 'The rejection handler was called');
    });
  });
});

test("When a single record is requested, and the promise is rejected, the record should be unloaded.", function(assert) {
  assert.expect(2);

  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord() {
      return reject();
    }
  }));

  return run(() => {
    return store.findRecord('person', 1).catch(reason => {
      assert.ok(true, "The rejection handler was called");
      assert.ok(!store.hasRecordForId('person', 1), "The record has been unloaded");
    });
  });
});

testInDebug('When a single record is requested, and the payload is blank', function(assert) {
  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord: () => Ember.RSVP.resolve({})
  }));

  assert.expectAssertion(() => {
    run(() => store.findRecord('person', 'the-id'));
  }, /You made a 'findRecord' request for a 'person' with id 'the-id', but the adapter's response did not have any data/);
});

testInDebug('When multiple records are requested, and the payload is blank', function(assert) {
  env.registry.register('adapter:person', DS.Adapter.extend({
    coalesceFindRequests: true,
    findMany: () => Ember.RSVP.resolve({})
  }));

  assert.expectAssertion(() => {
    run(() => {
      store.findRecord('person', '1');
      store.findRecord('person', '2');
    });
  }, /You made a 'findMany' request for 'person' records with ids '\[1,2\]', but the adapter's response did not have any data/);
});

testInDebug("warns when returned record has different id", function(assert) {
  env.registry.register('adapter:person', DS.Adapter.extend({
    findRecord() {
      return {
        data: {
          id: 1,
          type: "person",
          attributes: {
            name: "Braaaahm Dale"
          }
        }
      };
    }
  }));

  assert.expectWarning(/You requested a record of type 'person' with id 'me' but the adapter returned a payload with primary data having an id of '1'/);

  return run(() => env.store.findRecord('person', 'me'));
});
