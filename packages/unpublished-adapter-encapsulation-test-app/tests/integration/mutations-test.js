import EmberObject from '@ember/object';

import Store from 'adapter-encapsulation-test-app/services/store';
import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';

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

module('integration/mutations - Mutations Tests', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('service:store', Store);
    this.owner.register('serializer:application', MinimalSerializer);
    this.owner.register('model:person', Person);
  });

  test('store.deleteRecord calls adapter.deleteRecord if a record is deleted and then saved', async function (assert) {
    let deleteRecordCalled = 0;
    let store = this.owner.lookup('service:store');
    let expectedData = {
      data: {
        id: '12',
        type: 'person',
        attributes: {
          firstName: 'Gaurav',
          lastName: 'Munjal',
        },
      },
    };

    class TestDeleteRecordAdapter extends EmberObject {
      deleteRecord(passedStore, type, snapshot) {
        deleteRecordCalled++;

        let data = snapshot.serialize();
        let id = snapshot.id;

        assert.strictEqual(passedStore, store, 'instance of store is passed to deleteRecord');
        assert.strictEqual(type, Person, 'model is passed to deleteRecord');
        assert.strictEqual(id, '12', 'id is passed to deleteRecord through snapshot');

        assert.strictEqual(snapshot.modelName, 'person', 'snapshot is passed to deleteRecord with correct modelName');
        assert.deepEqual(data, expectedData, 'snapshot is passed to deleteRecord with correct data');
      }
    }

    this.owner.register('adapter:application', TestDeleteRecordAdapter);

    let record = store.push(expectedData);

    record.deleteRecord();
    await record.save();

    assert.strictEqual(deleteRecordCalled, 1, 'deleteRecord is called once');
  });

  test('store.deleteRecord calls adapter.deleteRecord if a newly created record is persisted, then deleted and then saved', async function (assert) {
    let createRecordCalled = 0;
    let deleteRecordCalled = 0;
    let store = this.owner.lookup('service:store');
    let expectedData = {
      data: {
        id: '12',
        type: 'person',
        attributes: {
          firstName: 'Gaurav',
          lastName: 'Munjal',
        },
      },
    };

    class TestDeleteRecordAdapter extends EmberObject {
      createRecord(passedStore, type, snapshot) {
        createRecordCalled++;

        let data = snapshot.serialize();
        let id = snapshot.id;

        assert.strictEqual(passedStore, store, 'instance of store is passed to deleteRecord');
        assert.strictEqual(type, Person, 'model is passed to deleteRecord');
        assert.strictEqual(id, '12', 'id is passed to deleteRecord through snapshot');

        assert.strictEqual(snapshot.modelName, 'person', 'snapshot is passed to deleteRecord with correct modelName');
        assert.deepEqual(data, expectedData, 'snapshot is passed to deleteRecord with correct data');

        return resolve(data);
      }

      deleteRecord(passedStore, type, snapshot) {
        deleteRecordCalled++;

        let data = snapshot.serialize();
        let id = snapshot.id;

        assert.strictEqual(passedStore, store, 'instance of store is passed to deleteRecord');
        assert.strictEqual(type, Person, 'model is passed to deleteRecord');
        assert.strictEqual(id, '12', 'id is passed to deleteRecord through snapshot');

        assert.strictEqual(snapshot.modelName, 'person', 'snapshot is passed to deleteRecord with correct modelName');
        assert.deepEqual(data, expectedData, 'snapshot is passed to deleteRecord with correct data');
      }
    }

    this.owner.register('adapter:application', TestDeleteRecordAdapter);

    let props = { id: expectedData.data.id, ...expectedData.data.attributes };
    let record = store.createRecord('person', props);
    await record.save();

    assert.strictEqual(createRecordCalled, 1, 'createRecord is called once');

    record.deleteRecord();
    await record.save();

    assert.strictEqual(deleteRecordCalled, 1, 'deleteRecord is called once');
  });

  test('store.deleteRecord does not call adapter.deleteRecord if a newly created, unpersisted record is deleted and then saved', async function (assert) {
    let createRecordCalled = 0;
    let deleteRecordCalled = 0;
    let store = this.owner.lookup('service:store');
    let expectedData = {
      data: {
        id: '12',
        type: 'person',
        attributes: {
          firstName: 'Gaurav',
          lastName: 'Munjal',
        },
      },
    };

    class TestDeleteRecordAdapter extends EmberObject {
      createRecord(passedStore, type, snapshot) {
        createRecordCalled++;
      }

      deleteRecord(passedStore, type, snapshot) {
        deleteRecordCalled++;
      }
    }

    this.owner.register('adapter:application', TestDeleteRecordAdapter);

    let props = { id: expectedData.data.id, ...expectedData.data.attributes };
    let record = store.createRecord('person', props);

    record.deleteRecord();
    await record.save();

    assert.strictEqual(createRecordCalled, 0, 'adapter.createRecord is not called');
    assert.strictEqual(deleteRecordCalled, 0, 'adapter.deleteRecord is not called');
  });

  test('record.save() calls adapter.createRecord if a newly created record unpersisted record is saved', async function (assert) {
    let createRecordCalled = 0;
    let store = this.owner.lookup('service:store');
    let expectedData = {
      data: {
        id: '12',
        type: 'person',
        attributes: {
          firstName: 'Gaurav',
          lastName: 'Munjal',
        },
      },
    };

    class TestCreateRecordAdapter extends EmberObject {
      createRecord(passedStore, type, snapshot) {
        createRecordCalled++;

        let data = snapshot.serialize();
        let id = snapshot.id;

        assert.strictEqual(passedStore, store, 'instance of store is passed to deleteRecord');
        assert.strictEqual(type, Person, 'model is passed to deleteRecord');
        assert.strictEqual(id, '12', 'id is passed to deleteRecord through snapshot');

        assert.strictEqual(snapshot.modelName, 'person', 'snapshot is passed to deleteRecord with correct modelName');
        assert.deepEqual(data, expectedData, 'snapshot is passed to deleteRecord with correct data');

        return resolve(data);
      }
    }

    this.owner.register('adapter:application', TestCreateRecordAdapter);

    let props = { id: expectedData.data.id, ...expectedData.data.attributes };
    let record = store.createRecord('person', props);
    await record.save();

    assert.strictEqual(createRecordCalled, 1, 'createRecord is called once');
  });

  test('record.save() calls adapter.createRecord then adapter.updateRecord if a newly created record record is saved, then saved again', async function (assert) {
    let createRecordCalled = 0;
    let updateRecord = 0;
    let store = this.owner.lookup('service:store');
    let expectedData = {
      data: {
        id: '12',
        type: 'person',
        attributes: {
          firstName: 'Gaurav',
          lastName: 'Munjal',
        },
      },
    };

    class TestUpdateRecordAdapter extends EmberObject {
      createRecord(passedStore, type, snapshot) {
        createRecordCalled++;

        let data = snapshot.serialize();
        let id = snapshot.id;

        assert.strictEqual(passedStore, store, 'instance of store is passed to deleteRecord');
        assert.strictEqual(type, Person, 'model is passed to deleteRecord');
        assert.strictEqual(id, '12', 'id is passed to deleteRecord through snapshot');

        assert.strictEqual(snapshot.modelName, 'person', 'snapshot is passed to deleteRecord with correct modelName');
        assert.deepEqual(data, expectedData, 'snapshot is passed to deleteRecord with correct data');

        return resolve(data);
      }

      updateRecord(passedStore, type, snapshot) {
        updateRecord++;

        let data = snapshot.serialize();
        let id = snapshot.id;

        assert.strictEqual(passedStore, store, 'instance of store is passed to deleteRecord');
        assert.strictEqual(type, Person, 'model is passed to deleteRecord');
        assert.strictEqual(id, '12', 'id is passed to deleteRecord through snapshot');

        assert.strictEqual(snapshot.modelName, 'person', 'snapshot is passed to deleteRecord with correct modelName');
        assert.deepEqual(data, expectedData, 'snapshot is passed to deleteRecord with correct data');

        return resolve(expectedData);
      }
    }

    this.owner.register('adapter:application', TestUpdateRecordAdapter);

    let props = { id: expectedData.data.id, ...expectedData.data.attributes };
    let record = store.createRecord('person', props);
    await record.save();

    assert.strictEqual(createRecordCalled, 1, 'createRecord is called once');

    record.firstName = 'Kevin';
    expectedData.data.attributes.firstName = 'Kevin';
    await record.save();

    assert.strictEqual(createRecordCalled, 1, 'createRecord is not called again');
    assert.strictEqual(updateRecord, 1, 'updateRecord is called once');
  });

  test('record.save() calls adapter.updateRecord if an existing persisted record is saved', async function (assert) {
    let createRecordCalled = 0;
    let updateRecord = 0;
    let store = this.owner.lookup('service:store');
    let expectedData = {
      data: {
        id: '12',
        type: 'person',
        attributes: {
          firstName: 'Gaurav',
          lastName: 'Munjal',
        },
      },
    };

    class TestUpdateRecordAdapter extends EmberObject {
      createRecord(passedStore, type, snapshot) {
        createRecordCalled++;
      }

      updateRecord(passedStore, type, snapshot) {
        updateRecord++;

        let data = snapshot.serialize();
        let id = snapshot.id;

        assert.strictEqual(passedStore, store, 'instance of store is passed to deleteRecord');
        assert.strictEqual(type, Person, 'model is passed to deleteRecord');
        assert.strictEqual(id, '12', 'id is passed to deleteRecord through snapshot');

        assert.strictEqual(snapshot.modelName, 'person', 'snapshot is passed to deleteRecord with correct modelName');
        assert.deepEqual(data, expectedData, 'snapshot is passed to deleteRecord with correct data');

        return resolve(expectedData);
      }
    }

    this.owner.register('adapter:application', TestUpdateRecordAdapter);

    let record = store.push(expectedData);

    record.firstName = 'Kevin';
    expectedData.data.attributes.firstName = 'Kevin';
    await record.save();

    assert.strictEqual(createRecordCalled, 0, 'createRecord is not called');
    assert.strictEqual(updateRecord, 1, 'updateRecord is called once');
  });
});
