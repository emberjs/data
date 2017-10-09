import { defer, resolve } from 'rsvp';
import { run } from '@ember/runloop';
import { get } from '@ember/object';
import DS from 'ember-data';
import setupStore from 'dummy/tests/helpers/store';
import { module, test } from 'qunit';

var env, Person;

module("integration/references/record", {
  beforeEach() {
    Person = DS.Model.extend({
      name: DS.attr()
    });

    env = setupStore({
      person: Person
    });
  },

  afterEach() {
    run(env.store, 'unloadAll');
    run(env.container, 'destroy');
  }
});

test("a RecordReference can be retrieved via store.getReference(type, id)", function(assert) {
  var recordReference = env.store.getReference('person', 1);

  assert.equal(recordReference.remoteType(), 'identity');
  assert.equal(recordReference.type, 'person');
  assert.equal(recordReference.id(), 1);
});

test("push(object)", function(assert) {
  var done = assert.async();

  var push;
  var recordReference = env.store.getReference('person', 1);

  run(function() {
    push = recordReference.push({
      data: {
        type: 'person',
        id: 1,
        attributes: {
          name: "le name"
        }
      }
    });
  });

  assert.ok(push.then, 'RecordReference.push returns a promise');

  run(function() {
    push.then(function(record) {
      assert.ok(record instanceof Person, "push resolves with the record");
      assert.equal(get(record, 'name'), "le name");

      done();
    });
  });
});

test("push(promise)", function(assert) {
  var done = assert.async();

  var push;
  var deferred = defer();
  var recordReference = env.store.getReference('person', 1);

  run(function() {
    push = recordReference.push(deferred.promise);
  });

  assert.ok(push.then, 'RecordReference.push returns a promise');

  run(function() {
    deferred.resolve({
      data: {
        type: 'person',
        id: 1,
        attributes: {
          name: "le name"
        }
      }
    });
  });

  run(function() {
    push.then(function(record) {
      assert.ok(record instanceof Person, "push resolves with the record");
      assert.equal(get(record, 'name'), "le name", "name is updated");

      done();
    });
  });
});

test("value() returns null when not yet loaded", function(assert) {
  var recordReference = env.store.getReference('person', 1);
  assert.equal(recordReference.value(), null);
});

test("value() returns the record when loaded", function(assert) {
  var person;
  run(function() {
    person = env.store.push({
      data: {
        type: 'person',
        id: 1
      }
    });
  });

  var recordReference = env.store.getReference('person', 1);
  assert.equal(recordReference.value(), person);
});

test("load() fetches the record", function(assert) {
  var done = assert.async();

  env.adapter.findRecord = function(store, type, id) {
    return resolve({
      data: {
        id: 1,
        type: 'person',
        attributes: {
          name: 'Vito'
        }
      }
    });
  };

  var recordReference = env.store.getReference('person', 1);

  run(function() {
    recordReference.load().then(function(record) {
      assert.equal(get(record, 'name'), "Vito");
      done();
    });
  });
});

test("load() only a single find is triggered", function(assert) {
  var done = assert.async();

  var deferred = defer();
  var count = 0;

  env.adapter.shouldReloadRecord = function() { return false; };
  env.adapter.shouldBackgroundReloadRecord = function() { return false; };
  env.adapter.findRecord = function(store, type, id) {
    count++;
    assert.equal(count, 1);

    return deferred.promise;
  };

  var recordReference = env.store.getReference('person', 1);

  run(function() {
    recordReference.load();
    recordReference.load().then(function(record) {
      assert.equal(get(record, 'name'), "Vito");
    });
  });

  run(function() {
    deferred.resolve({
      data: {
        id: 1,
        type: 'person',
        attributes: {
          name: 'Vito'
        }
      }
    });
  });

  run(function() {
    recordReference.load().then(function(record) {
      assert.equal(get(record, 'name'), "Vito");

      done();
    });
  });
});

test("reload() loads the record if not yet loaded", function(assert) {
  var done = assert.async();

  var count = 0;
  env.adapter.findRecord = function(store, type, id) {
    count++;
    assert.equal(count, 1);

    return resolve({
      data: {
        id: 1,
        type: 'person',
        attributes: {
          name: 'Vito Coreleone'
        }
      }
    });
  };

  var recordReference = env.store.getReference('person', 1);

  run(function() {
    recordReference.reload().then(function(record) {
      assert.equal(get(record, 'name'), "Vito Coreleone");

      done();
    });
  });
});

test("reload() fetches the record", function(assert) {
  var done = assert.async();

  env.adapter.findRecord = function(store, type, id) {
    return resolve({
      data: {
        id: 1,
        type: 'person',
        attributes: {
          name: 'Vito Coreleone'
        }
      }
    });
  };

  run(function() {
    env.store.push({
      data: {
        type: 'person',
        id: 1,
        attributes: {
          name: 'Vito'
        }
      }
    });
  });

  var recordReference = env.store.getReference('person', 1);

  run(function() {
    recordReference.reload().then(function(record) {
      assert.equal(get(record, 'name'), "Vito Coreleone");

      done();
    });
  });
});
