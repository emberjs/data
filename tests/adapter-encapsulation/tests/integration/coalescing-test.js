import EmberObject from '@ember/object';

import Store from 'adapter-encapsulation-test-app/services/store';
import { module, test } from 'qunit';
import { all, resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import { recordIdentifierFor } from '@ember-data/store';
import deepCopy from '@ember-data/unpublished-test-infra/test-support/deep-copy';

class MinimalSerializer extends EmberObject {
  normalizeResponse(_, __, data) {
    return data;
  }

  serialize(snapshot) {
    return {
      data: {
        id: snapshot.id,
        type: snapshot.modelName,
        attributes: snapshot.attributes(),
      },
    };
  }
}

class Person extends Model {
  @attr
  firstName;

  @attr
  lastName;
}

module('integration/coalescing - Coalescing Tests', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('service:store', Store);
    this.owner.register('serializer:application', MinimalSerializer);
    this.owner.register('model:person', Person);
  });

  test('coalesceFindRequests is true and findMany is not defined', async function (assert) {
    let findRecordCalled = 0;

    let expectedResults = [
      {
        data: {
          id: '12',
          type: 'person',
          attributes: {
            firstName: 'Gaurav',
            lastName: 'Munjal',
          },
        },
      },
      {
        data: {
          id: '19',
          type: 'person',
          attributes: {
            firstName: 'Chris',
            lastName: 'Thoburn',
          },
        },
      },
    ];

    let { owner } = this;
    let store = owner.lookup('service:store');

    // This code is a workaround for issue https://github.com/emberjs/data/issues/6758
    // expectedResult is mutated during store.findRecord
    // to add the lid
    let expectedResultsCopy = deepCopy(expectedResults);

    class TestFindRecordAdapter extends EmberObject {
      coalesceFindRequests = true;

      findRecord(passedStore, type, id, snapshot) {
        assert.strictEqual(passedStore, store, 'instance of store is passed to findRecord');
        assert.strictEqual(type, Person, 'model is passed to findRecord');

        let expectedId = expectedResultsCopy[findRecordCalled].data.id;
        assert.strictEqual(id, expectedId, 'id is passed to findRecord');

        assert.strictEqual(snapshot.modelName, 'person', 'snapshot is passed to findRecord with correct modelName');
        assert.strictEqual(snapshot.id, expectedId, 'snapshot is passed to findRecord with correct id');

        return resolve(expectedResultsCopy[findRecordCalled++]);
      }
    }

    owner.register('adapter:application', TestFindRecordAdapter);

    let promises = expectedResults.map((result) => result.data.id).map((id) => store.findRecord('person', id));
    let records = await all(promises);

    let serializedRecords = records.map((record) => record.serialize());

    assert.strictEqual(findRecordCalled, 2, 'findRecord is called twice');
    assert.deepEqual(serializedRecords, expectedResults, 'each findRecord returns expected result');
  });

  test('coalesceFindRequests is true and findMany is defined', async function (assert) {
    let findRecordCalled = 0;
    let findManyCalled = 0;
    let groupRecordsForFindManyCalled = 0;

    let expectedResults = {
      data: [
        {
          id: '12',
          type: 'person',
          attributes: {
            firstName: 'Gaurav',
            lastName: 'Munjal',
          },
        },
        {
          id: '19',
          type: 'person',
          attributes: {
            firstName: 'Chris',
            lastName: 'Thoburn',
          },
        },
      ],
    };

    let { owner } = this;
    let store = owner.lookup('service:store');

    // This code is a workaround for issue https://github.com/emberjs/data/issues/6758
    // expectedResult is mutated during store.findRecord
    // to add the lid
    let expectedResultsCopy = deepCopy(expectedResults);

    class TestFindRecordAdapter extends EmberObject {
      coalesceFindRequests = true;

      findRecord() {
        findRecordCalled++;
      }

      findMany(passedStore, type, ids, snapshots) {
        findManyCalled++;

        assert.strictEqual(passedStore, store, 'instance of store is passed to findMany');
        assert.strictEqual(type, Person, 'model is passed to findMany');

        let expectedIds = expectedResultsCopy.data.map((record) => record.id);
        assert.deepEqual(ids, expectedIds, 'ids are passed to findMany');

        snapshots.forEach((snapshot, index) => {
          assert.strictEqual(snapshot.modelName, 'person', 'snapshot is passed to findMany with correct modelName');
          assert.strictEqual(snapshot.id, expectedIds[index], 'snapshot is passed to findMany with correct id');
        });

        return resolve(expectedResultsCopy);
      }

      groupRecordsForFindMany(store, snapshots) {
        groupRecordsForFindManyCalled++;
        return [snapshots];
      }
    }

    owner.register('adapter:application', TestFindRecordAdapter);

    let promises = expectedResults.data.map((result) => result.id).map((id) => store.findRecord('person', id));
    let records = await all(promises);

    let serializedRecords = records.slice().map((record) => record.serialize());
    expectedResults = expectedResults.data.map((result) => ({ data: result }));

    assert.strictEqual(findRecordCalled, 0, 'findRecord is not called');
    assert.strictEqual(findManyCalled, 1, 'findMany is called once');
    assert.strictEqual(groupRecordsForFindManyCalled, 1, 'groupRecordsForFindMany is called once');
    assert.deepEqual(serializedRecords, expectedResults, 'each findRecord returns expected result');
  });

  test('coalescing works with multiple includes options specified', async function (assert) {
    let findRecordCalled = 0;
    let findManyCalled = 0;
    let groupRecordsForFindManyCalled = 0;

    let expectedResults = {
      data: [
        {
          id: '1',
          type: 'person',
          attributes: {
            firstName: 'Gaurav',
            lastName: 'Munjal',
          },
        },
        {
          id: '2',
          type: 'person',
          attributes: {
            firstName: 'Chris',
            lastName: 'Thoburn',
          },
        },
      ],
    };

    let { owner } = this;
    let store = owner.lookup('service:store');

    class TestFindRecordAdapter extends EmberObject {
      coalesceFindRequests = true;

      findRecord() {
        findRecordCalled++;
      }

      findMany(passedStore, type, ids, snapshots) {
        findManyCalled++;

        assert.strictEqual(passedStore, store, 'instance of store is passed to findMany');
        assert.strictEqual(type, Person, 'model is passed to findMany');

        let expectedIds = ['1', '1', '1', '1', '1', '1', '2', '2'];
        let expectedIncludes = [undefined, 'users', 'users', 'users', undefined, 'users.foo', 'users.foo', 'users'];
        let expectedOptions = [
          undefined,
          undefined,
          { opt: '1' },
          { opt: '2' },
          { opt: '2' },
          undefined,
          undefined,
          undefined,
        ];
        let includes = snapshots.map((snapshot) => snapshot.include);
        let options = snapshots.map((snapshot) => snapshot.adapterOptions);
        assert.deepEqual(ids, expectedIds, 'ids are passed to findMany');
        assert.deepEqual(includes, expectedIncludes, 'includes are what was expected');
        assert.deepEqual(options, expectedOptions, 'options are what was expected');

        snapshots.forEach((snapshot, index) => {
          assert.strictEqual(snapshot.modelName, 'person', 'snapshot is passed to findMany with correct modelName');
          assert.strictEqual(snapshot.id, expectedIds[index], 'snapshot is passed to findMany with correct id');
        });

        return resolve(expectedResults);
      }

      groupRecordsForFindMany(store, snapshots) {
        groupRecordsForFindManyCalled++;
        return [snapshots];
      }
    }

    owner.register('adapter:application', TestFindRecordAdapter);

    let person1 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'person', id: '1' });
    let person2 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'person', id: '2' });
    let promises = [
      store.findRecord('person', '1'),
      store.findRecord('person', '1', { include: '' }),
      store.findRecord('person', '1', { include: 'users' }),
      store.findRecord('person', '1', { include: 'users', adapterOptions: { opt: '1' } }),
      store.findRecord('person', '1', { include: 'users', adapterOptions: { opt: '2' } }),
      store.findRecord('person', '1', { include: 'users' }),
      store.findRecord('person', '1', { adapterOptions: { opt: '2' } }),
      store.findRecord('person', '1', { include: 'users.foo' }),
      store.findRecord('person', '2', { include: 'users.foo' }),
      store.findRecord('person', '2', { include: 'users' }),
      store.findRecord('person', '2', { include: 'users' }),
      store.findRecord('person', '2', { include: '' }),
      store.findRecord('person', '2'),
      store.findRecord('person', '2', { include: 'users' }),
      store.findRecord('person', '2', { include: 'users.foo' }),
    ];
    let records = await all(promises);
    let foundIdentifiers = records.map((record) => recordIdentifierFor(record));
    let expectedIdentifiers = [
      person1,
      person1,
      person1,
      person1,
      person1,
      person1,
      person1,
      person1,
      person2,
      person2,
      person2,
      person2,
      person2,
      person2,
      person2,
    ];
    expectedResults = expectedResults.data.map((result) => ({ data: result }));

    assert.strictEqual(findRecordCalled, 0, 'findRecord is not called');
    assert.strictEqual(findManyCalled, 1, 'findMany is called once');
    assert.strictEqual(groupRecordsForFindManyCalled, 1, 'groupRecordsForFindMany is called once');
    assert.deepEqual(foundIdentifiers, expectedIdentifiers, 'each findRecord returns expected result');

    const person1record = store.peekRecord('person', '1');
    const person2record = store.peekRecord('person', '2');
    assert.strictEqual(person1record.firstName, 'Gaurav', 'person 1 loaded');
    assert.strictEqual(person2record.firstName, 'Chris', 'person 2 loaded');
  });

  test('coalesceFindRequests is true and findMany is defined but groupRecordsForFindMany is undefined', async function (assert) {
    let findRecordCalled = 0;
    let findManyCalled = 0;

    let expectedResults = {
      data: [
        {
          id: '12',
          type: 'person',
          attributes: {
            firstName: 'Gaurav',
            lastName: 'Munjal',
          },
        },
        {
          id: '19',
          type: 'person',
          attributes: {
            firstName: 'Chris',
            lastName: 'Thoburn',
          },
        },
      ],
    };

    let { owner } = this;
    let store = owner.lookup('service:store');
    let expectedResultsCopy = deepCopy(expectedResults);

    class TestFindRecordAdapter extends EmberObject {
      coalesceFindRequests = true;

      findRecord() {
        findRecordCalled++;
      }

      findMany(passedStore, type, ids, snapshots) {
        findManyCalled++;

        assert.strictEqual(passedStore, store, 'instance of store is passed to findMany');
        assert.strictEqual(type, Person, 'model is passed to findMany');

        let expectedIds = expectedResultsCopy.data.map((record) => record.id);
        assert.deepEqual(ids, expectedIds, 'ids are passed to findMany');

        snapshots.forEach((snapshot, index) => {
          assert.strictEqual(snapshot.modelName, 'person', 'snapshot is passed to findMany with correct modelName');
          assert.strictEqual(snapshot.id, expectedIds[index], 'snapshot is passed to findMany with correct id');
        });

        return resolve(expectedResultsCopy);
      }
    }

    owner.register('adapter:application', TestFindRecordAdapter);

    let promises = expectedResults.data.map((result) => result.id).map((id) => store.findRecord('person', id));
    let records = await all(promises);

    let serializedRecords = records.slice().map((record) => record.serialize());
    expectedResults = expectedResults.data.map((result) => ({ data: result }));

    assert.strictEqual(findRecordCalled, 0, 'findRecord is not called');
    assert.strictEqual(findManyCalled, 1, 'findMany is called once');
    assert.deepEqual(serializedRecords, expectedResults, 'each findRecord returns expected result');
  });

  test('coalesceFindRequests is false', async function (assert) {
    let findRecordCalled = 0;
    let findManyCalled = 0;
    let groupRecordsForFindManyCalled = 0;

    let expectedResults = [
      {
        data: {
          id: '12',
          type: 'person',
          attributes: {
            firstName: 'Gaurav',
            lastName: 'Munjal',
          },
        },
      },
      {
        data: {
          id: '19',
          type: 'person',
          attributes: {
            firstName: 'Chris',
            lastName: 'Thoburn',
          },
        },
      },
    ];

    let { owner } = this;
    let store = owner.lookup('service:store');

    // This code is a workaround for issue https://github.com/emberjs/data/issues/6758
    // expectedResult is mutated during store.findRecord
    // to add the lid
    let expectedResultsCopy = deepCopy(expectedResults);

    class TestFindRecordAdapter extends EmberObject {
      coalesceFindRequests = false;

      findRecord(passedStore, type, id, snapshot) {
        assert.strictEqual(passedStore, store, 'instance of store is passed to findRecord');
        assert.strictEqual(type, Person, 'model is passed to findRecord');

        let expectedId = expectedResultsCopy[findRecordCalled].data.id;
        assert.strictEqual(id, expectedId, 'id is passed to findRecord');

        assert.strictEqual(snapshot.modelName, 'person', 'snapshot is passed to findRecord with correct modelName');
        assert.strictEqual(snapshot.id, expectedId, 'snapshot is passed to findRecord with correct id');

        return resolve(expectedResultsCopy[findRecordCalled++]);
      }

      findMany() {
        findManyCalled++;
      }

      groupRecordsForFindMany(store, snapshots) {
        groupRecordsForFindManyCalled++;
        return [snapshots];
      }
    }

    owner.register('adapter:application', TestFindRecordAdapter);

    let promises = expectedResults.map((result) => result.data.id).map((id) => store.findRecord('person', id));
    let records = await all(promises);

    let serializedRecords = records.map((record) => record.serialize());

    assert.strictEqual(findRecordCalled, 2, 'findRecord is called twice');
    assert.strictEqual(findManyCalled, 0, 'findMany is not called');
    assert.strictEqual(groupRecordsForFindManyCalled, 0, 'groupRecordsForFindMany is not called');
    assert.deepEqual(serializedRecords, expectedResults, 'each findRecord returns expected result');
  });
});
