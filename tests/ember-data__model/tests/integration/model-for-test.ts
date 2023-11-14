import { module, test } from '@warp-drive/diagnostic';
import type { FieldSchema } from '@ember-data/store/-types/q/schema-service';

import Store from '@ember-data/store';

module('modelFor without @ember-data/model', function () {
  test('We can call modelFor', function (assert) {
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
    const store = new TestStore();

    store.registerSchema({
      attributesDefinitionFor(identifier) {
        return {
          name: {
            name: 'name',
            kind: 'attribute',
            type: null,
          },
        };
      },
      _fieldsDefCache: {} as Record<string, Map<string, FieldSchema>>,
      fields(identifier: StableRecordIdentifier | { type: string }): Map<string, FieldSchema> {
        const { type } = identifier;
        let fieldDefs: Map<string, FieldSchema> | undefined = this._fieldsDefCache[type];

        if (fieldDefs === undefined) {
          fieldDefs = new Map();
          this._fieldsDefCache[type] = fieldDefs;

          const attributes = this.attributesDefinitionFor(identifier);
          const relationships = this.relationshipsDefinitionFor(identifier);

          for (const attr of Object.values(attributes)) {
            fieldDefs.set(attr.name, attr);
          }

          for (const rel of Object.values(relationships)) {
            fieldDefs.set(rel.name, rel);
          }
        }

        return fieldDefs;
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
      assert.ok(false, `We threw an unexpected error when schema is available: ${(e as Error).message}`);
    }

    try {
      store.modelFor('person');
      assert.ok(false, 'We should throw an eror when no schema is available');
    } catch (e) {
      assert.equal(
        (e as Error).message,
        "Assertion Failed: No model was found for 'person' and no schema handles the type",
        'We throw an error when no schema is available'
      );
    }
  });

  test('modelFor returns a stable reference', function (assert) {
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
    const store = new TestStore();
    store.registerSchema({
      attributesDefinitionFor(identifier) {
        return {
          name: {
            name: 'name',
            kind: 'attribute',
            type: null,
          },
        };
      },
      _fieldsDefCache: {} as Record<string, Map<string, FieldSchema>>,
      fields(identifier: StableRecordIdentifier | { type: string }): Map<string, FieldSchema> {
        const { type } = identifier;
        let fieldDefs: Map<string, FieldSchema> | undefined = this._fieldsDefCache[type];

        if (fieldDefs === undefined) {
          fieldDefs = new Map();
          this._fieldsDefCache[type] = fieldDefs;

          const attributes = this.attributesDefinitionFor(identifier);
          const relationships = this.relationshipsDefinitionFor(identifier);

          for (const attr of Object.values(attributes)) {
            fieldDefs.set(attr.name, attr);
          }

          for (const rel of Object.values(relationships)) {
            fieldDefs.set(rel.name, rel);
          }
        }

        return fieldDefs;
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
    assert.equal(ShimUser1, ShimUser2, 'Repeat modelFor calls return the same shim');
  });
});
