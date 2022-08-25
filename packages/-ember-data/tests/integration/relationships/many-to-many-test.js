/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "(ada)" }]*/

import { get } from '@ember/object';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import todo from '@ember-data/unpublished-test-infra/test-support/todo';

module('integration/relationships/many_to_many_test - ManyToMany relationships', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const User = Model.extend({
      name: attr('string'),
      topics: hasMany('topic', { async: true, inverse: 'users' }),
      accounts: hasMany('account', { async: false, inverse: 'users' }),
    });

    const Account = Model.extend({
      state: attr(),
      users: hasMany('user', { async: false, inverse: 'accounts' }),
    });

    const Topic = Model.extend({
      title: attr('string'),
      users: hasMany('user', { async: true, inverse: 'topics' }),
    });

    this.owner.register('model:topic', Topic);
    this.owner.register('model:user', User);
    this.owner.register('model:account', Account);

    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  /*
    Server loading tests
  */

  test('Loading from one hasMany side reflects on the other hasMany side - async', async function (assert) {
    let store = this.owner.lookup('service:store');

    store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley',
        },
        relationships: {
          topics: {
            data: [
              {
                id: '2',
                type: 'topic',
              },
              {
                id: '3',
                type: 'topic',
              },
            ],
          },
        },
      },
    });

    let topic = store.push({
      data: {
        id: '2',
        type: 'topic',
        attributes: {
          title: 'EmberFest was great',
        },
      },
    });

    const fetchedUsers = await topic.users;

    assert.strictEqual(fetchedUsers.length, 1, 'User relationship was set up correctly');
  });

  test('Relationship is available from one hasMany side even if only loaded from the other hasMany side - sync', function (assert) {
    let store = this.owner.lookup('service:store');

    let account = store.push({
      data: {
        id: '2',
        type: 'account',
        attributes: {
          state: 'lonely',
        },
      },
    });
    store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley',
        },
        relationships: {
          accounts: {
            data: [
              {
                id: '2',
                type: 'account',
              },
            ],
          },
        },
      },
    });
    assert.strictEqual(account.users.length, 1, 'User relationship was set up correctly');
  });

  test('Fetching a hasMany where a record was removed reflects on the other hasMany side - async', async function (assert) {
    let store = this.owner.lookup('service:store');

    let user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley',
        },
        relationships: {
          topics: {
            data: [{ id: '2', type: 'topic' }],
          },
        },
      },
    });
    let topic = store.push({
      data: {
        id: '2',
        type: 'topic',
        attributes: {
          title: 'EmberFest was great',
        },
        relationships: {
          users: {
            data: [],
          },
        },
      },
    });

    const fetchedTopics = await user.topics;
    assert.strictEqual(fetchedTopics.length, 0, 'Topics were removed correctly');
    assert.strictEqual(fetchedTopics.at(0), undefined, "Topics can't be fetched");
    const fetchedUsers = await topic.users;
    assert.strictEqual(fetchedUsers.length, 0, 'Users were removed correctly');
    assert.strictEqual(fetchedUsers.at(0), undefined, "User can't be fetched");
  });

  test('Fetching a hasMany where a record was removed reflects on the other hasMany side - sync', function (assert) {
    let store = this.owner.lookup('service:store');

    let account = store.push({
      data: {
        id: '2',
        type: 'account',
        attributes: {
          state: 'lonely',
        },
      },
    });
    let user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley',
        },
        relationships: {
          accounts: {
            data: [
              {
                id: '2',
                type: 'account',
              },
            ],
          },
        },
      },
    });
    account = store.push({
      data: {
        id: '2',
        type: 'account',
        attributes: {
          state: 'lonely',
        },
        relationships: {
          users: {
            data: [],
          },
        },
      },
    });

    assert.strictEqual(user.accounts.length, 0, 'Accounts were removed correctly');
    assert.strictEqual(account.users.length, 0, 'Users were removed correctly');
  });

  /*
    Local edits
  */

  test('Pushing to a hasMany reflects on the other hasMany side - async', async function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');

    let user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley',
        },
        relationships: {
          topics: {
            data: [],
          },
        },
      },
    });
    let topic = store.push({
      data: {
        id: '2',
        type: 'topic',
        attributes: {
          title: 'EmberFest was great',
        },
      },
    });

    const fetchedUsers = await topic.users;
    fetchedUsers.push(user);
    const fetchedTopics = await user.topics;
    assert.strictEqual(fetchedTopics.length, 1, 'User relationship was set up correctly');
  });

  test('Pushing to a hasMany reflects on the other hasMany side - sync', function (assert) {
    let store = this.owner.lookup('service:store');

    let account = store.push({
      data: {
        id: '2',
        type: 'account',
        attributes: {
          state: 'lonely',
        },
      },
    });
    let stanley = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley',
        },
      },
    });
    stanley.accounts.push(account);

    assert.strictEqual(account.users.length, 1, 'User relationship was set up correctly');
  });

  test('Removing a record from a hasMany reflects on the other hasMany side - async', async function (assert) {
    let store = this.owner.lookup('service:store');

    const user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley',
        },
        relationships: {
          topics: {
            data: [
              {
                id: '2',
                type: 'topic',
              },
            ],
          },
        },
      },
    });
    const topic = store.push({
      data: {
        id: '2',
        type: 'topic',
        attributes: {
          title: 'EmberFest was great',
        },
      },
    });

    const fetchedTopics = await user.topics;
    assert.strictEqual(fetchedTopics.length, 1, 'Topics were setup correctly');
    fetchedTopics.splice(fetchedTopics.indexOf(topic), 1);
    const fetchedUsers = await topic.users;
    assert.strictEqual(fetchedUsers.length, 0, 'Users were removed correctly');
    assert.strictEqual(fetchedUsers.at(0), undefined, "User can't be fetched");
  });

  test('Removing a record from a hasMany reflects on the other hasMany side - sync', function (assert) {
    let store = this.owner.lookup('service:store');

    const account = store.push({
      data: {
        id: '2',
        type: 'account',
        attributes: {
          state: 'lonely',
        },
      },
    });
    const user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley',
        },
        relationships: {
          accounts: {
            data: [
              {
                id: '2',
                type: 'account',
              },
            ],
          },
        },
      },
    });

    assert.strictEqual(account.users.length, 1, 'Users were setup correctly');
    account.users.splice(account.users.indexOf(user), 1);
    assert.strictEqual(user.accounts.length, 0, 'Accounts were removed correctly');
    assert.strictEqual(account.users.length, 0, 'Users were removed correctly');
  });

  /*
    Rollback Attributes tests
  */

  test('Rollbacking attributes for a deleted record that has a ManyToMany relationship works correctly - async', async function (assert) {
    let store = this.owner.lookup('service:store');

    let user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley',
        },
        relationships: {
          topics: {
            data: [
              {
                id: '2',
                type: 'topic',
              },
            ],
          },
        },
      },
    });
    let topic = store.push({
      data: {
        id: '2',
        type: 'topic',
        attributes: {
          title: 'EmberFest was great',
        },
      },
    });

    topic.deleteRecord();
    topic.rollbackAttributes();
    await settled();

    let users = await topic.users;
    assert.strictEqual(users.length, 1, 'Users are still there');

    let topics = await user.topics;
    assert.strictEqual(topics.length, 1, 'Topic got rollbacked into the user');
  });

  test('Deleting a record that has a hasMany relationship removes it from the otherMany array but does not remove the other record from itself - sync', function (assert) {
    let store = this.owner.lookup('service:store');

    let account = store.push({
      data: {
        id: '2',
        type: 'account',
        attributes: {
          state: 'lonely',
        },
      },
    });
    let user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley',
        },
        relationships: {
          accounts: {
            data: [
              {
                id: '2',
                type: 'account',
              },
            ],
          },
        },
      },
    });
    account.deleteRecord();
    account.rollbackAttributes();
    assert.strictEqual(account.users.length, 1, 'Users are still there');
    assert.strictEqual(user.accounts.length, 1, 'Account got rolledback correctly into the user');
  });

  test('Rollbacking attributes for a created record that has a ManyToMany relationship works correctly - async', async function (assert) {
    let store = this.owner.lookup('service:store');

    let user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley',
        },
      },
    });
    let topic = store.createRecord('topic');

    let fetchedTopics = await user.topics;
    fetchedTopics.push(topic);
    topic.rollbackAttributes();

    let fetchedUsers = await topic.users;
    assert.strictEqual(fetchedUsers.length, 0, 'Users got removed');
    assert.strictEqual(fetchedUsers.at(0), undefined, "User can't be fetched");

    fetchedTopics = await user.topics;
    assert.strictEqual(fetchedTopics.length, 0, 'Topics got removed');
    assert.strictEqual(fetchedTopics.at(0), undefined, "Topic can't be fetched");
  });

  test('Deleting an unpersisted record via rollbackAttributes that has a hasMany relationship removes it from the otherMany array but does not remove the other record from itself - sync', function (assert) {
    let store = this.owner.lookup('service:store');

    let account = store.push({
      data: {
        id: '2',
        type: 'account',
        attributes: {
          state: 'lonely',
        },
      },
    });

    let user = store.createRecord('user');

    account.users.push(user);
    user.rollbackAttributes();

    assert.strictEqual(account.users.length, 0, 'Users got removed');
    assert.strictEqual(user.accounts.length, 0, 'Accounts got rolledback correctly');
  });

  todo(
    'Re-loading a removed record should re add it to the relationship when the removed record is the last one in the relationship',
    function (assert) {
      assert.expect(4);

      let store = this.owner.lookup('service:store');

      let account = store.push({
        data: {
          id: '2',
          type: 'account',
          attributes: {
            state: 'account 1',
          },
        },
      });
      let ada = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Ada Lovelace',
          },
          relationships: {
            accounts: {
              data: [
                {
                  id: '2',
                  type: 'account',
                },
              ],
            },
          },
        },
      });
      let byron = store.push({
        data: {
          id: '2',
          type: 'user',
          attributes: {
            name: 'Lord Byron',
          },
          relationships: {
            accounts: {
              data: [
                {
                  id: '2',
                  type: 'account',
                },
              ],
            },
          },
        },
      });
      account.users.splice(account.users.indexOf(byron), 1);
      account = store.push({
        data: {
          id: '2',
          type: 'account',
          attributes: {
            state: 'account 1',
          },
          relationships: {
            users: {
              data: [
                {
                  id: '1',
                  type: 'user',
                },
                {
                  id: '2',
                  type: 'user',
                },
              ],
            },
          },
        },
      });

      let state = account.hasMany('users').hasManyRelationship.remoteState;
      let users = account.users;

      assert.todo.equal(users.length, 1, 'Accounts were updated correctly (ui state)');
      assert.todo.deepEqual(
        users.map((r) => get(r, 'id')),
        ['1'],
        'Accounts were updated correctly (ui state)'
      );
      assert.strictEqual(state.length, 2, 'Accounts were updated correctly (server state)');
      assert.deepEqual(
        state.map((r) => r.id),
        ['1', '2'],
        'Accounts were updated correctly (server state)'
      );
    }
  );
});
