import EmberObject from '@ember/object';

import Store from 'ember-data__adapter/services/store';

import Model, { attr } from '@ember-data/model';
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

module('integration/mutations - Mutations Tests', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('service:store', Store);
    this.owner.register('serializer:application', MinimalSerializer);
    this.owner.register('model:person', Person);
  });

  test('store.deleteRecord calls adapter.deleteRecord if a record is deleted and then saved', async function (assert) {
    let deleteRecordCalled = 0;
    const store = this.owner.lookup('service:store');
    const expectedData = {
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

        const data = snapshot.serialize();
        const id = snapshot.id;

        assert.equal(passedStore, store, 'instance of store is passed to deleteRecord');
        assert.equal(type, Person, 'model is passed to deleteRecord');
        assert.equal(id, '12', 'id is passed to deleteRecord through snapshot');

        assert.equal(snapshot.modelName, 'person', 'snapshot is passed to deleteRecord with correct modelName');
        assert.deepEqual(data, expectedData, 'snapshot is passed to deleteRecord with correct data');
      }
    }

    this.owner.register('adapter:application', TestDeleteRecordAdapter);

    const record = store.push(expectedData);

    record.deleteRecord();
    await record.save();

    assert.equal(deleteRecordCalled, 1, 'deleteRecord is called once');
  });

  test('store.deleteRecord calls adapter.deleteRecord if a newly created record is persisted, then deleted and then saved', async function (assert) {
    let createRecordCalled = 0;
    let deleteRecordCalled = 0;
    const store = this.owner.lookup('service:store');
    const expectedData = {
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

        const data = snapshot.serialize();
        const id = snapshot.id;

        assert.equal(passedStore, store, 'instance of store is passed to deleteRecord');
        assert.equal(type, Person, 'model is passed to deleteRecord');
        assert.equal(id, '12', 'id is passed to deleteRecord through snapshot');

        assert.equal(snapshot.modelName, 'person', 'snapshot is passed to deleteRecord with correct modelName');
        assert.deepEqual(data, expectedData, 'snapshot is passed to deleteRecord with correct data');

        return Promise.resolve(data);
      }

      deleteRecord(passedStore, type, snapshot) {
        deleteRecordCalled++;

        const data = snapshot.serialize();
        const id = snapshot.id;

        assert.equal(passedStore, store, 'instance of store is passed to deleteRecord');
        assert.equal(type, Person, 'model is passed to deleteRecord');
        assert.equal(id, '12', 'id is passed to deleteRecord through snapshot');

        assert.equal(snapshot.modelName, 'person', 'snapshot is passed to deleteRecord with correct modelName');
        assert.deepEqual(data, expectedData, 'snapshot is passed to deleteRecord with correct data');
      }
    }

    this.owner.register('adapter:application', TestDeleteRecordAdapter);

    const props = { id: expectedData.data.id, ...expectedData.data.attributes };
    const record = store.createRecord('person', props);
    await record.save();

    assert.equal(createRecordCalled, 1, 'createRecord is called once');

    record.deleteRecord();
    await record.save();

    assert.equal(deleteRecordCalled, 1, 'deleteRecord is called once');
  });

  test('store.deleteRecord does not call adapter.deleteRecord if a newly created, unpersisted record is deleted and then saved', async function (assert) {
    let createRecordCalled = 0;
    let deleteRecordCalled = 0;
    const store = this.owner.lookup('service:store');
    const expectedData = {
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

    const props = { id: expectedData.data.id, ...expectedData.data.attributes };
    const record = store.createRecord('person', props);

    record.deleteRecord();
    await record.save();

    assert.equal(createRecordCalled, 0, 'adapter.createRecord is not called');
    assert.equal(deleteRecordCalled, 0, 'adapter.deleteRecord is not called');
  });

  test('record.save() calls adapter.createRecord if a newly created record unpersisted record is saved', async function (assert) {
    let createRecordCalled = 0;
    const store = this.owner.lookup('service:store');
    const expectedData = {
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

        const data = snapshot.serialize();
        const id = snapshot.id;

        assert.equal(passedStore, store, 'instance of store is passed to deleteRecord');
        assert.equal(type, Person, 'model is passed to deleteRecord');
        assert.equal(id, '12', 'id is passed to deleteRecord through snapshot');

        assert.equal(snapshot.modelName, 'person', 'snapshot is passed to deleteRecord with correct modelName');
        assert.deepEqual(data, expectedData, 'snapshot is passed to deleteRecord with correct data');

        return Promise.resolve(data);
      }
    }

    this.owner.register('adapter:application', TestCreateRecordAdapter);

    const props = { id: expectedData.data.id, ...expectedData.data.attributes };
    const record = store.createRecord('person', props);
    await record.save();

    assert.equal(createRecordCalled, 1, 'createRecord is called once');
  });

  test('record.save() calls adapter.createRecord then adapter.updateRecord if a newly created record record is saved, then saved again', async function (assert) {
    let createRecordCalled = 0;
    let updateRecord = 0;
    const store = this.owner.lookup('service:store');
    const expectedData = {
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

        const data = snapshot.serialize();
        const id = snapshot.id;

        assert.equal(passedStore, store, 'instance of store is passed to deleteRecord');
        assert.equal(type, Person, 'model is passed to deleteRecord');
        assert.equal(id, '12', 'id is passed to deleteRecord through snapshot');

        assert.equal(snapshot.modelName, 'person', 'snapshot is passed to deleteRecord with correct modelName');
        assert.deepEqual(data, expectedData, 'snapshot is passed to deleteRecord with correct data');

        return Promise.resolve(data);
      }

      updateRecord(passedStore, type, snapshot) {
        updateRecord++;

        const data = snapshot.serialize();
        const id = snapshot.id;

        assert.equal(passedStore, store, 'instance of store is passed to deleteRecord');
        assert.equal(type, Person, 'model is passed to deleteRecord');
        assert.equal(id, '12', 'id is passed to deleteRecord through snapshot');

        assert.equal(snapshot.modelName, 'person', 'snapshot is passed to deleteRecord with correct modelName');
        assert.deepEqual(data, expectedData, 'snapshot is passed to deleteRecord with correct data');

        return Promise.resolve(expectedData);
      }
    }

    this.owner.register('adapter:application', TestUpdateRecordAdapter);

    const props = { id: expectedData.data.id, ...expectedData.data.attributes };
    const record = store.createRecord('person', props);
    await record.save();

    assert.equal(createRecordCalled, 1, 'createRecord is called once');

    record.firstName = 'Kevin';
    expectedData.data.attributes.firstName = 'Kevin';
    await record.save();

    assert.equal(createRecordCalled, 1, 'createRecord is not called again');
    assert.equal(updateRecord, 1, 'updateRecord is called once');
  });

  test('record.save() calls adapter.updateRecord if an existing persisted record is saved', async function (assert) {
    let createRecordCalled = 0;
    let updateRecord = 0;
    const store = this.owner.lookup('service:store');
    const expectedData = {
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

        const data = snapshot.serialize();
        const id = snapshot.id;

        assert.equal(passedStore, store, 'instance of store is passed to deleteRecord');
        assert.equal(type, Person, 'model is passed to deleteRecord');
        assert.equal(id, '12', 'id is passed to deleteRecord through snapshot');

        assert.equal(snapshot.modelName, 'person', 'snapshot is passed to deleteRecord with correct modelName');
        assert.deepEqual(data, expectedData, 'snapshot is passed to deleteRecord with correct data');

        return Promise.resolve(expectedData);
      }
    }

    this.owner.register('adapter:application', TestUpdateRecordAdapter);

    const record = store.push(expectedData);

    record.firstName = 'Kevin';
    expectedData.data.attributes.firstName = 'Kevin';
    await record.save();

    assert.equal(createRecordCalled, 0, 'createRecord is not called');
    assert.equal(updateRecord, 1, 'updateRecord is called once');
  });
});
