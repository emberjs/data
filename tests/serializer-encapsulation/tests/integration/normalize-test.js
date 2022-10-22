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
}

module('integration/serializer - normalize method forwards to Serializer#normalize', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function (assert) {
    this.owner.register('service:store', Store);
    this.owner.register('model:person', Person);
  });

  test('Store#normalize calls Serializer#normalize', async function (assert) {
    let normalizeCalled = 0;

    class TestMinimumSerializer extends EmberObject {
      normalize(modelClass, rawPayload) {
        normalizeCalled++;

        assert.strictEqual(modelClass.name, 'Person', 'modelClass was passed to normalize');
        assert.deepEqual(
          rawPayload,
          {
            id: '1',
            type: 'person',
            attributes: {
              firstName: 'John',
              lastName: 'Smith',
            },
          },
          'payload is correct'
        );

        return {
          data: rawPayload,
        };
      }
    }
    this.owner.register('serializer:application', TestMinimumSerializer);

    const store = this.owner.lookup('service:store');

    let payload = store.normalize('person', {
      id: '1',
      type: 'person',
      attributes: {
        firstName: 'John',
        lastName: 'Smith',
      },
    });

    assert.strictEqual(normalizeCalled, 1, 'normalize called once');
    assert.deepEqual(
      payload,
      {
        data: {
          id: '1',
          type: 'person',
          attributes: {
            firstName: 'John',
            lastName: 'Smith',
          },
        },
      },
      'normalized payload is correct'
    );
  });

  testInDebug('Store#normalize throws an error if Serializer#normalize is not implemented', async function (assert) {
    class TestMinimumSerializer extends EmberObject {}
    this.owner.register('serializer:application', TestMinimumSerializer);

    const store = this.owner.lookup('service:store');

    assert.throws(() => {
      store.normalize('person', {
        id: '1',
        type: 'person',
        attributes: {
          firstName: 'John',
          lastName: 'Smith',
        },
      });
    }, /You must define a normalize method in your serializer in order to call store.normalize/);
  });
});
