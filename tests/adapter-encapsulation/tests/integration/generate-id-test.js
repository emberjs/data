import EmberObject from '@ember/object';

import Store from 'adapter-encapsulation-test-app/services/store';
import { module, test } from 'qunit';

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

    let store = this.owner.lookup('service:store');
    let expectedProps = {
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

    let record = store.createRecord('person', expectedProps);

    assert.strictEqual(record.id, 'manually generated id 1', 'manually generated id used');

    let recordFromPeekRecord = store.peekRecord('person', record.id);

    assert.strictEqual(record, recordFromPeekRecord, 'peekRecord returns the same record');
    assert.strictEqual(generateIdForRecordCalled, 1, 'generateIdForRecord is called once');
    assert.deepEqual(record.serialize(), {
      data: {
        id: 'manually generated id 1',
        type: 'person',
        attributes: expectedProps,
      },
    });
  });

  test('store.createRecord does not error if adapter.generateIdForRecord is undefined.', async function (assert) {
    let store = this.owner.lookup('service:store');
    let expectedData = {
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

    let props = expectedData.data.attributes;
    let record = store.createRecord('person', props);

    assert.deepEqual(record.serialize().data.attributes, props, 'record created without error');
  });
});
