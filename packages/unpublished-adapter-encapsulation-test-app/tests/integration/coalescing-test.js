import EmberObject from '@ember/object';

import Store from 'adapter-encapsulation-test-app/services/store';
import { module, test } from 'qunit';
import { all, resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
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

module('integration/coalescing - Coalescing Tests', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    this.owner.register('service:store', Store);
    this.owner.register('serializer:application', MinimalSerializer);
    this.owner.register('model:person', Person);
  });

  test('coalesceFindRequests is true and findMany is not defined', async function(assert) {
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
        assert.equal(passedStore, store, 'instance of store is passed to findRecord');
        assert.equal(type, Person, 'model is passed to findRecord');

        let expectedId = expectedResultsCopy[findRecordCalled].data.id;
        assert.equal(id, expectedId, 'id is passed to findRecord');

        assert.equal(snapshot.modelName, 'person', 'snapshot is passed to findRecord with correct modelName');
        assert.equal(snapshot.id, expectedId, 'snapshot is passed to findRecord with correct id');

        return resolve(expectedResultsCopy[findRecordCalled++]);
      }
    }

    owner.register('adapter:application', TestFindRecordAdapter);

    let promises = expectedResults.map(result => result.data.id).map(id => store.findRecord('person', id));
    let records = await all(promises);

    let serializedRecords = records.map(record => record.serialize());

    assert.equal(findRecordCalled, 2, 'findRecord is called twice');
    assert.deepEqual(serializedRecords, expectedResults, 'each findRecord returns expected result');
  });

  test('coalesceFindRequests is true and findMany is defined', async function(assert) {
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

        assert.equal(passedStore, store, 'instance of store is passed to findMany');
        assert.equal(type, Person, 'model is passed to findMany');

        let expectedIds = expectedResultsCopy.data.map(record => record.id);
        assert.deepEqual(ids, expectedIds, 'ids are passed to findMany');

        snapshots.forEach((snapshot, index) => {
          assert.equal(snapshot.modelName, 'person', 'snapshot is passed to findMany with correct modelName');
          assert.equal(snapshot.id, expectedIds[index], 'snapshot is passed to findMany with correct id');
        });

        return resolve(expectedResultsCopy);
      }

      groupRecordsForFindMany(store, snapshots) {
        groupRecordsForFindManyCalled++;
        return [snapshots];
      }
    }

    owner.register('adapter:application', TestFindRecordAdapter);

    let promises = expectedResults.data.map(result => result.id).map(id => store.findRecord('person', id));
    let records = await all(promises);

    let serializedRecords = records.toArray().map(record => record.serialize());
    expectedResults = expectedResults.data.map(result => ({ data: result }));

    assert.equal(findRecordCalled, 0, 'findRecord is not called');
    assert.equal(findManyCalled, 1, 'findMany is called once');
    assert.equal(groupRecordsForFindManyCalled, 1, 'groupRecordsForFindMany is called once');
    assert.deepEqual(serializedRecords, expectedResults, 'each findRecord returns expected result');
  });

  test('coalesceFindRequests is false', async function(assert) {
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
        assert.equal(passedStore, store, 'instance of store is passed to findRecord');
        assert.equal(type, Person, 'model is passed to findRecord');

        let expectedId = expectedResultsCopy[findRecordCalled].data.id;
        assert.equal(id, expectedId, 'id is passed to findRecord');

        assert.equal(snapshot.modelName, 'person', 'snapshot is passed to findRecord with correct modelName');
        assert.equal(snapshot.id, expectedId, 'snapshot is passed to findRecord with correct id');

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

    let promises = expectedResults.map(result => result.data.id).map(id => store.findRecord('person', id));
    let records = await all(promises);

    let serializedRecords = records.map(record => record.serialize());

    assert.equal(findRecordCalled, 2, 'findRecord is called twice');
    assert.equal(findManyCalled, 0, 'findMany is not called');
    assert.equal(groupRecordsForFindManyCalled, 0, 'groupRecordsForFindMany is not called');
    assert.deepEqual(serializedRecords, expectedResults, 'each findRecord returns expected result');
  });
});
