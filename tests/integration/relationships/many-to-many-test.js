/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "(ada)" }]*/

import { resolve, Promise as EmberPromise } from 'rsvp';

import { run } from '@ember/runloop';

import setupStore from 'dummy/tests/helpers/store';

import { module, test } from 'qunit';

import DS from 'ember-data';

const { attr, hasMany } = DS;

let Account, Topic, User, store, env;

module('integration/relationships/many_to_many_test - ManyToMany relationships', {
  beforeEach() {
    User = DS.Model.extend({
      name: attr('string'),
      topics: hasMany('topic', { async: true }),
      accounts: hasMany('account', { async: false })
    });

    Account = DS.Model.extend({
      state: attr(),
      users: hasMany('user', { async: false })
    });

    Topic = DS.Model.extend({
      title: attr('string'),
      users: hasMany('user', { async: true })
    });

    env = setupStore({
      user: User,
      topic: Topic,
      account: Account,
      adapter: DS.Adapter.extend({
        deleteRecord: () => resolve()
      })
    });

    store = env.store;
  },

  afterEach() {
    run(() => env.container.destroy());
  }
});

/*
  Server loading tests
*/

test("Loading from one hasMany side reflects on the other hasMany side - async", function(assert) {
  run(() => {
    store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          topics: {
            data: [{
              id: '2',
              type: 'topic'
            }, {
              id: '3',
              type: 'topic'
            }]
          }
        }
      }
    });
  });

  let topic = run(() => {
    return store.push({
      data: {
        id: '2',
        type: 'topic',
        attributes: {
          title: 'EmberFest was great'
        }
      }
    });
  });

  return run(() => {
    return topic.get('users').then(fetchedUsers => {
      assert.equal(fetchedUsers.get('length'), 1, 'User relationship was set up correctly');
    });
  });
});

test("Relationship is available from one hasMany side even if only loaded from the other hasMany side - sync", function(assert) {
  var account;
  run(() => {
    account = store.push({
      data: {
        id: '2',
        type: 'account',
        attributes: {
          state: 'lonely'
        }
      }
    });
    store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          accounts: {
            data: [{
              id: '2',
              type: 'account'
            }]
          }
        }
      }
    });
  });

  run(() => {
    assert.equal(account.get('users.length'), 1, 'User relationship was set up correctly');
  });
});

test("Fetching a hasMany where a record was removed reflects on the other hasMany side - async", function(assert) {
  let user, topic;

  run(() => {
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          topics: {
            data: [{
              id: '2',
              type: 'topic'
            }]
          }
        }
      }
    });
    topic = store.push({
      data: {
        id: '2',
        type: 'topic',
        attributes: {
          title: 'EmberFest was great'
        },
        relationships: {
          users: {
            data: []
          }
        }
      }
    });
  });

  return run(() => {
    return user.get('topics').then(fetchedTopics => {
      assert.equal(fetchedTopics.get('length'), 0, 'Topics were removed correctly');
      assert.equal(fetchedTopics.objectAt(0), null, "Topics can't be fetched");
      return topic.get('users').then(fetchedUsers => {
        assert.equal(fetchedUsers.get('length'), 0, 'Users were removed correctly');
        assert.equal(fetchedUsers.objectAt(0), null, "User can't be fetched");
      });
    });
  });
});

test("Fetching a hasMany where a record was removed reflects on the other hasMany side - sync", function(assert) {
  let account, user;
  run(() => {
    account = store.push({
      data: {
        id: '2',
        type: 'account',
        attributes: {
          state: 'lonely'
        }
      }
    });
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          accounts: {
            data: [{
              id: '2',
              type: 'account'
            }]
          }
        }
      }
    });
    account = store.push({
      data: {
        id: '2',
        type: 'account',
        attributes: {
          state: 'lonely'
        },
        relationships: {
          users: {
            data: []
          }
        }
      }
    });
  });

  run(() => {
    assert.equal(user.get('accounts.length'), 0, 'Accounts were removed correctly');
    assert.equal(account.get('users.length'), 0, 'Users were removed correctly');
  });
});

/*
  Local edits
*/

test("Pushing to a hasMany reflects on the other hasMany side - async", function(assert) {
  assert.expect(1);
  let user, topic;

  run(() => {
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          topics: {
            data: []
          }
        }
      }
    });
    topic = store.push({
      data: {
        id: '2',
        type: 'topic',
        attributes: {
          title: 'EmberFest was great'
        }
      }
    });
  });

  return run(() => {
    return topic.get('users').then(fetchedUsers => {
      fetchedUsers.pushObject(user);
      return user.get('topics').then(fetchedTopics => {
        assert.equal(fetchedTopics.get('length'), 1, 'User relationship was set up correctly');
      });
    });
  });
});

test("Pushing to a hasMany reflects on the other hasMany side - sync", function(assert) {
  let account, stanley;
  run(() => {
    account = store.push({
      data: {
        id: '2',
        type: 'account',
        attributes: {
          state: 'lonely'
        }
      }
    });
    stanley = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        }
      }
    });
    stanley.get('accounts').pushObject(account);
  });

  run(() => {
    assert.equal(account.get('users.length'), 1, 'User relationship was set up correctly');
  });
});

