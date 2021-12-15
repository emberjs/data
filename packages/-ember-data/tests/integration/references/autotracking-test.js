import EmberObject from '@ember/object';
import { getRootElement, render } from '@ember/test-helpers';
import settled from '@ember/test-helpers/settled';

import hbs from 'htmlbars-inline-precompile';
import { module, test } from 'qunit';

import { setupRenderingTest } from 'ember-qunit';

import { CUSTOM_MODEL_CLASS } from '@ember-data/canary-features';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { recordIdentifierFor } from '@ember-data/store';

if (CUSTOM_MODEL_CLASS) {
  module('integration/references/autotracking', function (hooks) {
    setupRenderingTest(hooks);

    class User extends Model {
      @attr name;
      @belongsTo('user', { inverse: null, async: false })
      bestFriend;
      @hasMany('user', { inverse: null, async: false })
      friends;
    }

    let store, user;
    hooks.beforeEach(function () {
      const { owner } = this;
      owner.register('model:user', User);
      store = owner.lookup('service:store');

      owner.register(
        'adapter:user',
        class extends EmberObject {
          createRecord() {
            return { data: { id: '6', type: 'user' } };
          }
        }
      );
      owner.register(
        'serializer:user',
        class extends EmberObject {
          normalizeResponse(_, __, data) {
            return data;
          }
        }
      );

      user = store.push({
        data: {
          type: 'user',
          id: '1',
          attributes: {
            name: 'Chris',
          },
          relationships: {
            bestFriend: {
              data: { type: 'user', id: '2' },
            },
            friends: {
              data: [{ type: 'user', id: '2' }],
            },
          },
        },
        included: [
          { type: 'user', id: '2', attributes: { name: 'Igor' } },
          { type: 'user', id: '3', attributes: { name: 'David' } },
          { type: 'user', id: '4', attributes: { name: 'Scott' } },
          { type: 'user', id: '5', attributes: { name: 'Rob' } },
        ],
      });
    });

    test('BelongsToReference.id() is autotracked', async function (assert) {
      class TestContext {
        user = user;

        get bestFriendId() {
          return this.user.belongsTo('bestFriend').id();
        }
      }

      const testContext = new TestContext();
      this.set('context', testContext);
      await render(hbs`id: {{if this.context.bestFriendId this.context.bestFriendId 'null'}}`);

      assert.strictEqual(getRootElement().textContent, 'id: 2', 'the id is initially correct');
      assert.strictEqual(testContext.bestFriendId, '2', 'the id is initially correct');
      user.bestFriend = store.createRecord('user', { name: 'Bill' });
      await settled();
      assert.strictEqual(getRootElement().textContent, 'id: null', 'the id updates to null');
      assert.strictEqual(testContext.bestFriendId, null, 'the id is correct when we swap records');
      await user.bestFriend.save();
      await settled();
      assert.strictEqual(getRootElement().textContent, 'id: 6', 'the id updates when the related record id updates');
      assert.strictEqual(testContext.bestFriendId, '6', 'the id is correct when the record is saved');
    });

    test('HasManyReference.ids() is autotracked', async function (assert) {
      class TestContext {
        user = user;

        get friendIds() {
          return this.user.hasMany('friends').ids();
        }
      }
      const testContext = new TestContext();
      this.set('context', testContext);
      await render(hbs`{{#each this.context.friendIds as |id|}}id: {{if id id 'null'}}, {{/each}}`);

      assert.strictEqual(getRootElement().textContent, 'id: 2, ', 'the ids are initially correct');
      assert.deepEqual(testContext.friendIds, ['2'], 'the ids are initially correct');
      const bill = store.createRecord('user', { name: 'Bill' });
      user.friends.pushObject(bill);
      await settled();
      assert.strictEqual(getRootElement().textContent, 'id: 2, id: null, ', 'the id is added for the new record');
      assert.deepEqual(testContext.friendIds, ['2', null], 'the ids are correct when we add a new record');
      await bill.save();
      await settled();
      assert.strictEqual(
        getRootElement().textContent,
        'id: 2, id: 6, ',
        'the id updates when the related record id updates'
      );
      assert.deepEqual(testContext.friendIds, ['2', '6'], 'the ids are correct when the new record is saved');
    });
  });
}
