import EmberObject from '@ember/object';
import { getRootElement, render, settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { hbs } from 'ember-cli-htmlbars';
import { setupRenderingTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { recordIdentifierFor } from '@ember-data/store';
import { DEBUG } from '@warp-drive/build-config/env';

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
        updateRecord(_, type, snapshot) {
          const attributes = snapshot.attributes();
          return { data: { id: snapshot.id, type: 'user', attributes } };
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
      updates = 0;

      get name() {
        return dan.name;
      }

      get id() {
        this.updates++;
        return this.user.id();
      }
    }

    const testContext = new TestContext();
    this.set('context', testContext);

    await render(hbs`id: {{if this.context.id this.context.id 'null'}}, name: {{this.context.name}}`);

    assert.strictEqual(getRootElement().textContent, 'id: null, name: Dan', 'the id is null');
    assert.strictEqual(testContext.updates, 1, 'id() was accessed by render');
    assert.strictEqual(testContext.id, null, 'the id is correct initially');
    assert.strictEqual(testContext.updates, 2, 'id() has been invoked twice');
    testContext.updates = 0;
    await dan.save();
    await settled();
    assert.strictEqual(dan.currentState.identifier.id, '6', 'identifier.id 6 was assigned by server');
    assert.strictEqual(dan.id, '6', 'id 6 was assigned by server');
    assert.strictEqual(getRootElement().textContent, 'id: 6, name: Dan', 'the id updates when the record id updates');
    assert.strictEqual(testContext.updates, 1, 'id() was accessed by render');
    assert.strictEqual(testContext.id, '6', 'the id is correct when the record is saved');
    assert.strictEqual(testContext.updates, 2, 'id() has been invoked twice');
    testContext.updates = 0;
    // Subsequent saves should *not* trigger re-render
    await dan.save();
    await settled();
    assert.strictEqual(getRootElement().textContent, 'id: 6, name: Dan', 'the id remains when the record is saved');
    assert.strictEqual(testContext.updates, 0, 'id() was NOT accessed by render');
    assert.strictEqual(testContext.id, '6', 'the id is correct when the record is saved');
    assert.strictEqual(testContext.updates, 1, 'id() has been invoked once');
    testContext.updates = 0;
    // Update via server should not trigger re-render
    dan.name = 'Daniel';
    await dan.save();
    await settled();
    assert.strictEqual(
      getRootElement().textContent,
      'id: 6, name: Daniel',
      'the id updates when the record id updates'
    );
    assert.strictEqual(testContext.updates, 0, 'id() was NOT accessed by render');
    assert.strictEqual(testContext.id, '6', 'the id is correct when the record is saved');
    assert.strictEqual(testContext.updates, 1, 'id() has been invoked once');
    testContext.updates = 0;

    if (DEBUG) {
      // Update ID via server should error
      dan.name = 'Dan';
      store.adapterFor('user').updateRecord = (_, type, snapshot) => {
        const attributes = snapshot.attributes();
        return { data: { id: '7', type: 'user', attributes } };
      };
      try {
        await dan.save();
        assert.ok(false, 'expected the update to ID to throw an error');
      } catch (e) {
        assert.strictEqual(
          e.message,
          "Assertion Failed: Expected the ID received for the primary 'user' resource being saved to match the current id '6' but received '7'.",
          'threw error'
        );
      }
    }
  });
});