test("Removing a record from a hasMany reflects on the other hasMany side - async", function(assert) {
  let user, topic;
  run(() => {
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          topics: {
            data: [{
              id: '2',
              type: 'topic'
            }]
          }
        }
      }
    });
    topic = store.push({
      data: {
        id: '2',
        type: 'topic',
        attributes: {
          title: 'EmberFest was great'
        }
      }
    });
  });

  return run(() => {
    return user.get('topics').then(fetchedTopics => {
      assert.equal(fetchedTopics.get('length'), 1, 'Topics were setup correctly');
      fetchedTopics.removeObject(topic);
      return topic.get('users').then(fetchedUsers => {
        assert.equal(fetchedUsers.get('length'), 0, 'Users were removed correctly');
        assert.equal(fetchedUsers.objectAt(0), null, "User can't be fetched");
      });
    });
  });
});

test("Removing a record from a hasMany reflects on the other hasMany side - sync", function(assert) {
  let account, user;
  run(() => {
    account = store.push({
      data: {
        id: '2',
        type: 'account',
        attributes: {
          state: 'lonely'
        }
      }
    });
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          accounts: {
            data: [{
              id: '2',
              type: 'account'
            }]
          }
        }
      }
    });
  });

  run(() => {
    assert.equal(account.get('users.length'), 1, 'Users were setup correctly');
    account.get('users').removeObject(user);
    assert.equal(user.get('accounts.length'), 0, 'Accounts were removed correctly');
    assert.equal(account.get('users.length'), 0, 'Users were removed correctly');
  });
});

/*
  Rollback Attributes tests
*/

test("Rollbacking attributes for a deleted record that has a ManyToMany relationship works correctly - async", function(assert) {
  let user, topic;
  run(() => {
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          topics: {
            data: [{
              id: '2',
              type: 'topic'
            }]
          }
        }
      }
    });
    topic = store.push({
      data: {
        id: '2',
        type: 'topic',
        attributes: {
          title: 'EmberFest was great'
        }
      }
    });
  });

  run(() => {
    topic.deleteRecord();
    topic.rollbackAttributes();
  });

  return run(() => {
    let users = topic.get('users').then(fetchedUsers => {
      assert.equal(fetchedUsers.get('length'), 1, 'Users are still there');
    });

    let topics = user.get('topics').then(fetchedTopics => {
      assert.equal(fetchedTopics.get('length'), 1, 'Topic got rollbacked into the user');
    });

    return EmberPromise.all([
      users,
      topics
    ]);
  });
});

test("Deleting a record that has a hasMany relationship removes it from the otherMany array but does not remove the other record from itself - sync", function(assert) {
  let account, user;
  run(() => {
    account = store.push({
      data: {
        id: '2',
        type: 'account',
        attributes: {
          state: 'lonely'
        }
      }
    });
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          accounts: {
            data: [{
              id: '2',
              type: 'account'
            }]
          }
        }
      }
    });
  });

  run(() => {
    account.deleteRecord();
    account.rollbackAttributes();
    assert.equal(account.get('users.length'), 1, 'Users are still there');
    assert.equal(user.get('accounts.length'), 1, 'Account got rolledback correctly into the user');
  });
});

test("Rollbacking attributes for a created record that has a ManyToMany relationship works correctly - async", function(assert) {
  let user, topic;
  run(() => {
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        }
      }
    });

    topic = store.createRecord('topic');
  });

  return run(() => {
    return user.get('topics').then(fetchedTopics => {
      fetchedTopics.pushObject(topic);
      topic.rollbackAttributes();

      let users = topic.get('users').then(fetchedUsers => {
        assert.equal(fetchedUsers.get('length'), 0, 'Users got removed');
        assert.equal(fetchedUsers.objectAt(0), null, "User can't be fetched");
      });

      let topics = user.get('topics').then(fetchedTopics => {
        assert.equal(fetchedTopics.get('length'), 0, 'Topics got removed');
        assert.equal(fetchedTopics.objectAt(0), null, "Topic can't be fetched");
      });

      return EmberPromise.all([
        users,
        topics
      ]);
    });
  });
});

test("Deleting a record that has a hasMany relationship removes it from the otherMany array but does not remove the other record from itself - sync", function(assert) {
  let account, user;
  run(() => {
    account = store.push({
      data: {
        id: '2',
        type: 'account',
        attributes: {
          state: 'lonely'
        }
      }
    });

    user = store.createRecord('user');
  });

  run(() => {
    account.get('users').pushObject(user);
    user.rollbackAttributes();
  });

  assert.equal(account.get('users.length'), 0, 'Users got removed');
  assert.equal(user.get('accounts.length'), 0, 'Accounts got rolledback correctly');
});

test("Re-loading a removed record should re add it to the relationship when the removed record is the last one in the relationship", function(assert) {
  let account, ada, byron;

  run(() => {
    account = store.push({
      data: {
        id: '2',
        type: 'account',
        attributes: {
          state: 'account 1'
        }
      }
    });
    ada = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Ada Lovelace'
        },
        relationships: {
          accounts: {
            data: [{
              id: '2',
              type: 'account'
            }]
          }
        }
      }
    });
    byron = store.push({
      data: {
        id: '2',
        type: 'user',
        attributes: {
          name: 'Lord Byron'
        },
        relationships: {
          accounts: {
            data: [{
              id: '2',
              type: 'account'
            }]
          }
        }
      }
    });
    account.get('users').removeObject(byron);
    account = store.push({
      data: {
        id: '2',
        type: 'account',
        attributes: {
          state: 'account 1'
        },
        relationships: {
          users: {
            data: [{
              id: '1',
              type: 'user'
            }, {
              id: '2',
              type: 'user'
            }]
          }
        }
      }
    });
  });

  assert.equal(account.get('users.length'), 2, 'Accounts were updated correctly');
});
