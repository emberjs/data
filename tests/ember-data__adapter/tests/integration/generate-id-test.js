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

module('integration/generate-id - GenerateIdForRecord Tests', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('service:store', Store);
    this.owner.register('serializer:application', MinimalSerializer);
    this.owner.register('model:person', Person);
  });

  test('store.createRecord calls adapter.generateIdForRecord if defined and we use this ID for the record', async function (assert) {
    let generateIdForRecordCalled = 0;
    let seq = 0;

    const store = this.owner.lookup('service:store');
    const expectedProps = {
      firstName: 'Gaurav',
      lastName: 'Munjal',
    };

    class TestGenerateIdForRecordAdapter extends EmberObject {
      generateIdForRecord() {
        generateIdForRecordCalled++;

        return 'manually generated id ' + ++seq;
      }
    }

    this.owner.register('adapter:application', TestGenerateIdForRecordAdapter);

    const record = store.createRecord('person', expectedProps);

    assert.equal(record.id, 'manually generated id 1', 'manually generated id used');

    const recordFromPeekRecord = store.peekRecord('person', record.id);

    assert.equal(record, recordFromPeekRecord, 'peekRecord returns the same record');
    assert.equal(generateIdForRecordCalled, 1, 'generateIdForRecord is called once');
    assert.deepEqual(record.serialize(), {
      data: {
        id: 'manually generated id 1',
        type: 'person',
        attributes: expectedProps,
      },
    });
  });

  test('store.createRecord does not error if adapter.generateIdForRecord is undefined.', async function (assert) {
    const store = this.owner.lookup('service:store');
    const expectedData = {
      data: {
        type: 'person',
        attributes: {
          firstName: 'Gaurav',
          lastName: 'Munjal',
        },
      },
    };

    class TestGenerateIdForRecordAdapter extends EmberObject {}

    this.owner.register('adapter:application', TestGenerateIdForRecordAdapter);

    const props = expectedData.data.attributes;
    const record = store.createRecord('person', props);

    assert.deepEqual(record.serialize().data.attributes, props, 'record created without error');
  });

  test('store.createRecord does not error if adapter is undefined.', async function (assert) {
    const store = this.owner.lookup('service:store');
    const expectedData = {
      data: {
        type: 'person',
        attributes: {
          firstName: 'Gaurav',
          lastName: 'Munjal',
        },
      },
    };

    const props = expectedData.data.attributes;
    const record = store.createRecord('person', props);

    assert.deepEqual(record.serialize().data.attributes, props, 'record created without error');
  });
});
