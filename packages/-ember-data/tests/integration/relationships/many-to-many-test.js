/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "(ada)" }]*/

import { get } from '@ember/object';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { Promise as EmberPromise } from 'rsvp';

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
      topics: hasMany('topic', { async: true }),
      accounts: hasMany('account', { async: false }),
    });

    const Account = Model.extend({
      state: attr(),
      users: hasMany('user', { async: false }),
    });

    const Topic = Model.extend({
      title: attr('string'),
      users: hasMany('user', { async: true }),
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

  test('Loading from one hasMany side reflects on the other hasMany side - async', function (assert) {
    let store = this.owner.lookup('service:store');

    run(() => {
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
    });

    let topic = run(() => {
      return store.push({
        data: {
          id: '2',
          type: 'topic',
          attributes: {
            title: 'EmberFest was great',
          },
        },
      });
    });

    return run(() => {
      return topic.get('users').then((fetchedUsers) => {
        assert.strictEqual(fetchedUsers.get('length'), 1, 'User relationship was set up correctly');
      });
    });
  });

  test('Relationship is available from one hasMany side even if only loaded from the other hasMany side - sync', function (assert) {
    let store = this.owner.lookup('service:store');

    var account;
    run(() => {
      account = store.push({
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
    });

    run(() => {
      assert.strictEqual(account.get('users.length'), 1, 'User relationship was set up correctly');
    });
  });

  test('Fetching a hasMany where a record was removed reflects on the other hasMany side - async', function (assert) {
    let store = this.owner.lookup('service:store');

    let user, topic;
    run(() => {
      user = store.push({
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
      topic = store.push({
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
    });

    return run(() => {
      return user.get('topics').then((fetchedTopics) => {
        assert.strictEqual(fetchedTopics.get('length'), 0, 'Topics were removed correctly');
        assert.strictEqual(fetchedTopics.objectAt(0), undefined, "Topics can't be fetched");
        return topic.get('users').then((fetchedUsers) => {
          assert.strictEqual(fetchedUsers.get('length'), 0, 'Users were removed correctly');
          assert.strictEqual(fetchedUsers.objectAt(0), undefined, "User can't be fetched");
        });
      });
    });
  });

  test('Fetching a hasMany where a record was removed reflects on the other hasMany side - sync', function (assert) {
    let store = this.owner.lookup('service:store');

    let account, user;
    run(() => {
      account = store.push({
        data: {
          id: '2',
          type: 'account',
          attributes: {
            state: 'lonely',
          },
        },
      });
      user = store.push({
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
    });

    run(() => {
      assert.strictEqual(user.get('accounts.length'), 0, 'Accounts were removed correctly');
      assert.strictEqual(account.get('users.length'), 0, 'Users were removed correctly');
    });
  });

  /*
    Local edits
  */

  test('Pushing to a hasMany reflects on the other hasMany side - async', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');

    let user, topic;

    run(() => {
      user = store.push({
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
      topic = store.push({
        data: {
          id: '2',
          type: 'topic',
          attributes: {
            title: 'EmberFest was great',
          },
        },
      });
    });

    return run(() => {
      return topic.get('users').then((fetchedUsers) => {
        fetchedUsers.pushObject(user);
        return user.get('topics').then((fetchedTopics) => {
          assert.strictEqual(fetchedTopics.get('length'), 1, 'User relationship was set up correctly');
        });
      });
    });
  });

  test('Pushing to a hasMany reflects on the other hasMany side - sync', function (assert) {
    let store = this.owner.lookup('service:store');

    let account, stanley;
    run(() => {
      account = store.push({
        data: {
          id: '2',
          type: 'account',
          attributes: {
            state: 'lonely',
          },
        },
      });
      stanley = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
        },
      });
      stanley.get('accounts').pushObject(account);
    });

    run(() => {
      assert.strictEqual(account.get('users.length'), 1, 'User relationship was set up correctly');
    });
  });

  test('Removing a record from a hasMany reflects on the other hasMany side - async', function (assert) {
    let store = this.owner.lookup('service:store');

    let user, topic;
    run(() => {
      user = store.push({
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
      topic = store.push({
        data: {
          id: '2',
          type: 'topic',
          attributes: {
            title: 'EmberFest was great',
          },
        },
      });
    });

    return run(() => {
      return user.get('topics').then((fetchedTopics) => {
        assert.strictEqual(fetchedTopics.get('length'), 1, 'Topics were setup correctly');
        fetchedTopics.removeObject(topic);
        return topic.get('users').then((fetchedUsers) => {
          assert.strictEqual(fetchedUsers.get('length'), 0, 'Users were removed correctly');
          assert.strictEqual(fetchedUsers.objectAt(0), undefined, "User can't be fetched");
        });
      });
    });
  });

  test('Removing a record from a hasMany reflects on the other hasMany side - sync', function (assert) {
    let store = this.owner.lookup('service:store');

    let account, user;
    run(() => {
      account = store.push({
        data: {
          id: '2',
          type: 'account',
          attributes: {
            state: 'lonely',
          },
        },
      });
      user = store.push({
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
    });

    run(() => {
      assert.strictEqual(account.get('users.length'), 1, 'Users were setup correctly');
      account.get('users').removeObject(user);
      assert.strictEqual(user.get('accounts.length'), 0, 'Accounts were removed correctly');
      assert.strictEqual(account.get('users.length'), 0, 'Users were removed correctly');
    });
  });

  /*
    Rollback Attributes tests
  */

  test('Rollbacking attributes for a deleted record that has a ManyToMany relationship works correctly - async', function (assert) {
    let store = this.owner.lookup('service:store');

    let user, topic;
    run(() => {
      user = store.push({
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
      topic = store.push({
        data: {
          id: '2',
          type: 'topic',
          attributes: {
            title: 'EmberFest was great',
          },
        },
      });
    });

    run(() => {
      topic.deleteRecord();
      topic.rollbackAttributes();
    });

    return run(() => {
      let users = topic.get('users').then((fetchedUsers) => {
        assert.strictEqual(fetchedUsers.get('length'), 1, 'Users are still there');
      });

      let topics = user.get('topics').then((fetchedTopics) => {
        assert.strictEqual(fetchedTopics.get('length'), 1, 'Topic got rollbacked into the user');
      });

      return EmberPromise.all([users, topics]);
    });
  });

  test('Deleting a record that has a hasMany relationship removes it from the otherMany array but does not remove the other record from itself - sync', function (assert) {
    let store = this.owner.lookup('service:store');

    let account, user;
    run(() => {
      account = store.push({
        data: {
          id: '2',
          type: 'account',
          attributes: {
            state: 'lonely',
          },
        },
      });
      user = store.push({
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
    });

    run(() => {
      account.deleteRecord();
      account.rollbackAttributes();
      assert.strictEqual(account.get('users.length'), 1, 'Users are still there');
      assert.strictEqual(user.get('accounts.length'), 1, 'Account got rolledback correctly into the user');
    });
  });

  test('Rollbacking attributes for a created record that has a ManyToMany relationship works correctly - async', function (assert) {
    let store = this.owner.lookup('service:store');

    let user, topic;
    run(() => {
      user = store.push({
        data: {
          id: '1',
          type: 'user',
          attributes: {
            name: 'Stanley',
          },
        },
      });

      topic = store.createRecord('topic');
    });

    return run(() => {
      return user.get('topics').then((fetchedTopics) => {
        fetchedTopics.pushObject(topic);
        topic.rollbackAttributes();

        let users = topic.get('users').then((fetchedUsers) => {
          assert.strictEqual(fetchedUsers.get('length'), 0, 'Users got removed');
          assert.strictEqual(fetchedUsers.objectAt(0), undefined, "User can't be fetched");
        });

        let topics = user.get('topics').then((fetchedTopics) => {
          assert.strictEqual(fetchedTopics.get('length'), 0, 'Topics got removed');
          assert.strictEqual(fetchedTopics.objectAt(0), undefined, "Topic can't be fetched");
        });

        return EmberPromise.all([users, topics]);
      });
    });
  });

  test('Deleting an unpersisted record via rollbackAttributes that has a hasMany relationship removes it from the otherMany array but does not remove the other record from itself - sync', function (assert) {
    let store = this.owner.lookup('service:store');

    let account, user;
    run(() => {
      account = store.push({
        data: {
          id: '2',
          type: 'account',
          attributes: {
            state: 'lonely',
          },
        },
      });

      user = store.createRecord('user');
    });

    run(() => {
      account.get('users').pushObject(user);
      user.rollbackAttributes();
    });

    assert.strictEqual(account.get('users.length'), 0, 'Users got removed');
    assert.strictEqual(user.get('accounts.length'), 0, 'Accounts got rolledback correctly');
  });

  todo(
    'Re-loading a removed record should re add it to the relationship when the removed record is the last one in the relationship',
    function (assert) {
      assert.expect(4);

      let store = this.owner.lookup('service:store');

      let account;

      run(() => {
        account = store.push({
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
        account.get('users').removeObject(byron);
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
      });

      let state = account.hasMany('users').hasManyRelationship.canonicalState;
      let users = account.get('users');

      assert.todo.equal(users.get('length'), 1, 'Accounts were updated correctly (ui state)');
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
