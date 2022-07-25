import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Store from '@ember-data/store';

module('modelFor without @ember-data/model', function (hooks) {
  setupTest(hooks);

  test('We can call modelFor', function (assert) {
    this.owner.register(
      'service:store',
      class TestStore extends Store {
        instantiateRecord() {
          return {
            id: '1',
            type: 'user',
            name: 'Chris Thoburn',
          };
        }
        teardownRecord() {
          return;
        }
      }
    );
    const store = this.owner.lookup('service:store');
    store.registerSchemaDefinitionService({
      attributesDefinitionFor(identifier) {
        return {
          name: {
            name: 'name',
          },
        };
      },
      relationshipsDefinitionFor(identifier) {
        return {};
      },
      doesTypeExist(type) {
        return type === 'user';
      },
    });

    try {
      store.modelFor('user');
      assert.ok(true, 'We should not throw an eror when schema is available');
    } catch (e) {
      assert.ok(false, `We threw an unexpected error when schema is available: ${e.message}`);
    }

    try {
      store.modelFor('person');
      assert.ok(false, 'We should throw an eror when no schema is available');
    } catch (e) {
      assert.strictEqual(
        e.message,
        "Assertion Failed: No model was found for 'person' and no schema handles the type",
        'We throw an error when no schema is available'
      );
    }
  });

  test('modelFor returns a stable reference', function (assert) {
    this.owner.register(
      'service:store',
      class TestStore extends Store {
        instantiateRecord() {
          return {
            id: '1',
            type: 'user',
            name: 'Chris Thoburn',
          };
        }
        teardownRecord() {
          return;
        }
      }
    );
    const store = this.owner.lookup('service:store');
    store.registerSchemaDefinitionService({
      attributesDefinitionFor(identifier) {
        return {
          name: {
            name: 'name',
          },
        };
      },
      relationshipsDefinitionFor(identifier) {
        return {};
      },
      doesTypeExist(type) {
        return type === 'user';
      },
    });

    const ShimUser1 = store.modelFor('user');
    const ShimUser2 = store.modelFor('user');
    assert.strictEqual(ShimUser1, ShimUser2, 'Repeat modelFor calls return the same shim');
  });
});
