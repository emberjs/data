import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { HAS_DEBUG_PACKAGE } from '@ember-data/packages';

// TODO move these tests to the @ember-data/debug package
if (HAS_DEBUG_PACKAGE) {
  module('Debug', function (hooks) {
    setupTest(hooks);

    test('_debugInfo groups the attributes and relationships correctly', function (assert) {
      const MaritalStatus = Model.extend({
        name: attr('string'),
      });

      const Post = Model.extend({
        title: attr('string'),
      });

      const User = Model.extend({
        name: attr('string'),
        isDrugAddict: attr('boolean'),
        maritalStatus: belongsTo('marital-status', { async: false, inverse: null }),
        posts: hasMany('post', { async: false, inverse: null }),
      });

      this.owner.register('model:marital-status', MaritalStatus);
      this.owner.register('model:post', Post);
      this.owner.register('model:user', User);

      let record = this.owner.lookup('service:store').createRecord('user');

      let propertyInfo = record._debugInfo().propertyInfo;

      assert.strictEqual(propertyInfo.groups.length, 4);
      assert.strictEqual(propertyInfo.groups[0].name, 'Attributes');
      assert.deepEqual(propertyInfo.groups[0].properties, ['id', 'name', 'isDrugAddict']);
      assert.strictEqual(propertyInfo.groups[1].name, 'belongsTo');
      assert.deepEqual(propertyInfo.groups[1].properties, ['maritalStatus']);
      assert.strictEqual(propertyInfo.groups[2].name, 'hasMany');
      assert.deepEqual(propertyInfo.groups[2].properties, ['posts']);
    });

    test('_debugInfo supports arbitray relationship types', async function (assert) {
      class MaritalStatus extends Model {
        @attr('string') name;
      }

      class Post extends Model {
        @attr('string') title;
      }

      class User extends Model {
        @attr('string') name;
        @attr('boolean') isDrugAddict;
        @belongsTo('marital-status', { async: false, inverse: null }) maritalStatus;
      }

      // posts: computed(() => [1, 2, 3])
      // .readOnly()
      // .meta({
      //   options: { inverse: null },
      //   kind: 'customRelationship',
      //   name: 'posts',
      //   type: 'post',
      // }),

      this.owner.register('model:marital-status', MaritalStatus);
      this.owner.register('model:post', Post);
      this.owner.register('model:user', User);

      const store = this.owner.lookup('service:store');

      class SchemaDelegator {
        constructor(schema) {
          this._schema = schema;
        }

        doesTypeExist(type) {
          return this._schema.doesTypeExist(type);
        }

        attributesDefinitionFor(identifier) {
          return this._schema.attributesDefinitionFor(identifier);
        }

        relationshipsDefinitionFor(identifier) {
          const sup = this._schema.relationshipsDefinitionFor(identifier);
          if (identifier.type === 'user') {
            return Object.assign(sup, {
              posts: {
                kind: 'customRelationship',
                name: 'posts',
                type: 'post',
                options: { async: false, inverse: null },
              },
            });
          }
          return sup;
        }
      }
      const schema = store.getSchemaDefinitionService();
      store.registerSchemaDefinitionService(new SchemaDelegator(schema));

      const record = store.createRecord('user');
      const propertyInfo = record._debugInfo().propertyInfo;

      assert.deepEqual(propertyInfo, {
        includeOtherProperties: true,
        groups: [
          {
            name: 'Attributes',
            properties: ['id', 'name', 'isDrugAddict'],
            expand: true,
          },
          {
            name: 'belongsTo',
            properties: ['maritalStatus'],
            expand: true,
          },
          {
            name: 'customRelationship',
            properties: ['posts'],
            expand: true,
          },
          {
            name: 'Flags',
            properties: ['isLoaded', 'hasDirtyAttributes', 'isSaving', 'isDeleted', 'isError', 'isNew', 'isValid'],
          },
        ],
        expensiveProperties: ['maritalStatus', 'posts'],
      });
    });
  });
} else {
  module('Debug Skipped', function () {
    test('Alert Skipped', function (assert) {
      assert.ok(false, 'Debug Tests were Skipped');
    });
  });
}
