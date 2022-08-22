import { A } from '@ember/array';
import EmberObject, { computed } from '@ember/object';
import { filterBy } from '@ember/object/computed';
import { settled } from '@ember/test-helpers';

import { module } from 'qunit';

import { setupRenderingTest } from 'ember-qunit';

import Model, { attr, hasMany } from '@ember-data/model';
import { DEPRECATE_PROMISE_MANY_ARRAY_BEHAVIORS } from '@ember-data/private-build-infra/deprecations';
import { deprecatedTest } from '@ember-data/unpublished-test-infra/test-support/deprecated-test';

module('PromiseManyArray', (hooks) => {
  setupRenderingTest(hooks);

  deprecatedTest(
    'PromiseManyArray is not side-affected by EmberArray',
    { id: 'ember-data:no-a-with-array-like', until: '5.0', count: 1 },
    async function (assert) {
      const { owner } = this;
      class Person extends Model {
        @attr('string') name;
      }
      class Group extends Model {
        @hasMany('person', { async: true, inverse: null }) members;
      }
      owner.register('model:person', Person);
      owner.register('model:group', Group);
      const store = owner.lookup('service:store');
      const members = ['Bob', 'John', 'Michael', 'Larry', 'Lucy'].map((name) => store.createRecord('person', { name }));
      const group = store.createRecord('group', { members });

      const forEachFn = group.members.forEach;
      assert.strictEqual(group.members.length, 5, 'initial length is correct');

      if (DEPRECATE_PROMISE_MANY_ARRAY_BEHAVIORS) {
        group.members.replace(0, 1);
        assert.strictEqual(group.members.length, 4, 'updated length is correct');
        assert.expectDeprecation({ id: 'ember-data:deprecate-array-like' });
      }

      A(group.members);

      assert.strictEqual(forEachFn, group.members.forEach, 'we have the same function for forEach');

      if (DEPRECATE_PROMISE_MANY_ARRAY_BEHAVIORS) {
        group.members.replace(0, 1);
        assert.strictEqual(group.members.length, 3, 'updated length is correct');
        // we'll want to use a different test for this but will want to still ensure we are not side-affected
        assert.expectDeprecation({ id: 'ember-data:deprecate-promise-many-array-behaviors', until: '5.0', count: 2 });
        assert.expectDeprecation({ id: 'ember-data:deprecate-array-like' });
      }
    }
  );

  deprecatedTest(
    'PromiseManyArray can be subscribed to by computed chains',
    { id: 'ember-data:deprecate-promise-many-array-behaviors', until: '5.0', count: 16 },
    async function (assert) {
      const { owner } = this;
      class Person extends Model {
        @attr('string') name;
      }
      class Group extends Model {
        @hasMany('person', { async: true, inverse: null }) members;

        @computed('members.@each.id')
        get memberIds() {
          return this.members.map((m) => m.id);
        }

        @filterBy('members', 'name', 'John')
        johns;
      }
      owner.register('model:person', Person);
      owner.register('model:group', Group);
      owner.register(
        'serializer:application',
        class extends EmberObject {
          normalizeResponse(_, __, data) {
            return data;
          }
        }
      );

      let _id = 0;
      const names = ['Bob', 'John', 'Michael', 'John', 'Larry', 'Lucy'];
      owner.register(
        'adapter:application',
        class extends EmberObject {
          findRecord() {
            const name = names[_id++];
            const data = {
              type: 'person',
              id: `${_id}`,
              attributes: {
                name,
              },
            };
            return { data };
          }
        }
      );
      const store = owner.lookup('service:store');

      const group = store.push({
        data: {
          type: 'group',
          id: '1',
          relationships: {
            members: {
              data: [
                { type: 'person', id: '1' },
                { type: 'person', id: '2' },
                { type: 'person', id: '3' },
                { type: 'person', id: '4' },
                { type: 'person', id: '5' },
                { type: 'person', id: '6' },
              ],
            },
          },
        },
      });

      // access the group data
      let memberIds = group.memberIds;
      let johnRecords = group.johns;
      assert.strictEqual(memberIds.length, 0, 'member ids is 0 initially');
      assert.strictEqual(johnRecords.length, 0, 'john ids is 0 initially');

      await settled();

      memberIds = group.memberIds;
      johnRecords = group.johns;
      assert.strictEqual(memberIds.length, 6, 'memberIds length is correct');
      assert.strictEqual(johnRecords.length, 2, 'johnRecords length is correct');
      assert.strictEqual(group.members.length, 6, 'members length is correct');
      assert.expectDeprecation({ id: 'ember-data:no-a-with-array-like', count: 2 });
      assert.expectDeprecation({ id: 'ember-data:deprecate-array-like', count: 12 });
    }
  );
});
