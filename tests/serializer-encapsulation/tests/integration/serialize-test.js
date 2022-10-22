import EmberObject from '@ember/object';

import { module, test } from 'qunit';
import Store from 'serializer-encapsulation-test-app/services/store';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';

class Person extends Model {
  @attr
  firstName;

  @attr
  lastName;

  // override to not call serialize()
  toJSON() {
    const { id, firstName, lastName } = this;
    return {
      id,
      type: this.constructor.modelName,
      attributes: {
        firstName,
        lastName,
      },
    };
  }
}

module('integration/serializer - serialize methods forward to Serializer#serialize', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function (assert) {
    this.owner.register('service:store', Store);
    this.owner.register('model:person', Person);
  });

  test('Model#serialize calls Serializer#serialize', async function (assert) {
    let serializeCalled = 0;

    class TestMinimumSerializer extends EmberObject {
      serialize(snapshot, options) {
        serializeCalled++;

        assert.strictEqual(snapshot.id, '1', 'id is correct');
        assert.strictEqual(snapshot.modelName, 'person', 'modelName is correct');
        assert.deepEqual(snapshot.attributes(), { firstName: 'John', lastName: 'Smith' }, 'attributes are correct');

        const serializedResource = {
          id: snapshot.id,
          type: snapshot.modelName,
          attributes: {
            firstName: 'Chris',
            lastName: 'Thoburn',
          },
        };

        return serializedResource;
      }
    }
    this.owner.register('serializer:application', TestMinimumSerializer);

    const store = this.owner.lookup('service:store');

    let person = store.createRecord('person', {
      id: '1',
      firstName: 'John',
      lastName: 'Smith',
    });

    assert.deepEqual(person.toJSON(), {
      id: '1',
      type: 'person',
      attributes: {
        firstName: 'John',
        lastName: 'Smith',
      },
    });

    let serializedPerson = person.serialize();

    assert.strictEqual(serializeCalled, 1, 'serialize called once');
    assert.deepEqual(serializedPerson, {
      id: '1',
      type: 'person',
      attributes: {
        firstName: 'Chris',
        lastName: 'Thoburn',
      },
    });
  });

  test('Snapshot#serialize calls Serializer#serialize', async function (assert) {
    let serializeCalled = 0;

    class TestMinimumSerializer extends EmberObject {
      serialize(snapshot, options) {
        serializeCalled++;

        assert.strictEqual(snapshot.id, '1', 'id is correct');
        assert.strictEqual(snapshot.modelName, 'person', 'modelName is correct');
        assert.deepEqual(snapshot.attributes(), { firstName: 'John', lastName: 'Smith' }, 'attributes are correct');

        const serializedResource = {
          id: snapshot.id,
          type: snapshot.modelName,
          attributes: {
            firstName: 'Chris',
            lastName: 'Thoburn',
          },
        };

        return serializedResource;
      }
    }
    this.owner.register('serializer:application', TestMinimumSerializer);

    const store = this.owner.lookup('service:store');

    let person = store.createRecord('person', {
      id: '1',
      firstName: 'John',
      lastName: 'Smith',
    });

    assert.deepEqual(person.toJSON(), {
      id: '1',
      type: 'person',
      attributes: {
        firstName: 'John',
        lastName: 'Smith',
      },
    });

    let serializedPerson = person._createSnapshot().serialize();

    assert.strictEqual(serializeCalled, 1, 'serialize called once');
    assert.deepEqual(serializedPerson, {
      id: '1',
      type: 'person',
      attributes: {
        firstName: 'Chris',
        lastName: 'Thoburn',
      },
    });
  });

  test('Store#serializeRecord calls Serializer#serialize', async function (assert) {
    let serializeCalled = 0;

    class TestMinimumSerializer extends EmberObject {
      serialize(snapshot, options) {
        serializeCalled++;

        assert.strictEqual(snapshot.id, '1', 'id is correct');
        assert.strictEqual(snapshot.modelName, 'person', 'modelName is correct');
        assert.deepEqual(snapshot.attributes(), { firstName: 'John', lastName: 'Smith' }, 'attributes are correct');

        const serializedResource = {
          id: snapshot.id,
          type: snapshot.modelName,
          attributes: {
            firstName: 'Chris',
            lastName: 'Thoburn',
          },
        };

        return serializedResource;
      }
    }
    this.owner.register('serializer:application', TestMinimumSerializer);

    const store = this.owner.lookup('service:store');

    let person = store.createRecord('person', {
      id: '1',
      firstName: 'John',
      lastName: 'Smith',
    });

    assert.deepEqual(person.toJSON(), {
      id: '1',
      type: 'person',
      attributes: {
        firstName: 'John',
        lastName: 'Smith',
      },
    });

    let serializedPerson = store.serializeRecord(person);

    assert.strictEqual(serializeCalled, 1, 'serialize called once');
    assert.deepEqual(serializedPerson, {
      id: '1',
      type: 'person',
      attributes: {
        firstName: 'Chris',
        lastName: 'Thoburn',
      },
    });
  });
});
