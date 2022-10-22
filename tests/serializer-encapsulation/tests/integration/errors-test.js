import EmberObject from '@ember/object';

import { module, test } from 'qunit';
import { reject } from 'rsvp';
import Store from 'serializer-encapsulation-test-app/services/store';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import Model, { attr } from '@ember-data/model';

class Person extends Model {
  @attr
  firstName;

  @attr
  lastName;
}

module(
  'integration/errors - errors in JSON:API format "just work" with no extractErrors hook on the serializer',
  function (hooks) {
    setupTest(hooks);

    hooks.beforeEach(function () {
      this.owner.register('service:store', Store);
      this.owner.register('model:person', Person);
      this.owner.register(
        'serializer:application',
        class MinimumSerializer extends EmberObject {
          serialize() {
            return {};
          }
        }
      );
    });

    test('can retrieve errors after findRecord', async function (assert) {
      class TestAdapter extends JSONAPIAdapter {
        ajax(url, type) {
          return reject({
            errors: [
              {
                status: '404',
                detail: 'file not found',
              },
            ],
          });
        }
      }
      this.owner.register('adapter:application', TestAdapter);

      let store = this.owner.lookup('service:Store');
      let errors;
      try {
        await store.findRecord('person', 1);
        assert.notOk('should never reach here.');
      } catch (adapterError) {
        ({ errors } = adapterError);
      }

      assert.strictEqual(errors.length, 1, 'error recorded');
      assert.strictEqual(errors[0].status, '404', 'error status is correct');
      assert.strictEqual(errors[0].detail, 'file not found', 'error detail is correct');
    });

    test('can retrieve errors after save', async function (assert) {
      class TestAdapter extends JSONAPIAdapter {
        ajax(url, type) {
          return reject({
            errors: [
              {
                status: '400',
                source: { pointer: 'data/attributes/firstName' },
                detail: 'firstName is required',
              },
              {
                status: '400',
                source: { pointer: 'data/attributes/lastName' },
                detail: 'lastName is required',
              },
            ],
          });
        }
      }
      this.owner.register('adapter:application', TestAdapter);

      let store = this.owner.lookup('service:Store');
      let person = store.createRecord('person', {});
      let errors;
      try {
        await person.save();
        assert.notOk('should never reach here.');
      } catch (adapterError) {
        ({ errors } = adapterError);
      }

      assert.strictEqual(errors.length, 2, 'both errors recorded');
      assert.strictEqual(errors[0].detail, 'firstName is required', 'first error is that firstName is required');
      assert.strictEqual(errors[1].detail, 'lastName is required', 'second error is that lastName is required');
    });
  }
);
