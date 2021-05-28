import { get } from '@ember/object';
import { assign } from '@ember/polyfills';
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
    { withType: true, withId: true, withLid: true, desc: 'type, id and lid' },
    { withType: true, withLid: true, desc: 'type and lid' },
    { withType: true, withLid: true, isCreate: true, desc: 'type and lid via store.createRecord (no local id)' },
    {
      withType: true,
      withLid: true,
      isCreate: true,
      fromCache: true,
      desc: 'type and lid from cache via store.createRecord (no local id)',
    },
    { withType: true, withLid: true, fromCache: true, desc: 'type and lid from cache' },
    { withType: true, withId: true, withLid: true, fromCache: true, desc: 'type, id and lid from cache' },
    { withType: true, withLid: true, exta: { id: null }, desc: 'type, null id, and lid' },
    {
      withType: true,
      withLid: true,
      exta: { id: null },
      isCreate: true,
      desc: 'type, null id, and lid via store.createRecord',
    },
  ].forEach(({ withType, withId, withLid, extra, isCreate, fromCache, desc }) => {
    test(`a RecordReference can be retrieved with ${desc}`, function (assert) {
      let store = this.owner.lookup('service:store');
      let person;
      if (isCreate) {
        person = store.createRecord('person');
      } else {
        person = store.push({
          data: {
            type: 'person',
            id: '1',
            attributes: {
              name: 'le name',
            },
          },
        });
      }

      const getReferenceArgs = Object.create(null);
      if (withType) {
        getReferenceArgs.type = 'person';
      }
      if (withId && !isCreate) {
        getReferenceArgs.id = '1';
      }
      if (withLid) {
        if (fromCache) {
          // create the identifier without creating a record
          const identifier = store.identifierCache.getOrCreateRecordIdentifier(getReferenceArgs);
          getReferenceArgs.lid = identifier.lid;
        } else {
          getReferenceArgs.lid = recordIdentifierFor(person).lid;
        }
      }
      if (extra) {
        assign(getReferenceArgs, extra);
      }

      let recordReference = store.getReference(getReferenceArgs);

      assert.equal(recordReference.remoteType(), 'identity');
      assert.equal(recordReference.type, 'person');
      if (isCreate || (fromCache && !withId)) {
        assert.equal(recordReference.id(), null);
      } else {
        assert.equal(recordReference.id(), 1);
      }
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
