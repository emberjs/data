import EmberObject from '@ember/object';

import { module, test } from 'qunit';
import Store from 'serializer-encapsulation-test-app/services/store';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

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

module('integration/push-payload - pushPayload method forwards to Serializer#pushPayload', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function (assert) {
    this.owner.register('service:store', Store);
    this.owner.register('model:person', Person);
  });

  test('Store#pushPayload calls Serializer#pushPayload', async function (assert) {
    let pushPayloadCalled = 0;

    class TestMinimumSerializer extends EmberObject {
      pushPayload(store, rawPayload) {
        pushPayloadCalled++;

        assert.deepEqual(rawPayload, {
          id: '1',
          type: 'person',
          attributes: {
            firstName: 'John',
            lastName: 'Smith',
          },
        });

        store.push({
          data: rawPayload,
        });
      }
    }
    this.owner.register('serializer:application', TestMinimumSerializer);

    const store = this.owner.lookup('service:store');

    store.pushPayload('person', {
      id: '1',
      type: 'person',
      attributes: {
        firstName: 'John',
        lastName: 'Smith',
      },
    });
    let person = store.peekRecord('person', '1');

    assert.strictEqual(pushPayloadCalled, 1, 'pushPayload called once');
    assert.deepEqual(
      person.toJSON(),
      {
        id: '1',
        type: 'person',
        attributes: {
          firstName: 'John',
          lastName: 'Smith',
        },
      },
      'normalized payload is correct'
    );
  });

  testInDebug(
    'Store#pushPayload throws an error if Serializer#pushPayload is not implemented',
    async function (assert) {
      class TestMinimumSerializer extends EmberObject {}
      this.owner.register('serializer:application', TestMinimumSerializer);

      const store = this.owner.lookup('service:store');

      assert.throws(() => {
        store.pushPayload('person', {
          data: {
            id: '1',
            type: 'person',
            attributes: {
              firstName: 'John',
              lastName: 'Smith',
            },
          },
        });
      }, /You must define a pushPayload method in your serializer in order to call store.pushPayload/);
    }
  );
});
