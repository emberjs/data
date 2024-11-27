import { get } from '@ember/object';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr } from '@ember-data/model';
import { createDeferred } from '@ember-data/request';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import { recordIdentifierFor } from '@ember-data/store';

module('integration/references/record', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const Person = Model.extend({
      name: attr(),
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', JSONAPIAdapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  test('a RecordReference can be retrieved via store.getReference(type, id)', function (assert) {
    const store = this.owner.lookup('service:store');
    const recordReference = store.getReference('person', 1);

    assert.strictEqual(recordReference.remoteType(), 'identity');
    assert.strictEqual(recordReference.type, 'person');
    assert.strictEqual(recordReference.id(), '1');
  });

  test('a RecordReference can be retrieved via store.getReference(identifier) without local state', function (assert) {
    const store = this.owner.lookup('service:store');
    const recordReference = store.getReference({ type: 'person', id: '1' });

    assert.strictEqual(recordReference.remoteType(), 'identity');
    assert.strictEqual(recordReference.type, 'person');
    assert.strictEqual(recordReference.id(), '1');
  });

  [
    { withType: true, withId: true, withLid: true, desc: 'type, id and lid' },
    { withType: true, withLid: true, desc: 'type and lid' },
    { withType: true, withLid: true, isCreate: true, desc: 'type and lid via store.createRecord (no local id)' },
  ].forEach(({ withType, withId, withLid, isCreate, desc }) => {
    test(`a RecordReference can be retrieved with ${desc}`, function (assert) {
      const store = this.owner.lookup('service:store');
      let person;
      if (isCreate) {
        // no id
        person = store.createRecord('person');
      }

      const getReferenceArgs = Object.create(null);
      if (withType) {
        getReferenceArgs.type = 'person';
      }
      if (withId && !isCreate) {
        getReferenceArgs.id = '1';
      }
      if (withLid) {
        if (!isCreate) {
          // create the identifier instead of getting it via store record cache
          const identifier = store.identifierCache.getOrCreateRecordIdentifier(getReferenceArgs);
          getReferenceArgs.lid = identifier.lid;
        } else {
          getReferenceArgs.lid = recordIdentifierFor(person).lid;
        }
      }

      const recordReference = store.getReference(getReferenceArgs);

      assert.strictEqual(recordReference.remoteType(), 'identity');
      assert.strictEqual(recordReference.type, 'person');
      if (isCreate || !withId) {
        assert.strictEqual(recordReference.id(), null);
      } else {
        assert.strictEqual(recordReference.id(), '1');
      }
    });
  });

  test('push(object)', async function (assert) {
    const store = this.owner.lookup('service:store');
    const Person = store.modelFor('person');

    const recordReference = store.getReference('person', 1);

    const pushed = recordReference.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'le name',
        },
      },
    });

    assert.ok(pushed.then, 'RecordReference.push returns a promise');

    const record = await pushed;
    assert.ok(record instanceof Person, 'push resolves with the record');
    assert.strictEqual(get(record, 'name'), 'le name');
  });

  test('push(promise)', async function (assert) {
    const store = this.owner.lookup('service:store');
    const Person = store.modelFor('person');

    const deferred = createDeferred();
    const recordReference = store.getReference('person', 1);

    const pushed = recordReference.push(deferred.promise);

    assert.ok(pushed.then, 'RecordReference.push returns a promise');

    deferred.resolve({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'le name',
        },
      },
    });

    const record = await pushed;
    assert.ok(record instanceof Person, 'push resolves with the record');
    assert.strictEqual(get(record, 'name'), 'le name', 'name is updated');
  });

  test('value() returns null when not yet loaded', function (assert) {
    const store = this.owner.lookup('service:store');
    const recordReference = store.getReference('person', 1);
    assert.strictEqual(recordReference.value(), null);
  });

  test('value() returns the record when loaded', async function (assert) {
    const store = this.owner.lookup('service:store');

    const person = store.push({
      data: {
        type: 'person',
        id: '1',
      },
    });

    const recordReference = store.getReference('person', 1);
    assert.strictEqual(recordReference.value(), person);
  });

  test('load() fetches the record', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id) {
      return Promise.resolve({
        data: {
          id: '1',
          type: 'person',
          attributes: {
            name: 'Vito',
          },
        },
      });
    };

    const recordReference = store.getReference('person', 1);

    const record = await recordReference.load();
    assert.strictEqual(get(record, 'name'), 'Vito');
  });

  test('load() only a single find is triggered', async function (assert) {
    assert.expect(3);
    let resolveRequest;
    const deferred = new Promise((resolve) => {
      resolveRequest = resolve;
    });
    let count = 0;

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    adapter.shouldReloadRecord = function () {
      return false;
    };
    adapter.shouldBackgroundReloadRecord = function () {
      return false;
    };
    adapter.findRecord = function (store, type, id) {
      count++;
      assert.strictEqual(count, 1, 'we requested findRecord once');

      return deferred;
    };

    const recordReference = store.getReference('person', 1);

    recordReference.load(); // first trigger
    const recordPromise = recordReference.load(); // second trigger
    resolveRequest({
      data: {
        id: '1',
        type: 'person',
        attributes: {
          name: 'Vito',
        },
      },
    });
    let record = await recordPromise;
    assert.strictEqual(get(record, 'name'), 'Vito');

    record = await recordReference.load(); // third trigger
    assert.strictEqual(get(record, 'name'), 'Vito');
  });

  test('reload() loads the record if not yet loaded', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    let count = 0;
    adapter.findRecord = function (store, type, id) {
      count++;
      assert.strictEqual(count, 1);

      return Promise.resolve({
        data: {
          id: '1',
          type: 'person',
          attributes: {
            name: 'Vito Coreleone',
          },
        },
      });
    };

    const recordReference = store.getReference('person', 1);

    const record = await recordReference.reload();
    assert.strictEqual(get(record, 'name'), 'Vito Coreleone');
  });

  test('reload() fetches the record', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id) {
      return Promise.resolve({
        data: {
          id: '1',
          type: 'person',
          attributes: {
            name: 'Vito Coreleone',
          },
        },
      });
    };

    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Vito',
        },
      },
    });

    const recordReference = store.getReference('person', 1);

    const record = await recordReference.reload();
    assert.strictEqual(get(record, 'name'), 'Vito Coreleone');
  });
});
