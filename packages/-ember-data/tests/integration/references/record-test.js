import { get } from '@ember/object';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { defer, resolve } from 'rsvp';

import DS from 'ember-data';
import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import { recordIdentifierFor } from '@ember-data/store';

module('integration/references/record', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const Person = DS.Model.extend({
      name: DS.attr(),
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', JSONAPIAdapter.extend());
    this.owner.register('serializer:application', JSONAPISerializer.extend());
  });

  test('a RecordReference can be retrieved via store.getReference(type, id)', function (assert) {
    let store = this.owner.lookup('service:store');
    let recordReference = store.getReference('person', 1);

    assert.equal(recordReference.remoteType(), 'identity');
    assert.equal(recordReference.type, 'person');
    assert.equal(recordReference.id(), 1);
  });

  test('a RecordReference can be retrieved via store.getReference(identifier) without local state', function (assert) {
    let store = this.owner.lookup('service:store');
    let recordReference = store.getReference({ type: 'person', id: 1 });

    assert.equal(recordReference.remoteType(), 'identity');
    assert.equal(recordReference.type, 'person');
    assert.equal(recordReference.id(), 1);
  });

  [
    { type: 'person', id: '1', lid: 'person:1', desc: 'type, id and lid' },
    { type: 'person', lid: 'TODO', desc: 'type and lid' },
    { type: 'person', id: '1', lid: 'TODO', desc: 'type, id, and existing lid' },
    { type: 'person', id: null, lid: 'TODO', desc: 'type, null id, and existing lid' },
  ].forEach(({ type, id, lid, desc }) => {
    test(`a RecordReference can be retrieved with ${desc}`, function (assert) {
      let store = this.owner.lookup('service:store');
      const person = store.push({
        data: {
          type: 'person',
          id: 1,
          attributes: {
            name: 'le name',
          },
        },
      });

      let allArgs = { type, id, lid };
      let referenceArgs = {};
      Object.keys(allArgs).forEach((key) => {
        if (typeof allArgs[key] !== 'undefined') {
          referenceArgs[key] = allArgs[key];
        }

        if (key === 'lid' && lid === 'TODO') {
          referenceArgs[key] = recordIdentifierFor(person).lid;
        }
      });

      let recordReference = store.getReference(referenceArgs);

      assert.equal(recordReference.remoteType(), 'identity');
      assert.equal(recordReference.type, 'person');
      assert.equal(recordReference.id(), 1);
    });
  });

  test('push(object)', async function (assert) {
    let store = this.owner.lookup('service:store');
    let Person = store.modelFor('person');

    let recordReference = store.getReference('person', 1);

    const pushed = recordReference.push({
      data: {
        type: 'person',
        id: 1,
        attributes: {
          name: 'le name',
        },
      },
    });

    assert.ok(pushed.then, 'RecordReference.push returns a promise');

    let record = await pushed;
    assert.ok(record instanceof Person, 'push resolves with the record');
    assert.equal(get(record, 'name'), 'le name');
  });

  test('push(promise)', async function (assert) {
    let store = this.owner.lookup('service:store');
    let Person = store.modelFor('person');

    var deferred = defer();
    var recordReference = store.getReference('person', 1);

    let pushed = recordReference.push(deferred.promise);

    assert.ok(pushed.then, 'RecordReference.push returns a promise');

    deferred.resolve({
      data: {
        type: 'person',
        id: 1,
        attributes: {
          name: 'le name',
        },
      },
    });

    let record = await pushed;
    assert.ok(record instanceof Person, 'push resolves with the record');
    assert.equal(get(record, 'name'), 'le name', 'name is updated');
  });

  test('value() returns null when not yet loaded', function (assert) {
    let store = this.owner.lookup('service:store');
    let recordReference = store.getReference('person', 1);
    assert.strictEqual(recordReference.value(), null);
  });

  test('value() returns the record when loaded', function (assert) {
    let store = this.owner.lookup('service:store');

    var person;
    run(function () {
      person = store.push({
        data: {
          type: 'person',
          id: 1,
        },
      });
    });

    var recordReference = store.getReference('person', 1);
    assert.equal(recordReference.value(), person);
  });

  test('load() fetches the record', function (assert) {
    var done = assert.async();

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id) {
      return resolve({
        data: {
          id: 1,
          type: 'person',
          attributes: {
            name: 'Vito',
          },
        },
      });
    };

    var recordReference = store.getReference('person', 1);

    run(function () {
      recordReference.load().then(function (record) {
        assert.equal(get(record, 'name'), 'Vito');
        done();
      });
    });
  });

  test('load() only a single find is triggered', function (assert) {
    var done = assert.async();

    var deferred = defer();
    var count = 0;

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldReloadRecord = function () {
      return false;
    };
    adapter.shouldBackgroundReloadRecord = function () {
      return false;
    };
    adapter.findRecord = function (store, type, id) {
      count++;
      assert.equal(count, 1);

      return deferred.promise;
    };

    var recordReference = store.getReference('person', 1);

    run(function () {
      recordReference.load();
      recordReference.load().then(function (record) {
        assert.equal(get(record, 'name'), 'Vito');
      });
    });

    run(function () {
      deferred.resolve({
        data: {
          id: 1,
          type: 'person',
          attributes: {
            name: 'Vito',
          },
        },
      });
    });

    run(function () {
      recordReference.load().then(function (record) {
        assert.equal(get(record, 'name'), 'Vito');

        done();
      });
    });
  });

  test('reload() loads the record if not yet loaded', function (assert) {
    var done = assert.async();

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    var count = 0;
    adapter.findRecord = function (store, type, id) {
      count++;
      assert.equal(count, 1);

      return resolve({
        data: {
          id: 1,
          type: 'person',
          attributes: {
            name: 'Vito Coreleone',
          },
        },
      });
    };

    var recordReference = store.getReference('person', 1);

    run(function () {
      recordReference.reload().then(function (record) {
        assert.equal(get(record, 'name'), 'Vito Coreleone');

        done();
      });
    });
  });

  test('reload() fetches the record', function (assert) {
    var done = assert.async();

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id) {
      return resolve({
        data: {
          id: 1,
          type: 'person',
          attributes: {
            name: 'Vito Coreleone',
          },
        },
      });
    };

    run(function () {
      store.push({
        data: {
          type: 'person',
          id: 1,
          attributes: {
            name: 'Vito',
          },
        },
      });
    });

    var recordReference = store.getReference('person', 1);

    run(function () {
      recordReference.reload().then(function (record) {
        assert.equal(get(record, 'name'), 'Vito Coreleone');

        done();
      });
    });
  });
});
