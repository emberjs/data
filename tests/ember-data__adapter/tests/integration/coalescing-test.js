import EmberObject from '@ember/object';

import Store from 'ember-data__adapter/services/store';

import Model, { attr } from '@ember-data/model';
import { recordIdentifierFor } from '@ember-data/store';
import { module, test } from '@warp-drive/diagnostic';
import { setupTest } from '@warp-drive/diagnostic/ember';

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

    const expectedResults = [
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

    const { owner } = this;
    const store = owner.lookup('service:store');

    // This code is a workaround for issue https://github.com/emberjs/data/issues/6758
    // expectedResult is mutated during store.findRecord
    // to add the lid
    const expectedResultsCopy = structuredClone(expectedResults);

    class TestFindRecordAdapter extends EmberObject {
      coalesceFindRequests = true;

      findRecord(passedStore, type, id, snapshot) {
        assert.equal(passedStore, store, 'instance of store is passed to findRecord');
        assert.equal(type, Person, 'model is passed to findRecord');

        const expectedId = expectedResultsCopy[findRecordCalled].data.id;
        assert.equal(id, expectedId, 'id is passed to findRecord');

        assert.equal(snapshot.modelName, 'person', 'snapshot is passed to findRecord with correct modelName');
        assert.equal(snapshot.id, expectedId, 'snapshot is passed to findRecord with correct id');

        return Promise.resolve(expectedResultsCopy[findRecordCalled++]);
      }
    }

    owner.register('adapter:application', TestFindRecordAdapter);

    const promises = expectedResults.map((result) => result.data.id).map((id) => store.findRecord('person', id));
    const records = await Promise.all(promises);

    const serializedRecords = records.map((record) => record.serialize());

    assert.equal(findRecordCalled, 2, 'findRecord is called twice');
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

    const { owner } = this;
    const store = owner.lookup('service:store');

    // This code is a workaround for issue https://github.com/emberjs/data/issues/6758
    // expectedResult is mutated during store.findRecord
    // to add the lid
    const expectedResultsCopy = structuredClone(expectedResults);

    class TestFindRecordAdapter extends EmberObject {
      coalesceFindRequests = true;

      findRecord() {
        findRecordCalled++;
      }

      findMany(passedStore, type, ids, snapshots) {
        findManyCalled++;

        assert.equal(passedStore, store, 'instance of store is passed to findMany');
        assert.equal(type, Person, 'model is passed to findMany');

        const expectedIds = expectedResultsCopy.data.map((record) => record.id);
        assert.deepEqual(ids, expectedIds, 'ids are passed to findMany');

        snapshots.forEach((snapshot, index) => {
          assert.equal(snapshot.modelName, 'person', 'snapshot is passed to findMany with correct modelName');
          assert.equal(snapshot.id, expectedIds[index], 'snapshot is passed to findMany with correct id');
        });

        return Promise.resolve(expectedResultsCopy);
      }

      groupRecordsForFindMany(store, snapshots) {
        groupRecordsForFindManyCalled++;
        return [snapshots];
      }
    }

    owner.register('adapter:application', TestFindRecordAdapter);

    const promises = expectedResults.data.map((result) => result.id).map((id) => store.findRecord('person', id));
    const records = await Promise.all(promises);

    const serializedRecords = records.slice().map((record) => record.serialize());
    expectedResults = expectedResults.data.map((result) => ({ data: result }));

    assert.equal(findRecordCalled, 0, 'findRecord is not called');
    assert.equal(findManyCalled, 1, 'findMany is called once');
    assert.equal(groupRecordsForFindManyCalled, 1, 'groupRecordsForFindMany is called once');
    assert.deepEqual(serializedRecords, expectedResults, 'each findRecord returns expected result');
  });

  test('Coalescing works with multiple includes options specified (bypass findMany)', async function (assert) {
    let findRecordCalled = 0;

    const { owner } = this;
    const store = owner.lookup('service:store');

    class TestFindRecordAdapter extends EmberObject {
      coalesceFindRequests = true;

      findRecord(_store, _schema, id, snapshot) {
        findRecordCalled++;

        return {
          data:
            id === '1'
              ? {
                  id: '1',
                  type: 'person',
                  attributes: {
                    firstName: 'Gaurav',
                    lastName: 'Munjal',
                  },
                }
              : {
                  id: '2',
                  type: 'person',
                  attributes: {
                    firstName: 'Chris',
                    lastName: 'Thoburn',
                  },
                },
        };
      }

      findMany() {
        throw new Error(`We should not call findMany`);
      }

      groupRecordsForFindMany() {
        throw new Error(`We should not call groupRecordForFindMany`);
      }
    }

    owner.register('adapter:application', TestFindRecordAdapter);

    const person1 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'person', id: '1' });
    const person2 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'person', id: '2' });
    const promises = [
      store.findRecord('person', '1'), // creates request (1)
      store.findRecord('person', '1', { include: '' }), // de-duped
      store.findRecord('person', '1', { include: 'users' }), // creates request (2)
      store.findRecord('person', '1', { include: 'users', adapterOptions: { opt: '1' } }), // creates request (3)
      store.findRecord('person', '1', { include: 'users', adapterOptions: { opt: '2' } }), // creates request (4)
      store.findRecord('person', '1', { include: 'users' }), // de-duped
      store.findRecord('person', '1', { adapterOptions: { opt: '2' } }), // creates request (5)
      store.findRecord('person', '1', { include: 'users.foo' }), // creates request (6)
      store.findRecord('person', '2', { include: 'users.foo' }), // creates request (7)
      store.findRecord('person', '2', { include: 'users' }), // creates request (8)
      store.findRecord('person', '2', { include: 'users' }), // de-duped
      store.findRecord('person', '2', { include: '' }), // de-duped
      store.findRecord('person', '2'), // de-duped
      store.findRecord('person', '2', { include: 'users' }), // de-duped
      store.findRecord('person', '2', { include: 'users.foo' }), // de-duped
    ];
    const records = await Promise.all(promises);
    const foundIdentifiers = records.map((record) => recordIdentifierFor(record));
    const expectedIdentifiers = [
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

    assert.equal(findRecordCalled, 8, 'findRecord is called 8x');
    assert.deepEqual(foundIdentifiers, expectedIdentifiers, 'each findRecord returns expected result');

    const person1record = store.peekRecord('person', '1');
    const person2record = store.peekRecord('person', '2');
    assert.equal(person1record.firstName, 'Gaurav', 'person 1 loaded');
    assert.equal(person2record.firstName, 'Chris', 'person 2 loaded');
  });

  test('Coalescing works with multiple includes options specified (uses findMany)', async function (assert) {
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
            firstName: 'Wesley',
            lastName: 'Thoburn',
          },
        },
        {
          id: '3',
          type: 'person',
          attributes: {
            firstName: 'James',
            lastName: 'Thoburn',
          },
        },
        {
          id: '4',
          type: 'person',
          attributes: {
            firstName: 'Chris',
            lastName: 'Thoburn',
          },
        },
      ],
    };

    const { owner } = this;
    const store = owner.lookup('service:store');

    class TestFindRecordAdapter extends EmberObject {
      coalesceFindRequests = true;

      findRecord() {
        findRecordCalled++;

        return { data: null };
      }

      findMany(passedStore, type, ids, snapshots) {
        findManyCalled++;

        assert.equal(passedStore, store, 'instance of store is passed to findMany');
        assert.equal(type, Person, 'model is passed to findMany');

        const expectedIds = ['1', '2', '3', '4'];
        const expectedIncludes = [undefined, 'users', 'users.foo', ['comments']];
        const expectedOptions = [undefined, undefined, { opt: '1' }, { opt: '2' }];
        const includes = snapshots.map((snapshot) => snapshot.include);
        const options = snapshots.map((snapshot) => snapshot.adapterOptions);
        assert.deepEqual(ids, expectedIds, 'ids are passed to findMany');
        assert.deepEqual(includes, expectedIncludes, 'includes are what was expected');
        assert.deepEqual(options, expectedOptions, 'options are what was expected');

        snapshots.forEach((snapshot, index) => {
          assert.equal(snapshot.modelName, 'person', 'snapshot is passed to findMany with correct modelName');
          assert.equal(snapshot.id, expectedIds[index], 'snapshot is passed to findMany with correct id');
        });

        return Promise.resolve(expectedResults);
      }

      groupRecordsForFindMany(_store, snapshots) {
        groupRecordsForFindManyCalled++;
        return [snapshots];
      }
    }

    owner.register('adapter:application', TestFindRecordAdapter);

    const person1 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'person', id: '1' });
    const person2 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'person', id: '2' });
    const person3 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'person', id: '3' });
    const person4 = store.identifierCache.getOrCreateRecordIdentifier({ type: 'person', id: '4' });
    const promises = [
      store.findRecord('person', '1'),
      store.findRecord('person', '2', { include: 'users' }),
      store.findRecord('person', '3', { include: 'users.foo', adapterOptions: { opt: '1' } }),
      store.findRecord('person', '4', { include: ['comments'], adapterOptions: { opt: '2' } }),
    ];
    const records = await Promise.all(promises);
    const foundIdentifiers = records.map((record) => recordIdentifierFor(record));
    const expectedIdentifiers = [person1, person2, person3, person4];
    expectedResults = expectedResults.data.map((result) => ({ data: result }));

    assert.equal(findRecordCalled, 0, 'findRecord is not called');
    assert.equal(findManyCalled, 1, 'findMany is called once');
    assert.equal(groupRecordsForFindManyCalled, 1, 'groupRecordsForFindMany is called once');
    assert.deepEqual(foundIdentifiers, expectedIdentifiers, 'each findRecord returns expected result');

    const person1record = store.peekRecord('person', '1');
    const person2record = store.peekRecord('person', '2');
    const person3record = store.peekRecord('person', '3');
    const person4record = store.peekRecord('person', '4');
    assert.equal(person1record.firstName, 'Gaurav', 'person 1 loaded');
    assert.equal(person2record.firstName, 'Wesley', 'person 2 loaded');
    assert.equal(person3record.firstName, 'James', 'person 3 loaded');
    assert.equal(person4record.firstName, 'Chris', 'person 4 loaded');
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

    const { owner } = this;
    const store = owner.lookup('service:store');
    const expectedResultsCopy = structuredClone(expectedResults);

    class TestFindRecordAdapter extends EmberObject {
      coalesceFindRequests = true;

      findRecord() {
        findRecordCalled++;
      }

      findMany(passedStore, type, ids, snapshots) {
        findManyCalled++;

        assert.equal(passedStore, store, 'instance of store is passed to findMany');
        assert.equal(type, Person, 'model is passed to findMany');

        const expectedIds = expectedResultsCopy.data.map((record) => record.id);
        assert.deepEqual(ids, expectedIds, 'ids are passed to findMany');

        snapshots.forEach((snapshot, index) => {
          assert.equal(snapshot.modelName, 'person', 'snapshot is passed to findMany with correct modelName');
          assert.equal(snapshot.id, expectedIds[index], 'snapshot is passed to findMany with correct id');
        });

        return Promise.resolve(expectedResultsCopy);
      }
    }

    owner.register('adapter:application', TestFindRecordAdapter);

    const promises = expectedResults.data.map((result) => result.id).map((id) => store.findRecord('person', id));
    const records = await Promise.all(promises);

    const serializedRecords = records.slice().map((record) => record.serialize());
    expectedResults = expectedResults.data.map((result) => ({ data: result }));

    assert.equal(findRecordCalled, 0, 'findRecord is not called');
    assert.equal(findManyCalled, 1, 'findMany is called once');
    assert.deepEqual(serializedRecords, expectedResults, 'each findRecord returns expected result');
  });

  test('coalesceFindRequests is false', async function (assert) {
    let findRecordCalled = 0;
    let findManyCalled = 0;
    let groupRecordsForFindManyCalled = 0;

    const expectedResults = [
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

    const { owner } = this;
    const store = owner.lookup('service:store');

    // This code is a workaround for issue https://github.com/emberjs/data/issues/6758
    // expectedResult is mutated during store.findRecord
    // to add the lid
    const expectedResultsCopy = structuredClone(expectedResults);

    class TestFindRecordAdapter extends EmberObject {
      coalesceFindRequests = false;

      findRecord(passedStore, type, id, snapshot) {
        assert.equal(passedStore, store, 'instance of store is passed to findRecord');
        assert.equal(type, Person, 'model is passed to findRecord');

        const expectedId = expectedResultsCopy[findRecordCalled].data.id;
        assert.equal(id, expectedId, 'id is passed to findRecord');

        assert.equal(snapshot.modelName, 'person', 'snapshot is passed to findRecord with correct modelName');
        assert.equal(snapshot.id, expectedId, 'snapshot is passed to findRecord with correct id');

        return Promise.resolve(expectedResultsCopy[findRecordCalled++]);
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

    const promises = expectedResults.map((result) => result.data.id).map((id) => store.findRecord('person', id));
    const records = await Promise.all(promises);

    const serializedRecords = records.map((record) => record.serialize());

    assert.equal(findRecordCalled, 2, 'findRecord is called twice');
    assert.equal(findManyCalled, 0, 'findMany is not called');
    assert.equal(groupRecordsForFindManyCalled, 0, 'groupRecordsForFindMany is not called');
    assert.deepEqual(serializedRecords, expectedResults, 'each findRecord returns expected result');
  });

  test('Coalescing accounts for multiple findRecord calls with different options by de-duping and using findRecord', async function (assert) {
    let findRecordCalled = 0;

    const { owner } = this;
    const store = owner.lookup('service:store');
    const options = [
      undefined, // not de-duped since is first request seen
      { reload: true }, // de-dupe
      { backgroundReload: true }, // de-dupe
      { reload: true, include: 'comments,friends' }, // should produce a request
      { reload: true, include: ['friends', 'comments'] }, // de-dupe
      { reload: true, include: 'friends,comments' }, // de-dupe
      { reload: true, include: 'notFriends,comments' }, // should produce a request
      { reload: true, include: 'comments' }, // de-dupe since included in comments,friends
      { reload: true, include: 'friends' }, // de-dupe since included in comments,friends
    ];

    class TestFindRecordAdapter extends EmberObject {
      coalesceFindRequests = true;

      async findRecord(_store, _schema, _id, snapshot) {
        findRecordCalled++;

        if (findRecordCalled === 1) {
          assert.equal(snapshot.include, undefined, 'No include for first request');
          assert.equal(snapshot.adapterOptions, undefined, 'No adapterOptions for first request');
        } else if (findRecordCalled === 2) {
          assert.equal(snapshot.include, 'comments,friends', 'include is correct for second request');
          assert.equal(snapshot.adapterOptions, undefined, 'No adapterOptions for second request');
        } else if (findRecordCalled === 3) {
          assert.equal(snapshot.include, 'notFriends,comments', 'include is correct for third request');
          assert.equal(snapshot.adapterOptions, undefined, 'No adapterOptions for third request');
        }

        return {
          data: {
            type: 'person',
            id: '1',
            attributes: {
              firstName: 'Gaurav',
              lastName: 'Munjal',
            },
          },
        };
      }

      async findMany() {
        throw new Error(`Expected findMany to not be called`);
      }

      groupRecordsForFindMany() {
        throw new Error(`Expected groupRecordsForFindMany to not be called`);
      }
    }

    owner.register('adapter:application', TestFindRecordAdapter);

    const request = store.findRecord('person', '1', options[0]);
    const request2 = store.findRecord('person', '1', options[1]);
    const request3 = store.findRecord('person', '1', options[2]);
    const request4 = store.findRecord('person', '1', options[3]);
    const request5 = store.findRecord('person', '1', options[4]);
    const request6 = store.findRecord('person', '1', options[5]);
    const request7 = store.findRecord('person', '1', options[6]);
    const request8 = store.findRecord('person', '1', options[7]);
    const request9 = store.findRecord('person', '1', options[8]);

    await Promise.all([request, request2, request3, request4, request5, request6, request7, request8, request9]);

    assert.equal(store.peekAll('person').length, 1, 'only one record is in the store');

    assert.equal(findRecordCalled, 3, 'findRecord is called three times');
  });

  test('Coalescing accounts for multiple findRecord calls with different options by de-duping and using findRecord (order scenario 2)', async function (assert) {
    let findRecordCalled = 0;

    const { owner } = this;
    const store = owner.lookup('service:store');
    const options = [
      { include: 'comments' }, // not de-duped since first request
      { reload: true, include: 'comments,friends' }, // should produce a request
      undefined, // de-dupe
      { reload: true }, // de-dupe
      { backgroundReload: true }, // de-dupe
      { reload: true, include: ['friends', 'comments'] }, // de-dupe
      { reload: true, include: 'friends,comments' }, // de-dupe
      { reload: true, include: 'notFriends,comments' }, // should produce a request
      { reload: true, include: 'friends' }, // de-dupe since included in comments,friends
    ];

    class TestFindRecordAdapter extends EmberObject {
      coalesceFindRequests = true;

      async findRecord(_store, _schema, _id, snapshot) {
        findRecordCalled++;

        if (findRecordCalled === 1) {
          assert.equal(snapshot.include, 'comments', 'include for first request');
          assert.equal(snapshot.adapterOptions, undefined, 'No adapterOptions for first request');
        } else if (findRecordCalled === 2) {
          assert.equal(snapshot.include, 'comments,friends', 'include is correct for second request');
          assert.equal(snapshot.adapterOptions, undefined, 'No adapterOptions for second request');
        } else if (findRecordCalled === 3) {
          assert.equal(snapshot.include, 'notFriends,comments', 'include is correct for third request');
          assert.equal(snapshot.adapterOptions, undefined, 'No adapterOptions for third request');
        }

        return {
          data: {
            type: 'person',
            id: '1',
            attributes: {
              firstName: 'Gaurav',
              lastName: 'Munjal',
            },
          },
        };
      }

      async findMany() {
        throw new Error(`Expected findMany to not be called`);
      }

      groupRecordsForFindMany() {
        throw new Error(`Expected groupRecordsForFindMany to not be called`);
      }
    }

    owner.register('adapter:application', TestFindRecordAdapter);

    const request = store.findRecord('person', '1', options[0]);
    const request2 = store.findRecord('person', '1', options[1]);
    const request3 = store.findRecord('person', '1', options[2]);
    const request4 = store.findRecord('person', '1', options[3]);
    const request5 = store.findRecord('person', '1', options[4]);
    const request6 = store.findRecord('person', '1', options[5]);
    const request7 = store.findRecord('person', '1', options[6]);
    const request8 = store.findRecord('person', '1', options[7]);
    const request9 = store.findRecord('person', '1', options[8]);

    await Promise.all([request, request2, request3, request4, request5, request6, request7, request8, request9]);

    assert.equal(store.peekAll('person').length, 1, 'only one record is in the store');

    assert.equal(findRecordCalled, 3, 'findRecord is called three times');
  });

  test('Coalescing accounts for multiple findRecord calls with different options by de-duping and using findRecord (order scenario 3)', async function (assert) {
    let findRecordCalled = 0;

    const { owner } = this;
    const store = owner.lookup('service:store');
    const options = [
      { reload: true, include: 'comments,friends' }, // not de-duped since first request
      undefined, // de-dupe
      { reload: true }, // de-dupe
      { backgroundReload: true }, // de-dupe
      { reload: true, include: ['friends', 'comments'] }, // de-dupe
      { reload: true, include: 'friends,comments' }, // de-dupe
      { reload: true, include: 'notFriends,comments' }, // should produce a request
      { include: 'comments' }, // de-dupe
      { reload: true, include: 'friends' }, // de-dupe since included in comments,friends
    ];

    class TestFindRecordAdapter extends EmberObject {
      coalesceFindRequests = true;

      async findRecord(_store, _schema, _id, snapshot) {
        findRecordCalled++;

        if (findRecordCalled === 1) {
          assert.equal(snapshot.include, 'comments,friends', 'include is correct for second request');
          assert.equal(snapshot.adapterOptions, undefined, 'No adapterOptions for second request');
        } else if (findRecordCalled === 2) {
          assert.equal(snapshot.include, 'notFriends,comments', 'include is correct for third request');
          assert.equal(snapshot.adapterOptions, undefined, 'No adapterOptions for third request');
        }

        return {
          data: {
            type: 'person',
            id: '1',
            attributes: {
              firstName: 'Gaurav',
              lastName: 'Munjal',
            },
          },
        };
      }

      async findMany() {
        throw new Error(`Expected findMany to not be called`);
      }

      groupRecordsForFindMany() {
        throw new Error(`Expected groupRecordsForFindMany to not be called`);
      }
    }

    owner.register('adapter:application', TestFindRecordAdapter);

    const request = store.findRecord('person', '1', options[0]);
    const request2 = store.findRecord('person', '1', options[1]);
    const request3 = store.findRecord('person', '1', options[2]);
    const request4 = store.findRecord('person', '1', options[3]);
    const request5 = store.findRecord('person', '1', options[4]);
    const request6 = store.findRecord('person', '1', options[5]);
    const request7 = store.findRecord('person', '1', options[6]);
    const request8 = store.findRecord('person', '1', options[7]);
    const request9 = store.findRecord('person', '1', options[8]);

    await Promise.all([request, request2, request3, request4, request5, request6, request7, request8, request9]);

    assert.equal(store.peekAll('person').length, 1, 'only one record is in the store');

    assert.equal(findRecordCalled, 2, 'findRecord is called twice');
  });
});
