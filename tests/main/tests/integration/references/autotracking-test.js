import EmberObject from '@ember/object';
import { getRootElement, render, settled } from '@ember/test-helpers';

import hbs from 'htmlbars-inline-precompile';
import { module, test } from 'qunit';

import { setupRenderingTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { recordIdentifierFor } from '@ember-data/store';

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
        deleteRecord() {
          return { data: null };
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

  test('BelongsToReference.value() is autotracked when value is initially null', async function (assert) {
    const user = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
        },
        relationships: {
          bestFriend: {
            data: null,
          },
        },
      },
    });
    class TestContext {
      user = user;

      get bestFriend() {
        return this.user.belongsTo('bestFriend').value();
      }
    }

    const testContext = new TestContext();
    this.set('context', testContext);
    await render(hbs`id: {{if this.context.bestFriend this.context.bestFriend.id 'null'}}`);

    assert.strictEqual(getRootElement().textContent, 'id: null', 'the value is initially correct');
    assert.strictEqual(testContext.bestFriend, null, 'the value is initially correct');
    const record = store.push({
      data: { type: 'user', id: '2', attributes: { name: 'Igor' } },
    });
    user.bestFriend = record;
    await settled();
    assert.strictEqual(getRootElement().textContent, 'id: 2', 'the value updates when we associate a record');
    assert.strictEqual(testContext.bestFriend, record, 'the value is correct after the update');
  });

  test('BelongsToReference.id() autotracking works with null value changes', async function (assert) {
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
    await user.bestFriend.destroyRecord();
    assert.strictEqual(getRootElement().textContent, 'id: null', 'the id updates when the related record is removed');
    assert.strictEqual(testContext.bestFriendId, null, 'the id is correct when the related record is removed');
    assert.strictEqual(user.bestFriend, null, 'the related record is removed');
    user.bestFriend = store.createRecord('user', { name: 'Bill', id: '7' });
    await settled();
    assert.strictEqual(getRootElement().textContent, 'id: 7', 'the id updates to 7');
    assert.strictEqual(testContext.bestFriendId, '7', 'the id is correct when we swap records');
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
    user.friends.push(bill);
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

  test('HasManyReference.value() is autotracked', async function (assert) {
    store.unloadAll();
    await settled();
    user = store.push({
      data: {
        type: 'user',
        id: '1',
        attributes: {
          name: 'Chris',
        },
        relationships: {},
      },
      included: [],
    });
    class TestContext {
      user = user;

      get friends() {
        return this.user.hasMany('friends').value();
      }
    }
    const testContext = new TestContext();
    this.set('context', testContext);
    await render(
      hbs`{{#each this.context.friends as |friend|}}id: {{if friend.id friend.id 'null'}}, {{else}}No Friends Loaded{{/each}}`
    );

    assert.strictEqual(getRootElement().textContent, 'No Friends Loaded', 'the ids are initially correct');
    assert.deepEqual(testContext.friends, null, 'the value is initially null');
    const igor = store.push({
      data: { type: 'user', id: '2', attributes: { name: 'Igor' } },
      included: [{ type: 'user', id: '1', relationships: { friends: { data: [{ type: 'user', id: '2' }] } } }],
    });
    await settled();
    assert.strictEqual(getRootElement().textContent, 'id: 2, ', 'the ManyArray is rendered once loaded');
    assert.deepEqual(testContext.friends, [igor], 'the friends are correct once loaded');
  });

  test('RecordReference.id() is autotracked', async function (assert) {
    const dan = store.createRecord('user', { name: 'Dan' });
    const identifier = recordIdentifierFor(dan);
    const reference = store.getReference(identifier);

    class TestContext {
      user = reference;

      get id() {
        return this.user.id();
      }
    }

    const testContext = new TestContext();
    this.set('context', testContext);

    await render(hbs`id: {{if this.context.id this.context.id 'null'}}`);

    assert.strictEqual(getRootElement().textContent, 'id: null', 'the id is null');
    assert.strictEqual(testContext.id, null, 'the id is correct initially');
    await dan.save();
    await settled();
    assert.strictEqual(getRootElement().textContent, 'id: 6', 'the id updates when the record id updates');
    assert.strictEqual(testContext.id, '6', 'the id is correct when the record is saved');
  });
});
