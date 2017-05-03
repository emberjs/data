/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "(ada)" }]*/

import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var Account, Topic, User, store, env;
var run = Ember.run;

var attr = DS.attr;
var hasMany = DS.hasMany;

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
        deleteRecord: () => Ember.RSVP.resolve()
      })
    });

    store = env.store;
  },

  afterEach() {
    run(function() {
      env.container.destroy();
    });
  }
});

/*
  Server loading tests
*/

test("Loading from one hasMany side reflects on the other hasMany side - async", function(assert) {
  run(function() {
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

  var topic = run(function() {
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

  run(function() {
    topic.get('users').then(assert.wait(function(fetchedUsers) {
      assert.equal(fetchedUsers.get('length'), 1, 'User relationship was set up correctly');
    }));
  });
});


test("Relationship is available from one hasMany side even if only loaded from the other hasMany side - sync", function(assert) {
  var account;
  run(function() {
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

  run(function() {
    assert.equal(account.get('users.length'), 1, 'User relationship was set up correctly');
  });
});

test("Fetching a hasMany where a record was removed reflects on the other hasMany side - async", function(assert) {
  var user, topic;
  run(function() {
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
  run(function() {
    user.get('topics').then(assert.wait(function(fetchedTopics) {
      assert.equal(fetchedTopics.get('length'), 0, 'Topics were removed correctly');
      assert.equal(fetchedTopics.objectAt(0), null, "Topics can't be fetched");
      topic.get('users').then(assert.wait(function(fetchedUsers) {
        assert.equal(fetchedUsers.get('length'), 0, 'Users were removed correctly');
        assert.equal(fetchedUsers.objectAt(0), null, "User can't be fetched");
      }));
    }));
  });
});

test("Fetching a hasMany where a record was removed reflects on the other hasMany side - sync", function(assert) {
  var account, user;
  run(function() {
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

  run(function() {
    assert.equal(user.get('accounts.length'), 0, 'Accounts were removed correctly');
    assert.equal(account.get('users.length'), 0, 'Users were removed correctly');
  });
});

/*
  Local edits
*/

test("Pushing to a hasMany reflects on the other hasMany side - async", function(assert) {
  assert.expect(1);
  var user, topic;

  run(function() {
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

  run(function() {
    topic.get('users').then(assert.wait(function(fetchedUsers) {
      fetchedUsers.pushObject(user);
      user.get('topics').then(assert.wait(function(fetchedTopics) {
        assert.equal(fetchedTopics.get('length'), 1, 'User relationship was set up correctly');
      }));
    }));
  });
});

test("Pushing to a hasMany reflects on the other hasMany side - sync", function(assert) {
  var account, stanley;
  run(function() {
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

  run(function() {
    assert.equal(account.get('users.length'), 1, 'User relationship was set up correctly');
  });
});

test("Removing a record from a hasMany reflects on the other hasMany side - async", function(assert) {
  var user, topic;
  run(function() {
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

  run(function() {
    user.get('topics').then(assert.wait(function(fetchedTopics) {
      assert.equal(fetchedTopics.get('length'), 1, 'Topics were setup correctly');
      fetchedTopics.removeObject(topic);
      topic.get('users').then(assert.wait(function(fetchedUsers) {
        assert.equal(fetchedUsers.get('length'), 0, 'Users were removed correctly');
        assert.equal(fetchedUsers.objectAt(0), null, "User can't be fetched");
      }));
    }));
  });
});

test("Removing a record from a hasMany reflects on the other hasMany side - sync", function(assert) {
  var account, user;
  run(function() {
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

  run(function() {
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
  var user, topic;
  run(function() {
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

  run(function() {
    topic.deleteRecord();
    topic.rollbackAttributes();
  });
  run(function() {
    topic.get('users').then(assert.wait(function(fetchedUsers) {
      assert.equal(fetchedUsers.get('length'), 1, 'Users are still there');
    }));
    user.get('topics').then(assert.wait(function(fetchedTopics) {
      assert.equal(fetchedTopics.get('length'), 1, 'Topic got rollbacked into the user');
    }));
  });
});

test("Deleting a record that has a hasMany relationship removes it from the otherMany array but does not remove the other record from itself - sync", function(assert) {
  var account, user;
  run(function() {
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

  run(function() {
    account.deleteRecord();
    account.rollbackAttributes();
    assert.equal(account.get('users.length'), 1, 'Users are still there');
    assert.equal(user.get('accounts.length'), 1, 'Account got rolledback correctly into the user');
  });
});

test("Rollbacking attributes for a created record that has a ManyToMany relationship works correctly - async", function(assert) {
  var user, topic;
  run(function() {
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
  run(function() {
    user.get('topics').then(assert.wait(function(fetchedTopics) {
      fetchedTopics.pushObject(topic);
      topic.rollbackAttributes();
      topic.get('users').then(assert.wait(function(fetchedUsers) {
        assert.equal(fetchedUsers.get('length'), 0, 'Users got removed');
        assert.equal(fetchedUsers.objectAt(0), null, "User can't be fetched");
      }));
      user.get('topics').then(assert.wait(function(fetchedTopics) {
        assert.equal(fetchedTopics.get('length'), 0, 'Topics got removed');
        assert.equal(fetchedTopics.objectAt(0), null, "Topic can't be fetched");
      }));
    }));
  });
});

test("Deleting a record that has a hasMany relationship removes it from the otherMany array but does not remove the other record from itself - sync", function(assert) {
  var account, user;
  run(function() {
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
  run(function() {
    account.get('users').pushObject(user);
    user.rollbackAttributes();
  });
  assert.equal(account.get('users.length'), 0, 'Users got removed');
  assert.equal(user.get('accounts.length'), 0, 'Accounts got rolledback correctly');
});


test("Re-loading a removed record should re add it to the relationship when the removed record is the last one in the relationship", function(assert) {
  var account, ada, byron;
  run(function() {
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
