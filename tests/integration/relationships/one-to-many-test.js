import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var env, store, User, Message, Account;
var get = Ember.get;
var run = Ember.run;

var attr = DS.attr;
var hasMany = DS.hasMany;
var belongsTo = DS.belongsTo;

module('integration/relationships/one_to_many_test - OneToMany relationships', {
  beforeEach() {
    User = DS.Model.extend({
      name: attr('string'),
      messages: hasMany('message', { async: true }),
      accounts: hasMany('account', { async: false })
    });

    Account = DS.Model.extend({
      state: attr(),
      user: belongsTo('user', { async: false })
    });

    Message = DS.Model.extend({
      title: attr('string'),
      user: belongsTo('user', { async: true })
    });

    env = setupStore({
      user: User,
      message: Message,
      account: Account,
      adapter: DS.Adapter.extend({
        deleteRecord: () => Ember.RSVP.resolve()
      })
    });

    store = env.store;
  },

  afterEach() {
    run(env.container, 'destroy');
  }
});

/*
  Server loading tests
*/

test("Relationship is available from the belongsTo side even if only loaded from the hasMany side - async", function(assert) {
  var user, message;
  run(function () {
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          messages: {
            data: [{
              id: '2',
              type: 'message'
            }]
          }
        }
      }
    });
    message = store.push({
      data: {
        id: '2',
        type: 'message',
        attributes: {
          title: 'EmberFest was great'
        }
      }
    });
  });
  run(function() {
    message.get('user').then(function(fetchedUser) {
      assert.equal(fetchedUser, user, 'User relationship was set up correctly');
    });
  });
});

test("Relationship is available from the belongsTo side even if only loaded from the hasMany side - sync", function(assert) {
  var account, user;
  run(function () {
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
  assert.equal(account.get('user'), user, 'User relationship was set up correctly');
});

test("Relationship is available from the hasMany side even if only loaded from the belongsTo side - async", function(assert) {
  var user, message;
  run(function () {
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        }
      }
    });
    message = store.push({
      data: {
        id: '2',
        type: 'message',
        attributes: {
          title: 'EmberFest was great'
        },
        relationships: {
          user: {
            data: {
              id: '1',
              type: 'user'
            }
          }
        }
      }
    });
  });
  run(function() {
    user.get('messages').then(function(fetchedMessages) {
      assert.equal(fetchedMessages.objectAt(0), message, 'Messages relationship was set up correctly');
    });
  });
});

test("Relationship is available from the hasMany side even if only loaded from the belongsTo side - sync", function(assert) {
  var user, account;
  run(function () {
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
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
          user: {
            data: {
              id: '1',
              type: 'user'
            }
          }
        }
      }
    });
  });
  run(function() {
    assert.equal(user.get('accounts').objectAt(0), account, 'Accounts relationship was set up correctly');
  });
});

test("Fetching a belongsTo that is set to null removes the record from a relationship - async", function(assert) {
  var user;
  run(function () {
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          messages: {
            data: [{
              id: '1',
              type: 'message'
            }, {
              id: '2',
              type: 'message'
            }]
          }
        }
      }
    });
  });
  run(function () {
    store.push({
      data: [{
        id: '1',
        type: 'message',
        attributes: {
          title: 'EmberFest was great'
        },
        relationships: {
          user: {
            data: {
              id: '1',
              type: 'user'
            }
          }
        }
      },
      {
        id: '2',
        type: 'message',
        attributes: {
          title: 'EmberConf will be better'
        },
        relationships: {
          user: {
            data: null
          }
        }
      }]
    });
  });
  run(function() {
    user.get('messages').then(function(fetchedMessages) {
      assert.equal(get(fetchedMessages, 'length'), 1, 'Messages relationship was set up correctly');
    });
  });
});

test("Fetching a belongsTo that is set to null removes the record from a relationship - sync", function(assert) {
  var user;
  run(function () {
    store.push({
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

    store.push({
      data: {
        id: '2',
        type: 'account',
        attributes: {
          state: 'lonely'
        },
        relationships: {
          user: {
            data: null
          }
        }
      }
    });
  });

  run(function() {
    assert.equal(user.get('accounts').objectAt(0), null, 'Account was sucesfully removed');
  });
});

test("Fetching a belongsTo that is not defined does not remove the record from a relationship - async", function(assert) {
  var user;
  run(function () {
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          messages: {
            data: [{
              id: '1',
              type: 'message'
            }, {
              id: '2',
              type: 'message'
            }]
          }
        }
      }
    });
  });
  run(function () {
    store.push({
      data: [{
        id: '1',
        type: 'message',
        attributes: {
          title: 'EmberFest was great'
        },
        relationships: {
          user: {
            data: {
              id: '1',
              type: 'user'
            }
          }
        }
      }, {
        id: '2',
        type: 'message',
        attributes: {
          title: 'EmberConf will be better'
        }
      }]
    });
  });
  run(function() {
    user.get('messages').then(function(fetchedMessages) {
      assert.equal(get(fetchedMessages, 'length'), 2, 'Messages relationship was set up correctly');
    });
  });
});

test("Fetching a belongsTo that is not defined does not remove the record from a relationship - sync", function(assert) {
  var account, user;
  run(function () {
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
        }
      }
    });
  });

  run(function() {
    assert.equal(user.get('accounts').objectAt(0), account, 'Account was sucesfully removed');
  });
});

test("Fetching the hasMany that doesn't contain the belongsTo, sets the belongsTo to null - async", function(assert) {
  var user, message, message2;
  run(function () {
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          messages: {
            data: [{
              id: '1',
              type: 'message'
            }]
          }
        }
      }
    });
    message = store.push({
      data: {
        id: '1',
        type: 'message',
        attributes: {
          title: 'EmberFest was great'
        },
        relationships: {
          user: {
            data: {
              id: '1',
              type: 'user'
            }
          }
        }
      }
    });
    message2 = store.push({
      data: {
        id: '2',
        type: 'message',
        attributes: {
          title: 'EmberConf is gonna be better'
        }
      }
    });
  });
  run(function () {
    store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          messages: {
            data: [{
              id: '2',
              type: 'message'
            }]
          }
        }
      }
    });
  });
  run(function() {
    message.get('user').then(function(fetchedUser) {
      assert.equal(fetchedUser, null, 'User was removed correctly');
    });

    message2.get('user').then(function(fetchedUser) {
      assert.equal(fetchedUser, user, 'User was set on the second message');
    });
  });
});

test("Fetching the hasMany that doesn't contain the belongsTo, sets the belongsTo to null - sync", function(assert) {
  var account;
  run(function () {
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
              id: '1',
              type: 'account'
            }]
          }
        }
      }
    });
    account = store.push({
      data: {
        id: '1',
        type: 'account',
        attributes: {
          state: 'great'
        },
        relationships: {
          user: {
            data: {
              id: '1',
              type: 'user'
            }
          }
        }
      }
    });
    store.push({
      data: {
        id: '2',
        type: 'account',
        attributes: {
          state: 'awesome'
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
    assert.equal(account.get('user'), null, 'User was removed correctly');
  });
});

test("Fetching the hasMany side where the hasMany is undefined does not change the belongsTo side - async", function(assert) {
  var message, user;
  run(function () {
    store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          messages: {
            data: [{
              id: '1',
              type: 'message'
            }]
          }
        }
      }
    });
    message = store.push({
      data: {
        id: '1',
        type: 'message',
        attributes: {
          title: 'EmberFest was great'
        },
        relationships: {
          user: {
            data: {
              id: '1',
              type: 'user'
            }
          }
        }
      }
    });
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        }
      }
    });
  });

  run(function() {
    message.get('user').then(function(fetchedUser) {
      assert.equal(fetchedUser, user, 'User was not removed');
    });
  });
});

test("Fetching the hasMany side where the hasMany is undefined does not change the belongsTo side - sync", function(assert) {
  var account, user;
  run(function () {
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
              id: '1',
              type: 'account'
            }]
          }
        }
      }
    });
    account = store.push({
      data: {
        id: '1',
        type: 'account',
        attributes: {
          state: 'great'
        },
        relationships: {
          user: {
            data: {
              id: '1',
              type: 'user'
            }
          }
        }
      }
    });
    store.push({
      data: {
        id: '2',
        type: 'account',
        attributes: {
          state: 'awesome'
        }
      }
    });
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        }
      }
    });
  });

  run(function() {
    assert.equal(account.get('user'), user, 'User was not removed');
  });
});

/*
  Local edits
*/

test("Pushing to the hasMany reflects the change on the belongsTo side - async", function(assert) {
  var user, message2;
  run(function () {
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          messages: {
            data: [{
              id: '1',
              type: 'message'
            }]
          }
        }
      }
    });
    store.push({
      data: {
        id: '1',
        type: 'message',
        attributes: {
          title: 'EmberFest was great'
        }
      }
    });
    message2 = store.push({
      data: {
        id: '2',
        type: 'message',
        attributes: {
          title: 'EmberFest was great'
        }
      }
    });
  });

  run(function() {
    user.get('messages').then(function(fetchedMessages) {
      fetchedMessages.pushObject(message2);
      message2.get('user').then(function(fetchedUser) {
        assert.equal(fetchedUser, user, "user got set correctly");
      });
    });
  });
});

test("Pushing to the hasMany reflects the change on the belongsTo side - sync", function(assert) {
  var user, account2;
  run(function () {
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
              id: '1',
              type: 'account'
            }]
          }
        }
      }
    });
    store.push({
      data: {
        id: '1',
        type: 'account',
        attributes: {
          state: 'great'
        },
        relationships: {
          user: {
            data: {
              id: '1',
              type: 'user'
            }
          }
        }
      }
    });

    account2 = store.push({
      data: {
        id: '2',
        type: 'account',
        attributes: {
          state: 'awesome'
        }
      }
    });
    user.get('accounts').pushObject(account2);
  });

  assert.equal(account2.get('user'), user, 'user got set correctly');
});

test("Removing from the hasMany side reflects the change on the belongsTo side - async", function(assert) {
  var user, message;
  run(function () {
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          messages: {
            data: [{
              id: '1',
              type: 'message'
            }]
          }
        }
      }
    });
    message = store.push({
      data: {
        id: '1',
        type: 'message',
        attributes: {
          title: 'EmberFest was great'
        }
      }
    });
  });

  run(function() {
    user.get('messages').then(function(fetchedMessages) {
      fetchedMessages.removeObject(message);
      message.get('user').then(function(fetchedUser) {
        assert.equal(fetchedUser, null, "user got removed correctly");
      });
    });
  });
});

test("Removing from the hasMany side reflects the change on the belongsTo side - sync", function(assert) {
  var user, account;
  run(function () {
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attirbutes: {
          name: 'Stanley'
        },
        relationships: {
          accounts: {
            data: [{
              id: '1',
              type: 'account'
            }]
          }
        }
      }
    });
    account = store.push({
      data: {
        id: '1',
        type: 'account',
        attirbutes: {
          state: 'great'
        },
        relationships: {
          user: {
            data: {
              id: '1',
              type: 'user'
            }
          }
        }
      }
    });
  });
  run(function() {
    user.get('accounts').removeObject(account);
  });

  assert.equal(account.get('user'), null, 'user got removed correctly');
});

test("Pushing to the hasMany side keeps the oneToMany invariant on the belongsTo side - async", function(assert) {
  assert.expect(2);
  var user, user2, message;
  run(function () {
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          messages: {
            data: [{
              id: '1',
              type: 'message'
            }]
          }
        }
      }
    });
    user2 = store.push({
      data: {
        id: '2',
        type: 'user',
        attributes: {
          name: 'Tomhuda'
        }
      }
    });
    message = store.push({
      data: {
        id: '1',
        type: 'message',
        attributes: {
          title: 'EmberFest was great'
        }
      }
    });
  });

  run(function() {
    user2.get('messages').then(function(fetchedMessages) {
      fetchedMessages.pushObject(message);

      message.get('user').then(function(fetchedUser) {
        assert.equal(fetchedUser, user2, "user got set correctly");
      });

      user.get('messages').then(function(newFetchedMessages) {
        assert.equal(get(newFetchedMessages, 'length'), 0, 'message got removed from the old messages hasMany');
      });
    });
  });
});

test("Pushing to the hasMany side keeps the oneToMany invariant - sync", function(assert) {
  var user, user2, account;
  run(function () {
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
              id: '1',
              type: 'account'
            }]
          }
        }
      }
    });
    user2 = store.push({
      data: {
        id: '2',
        type: 'user',
        attributes: {
          name: 'Stanley'
        }
      }
    });
    account = store.push({
      data: {
        id: '1',
        type: 'account',
        attributes: {
          state: 'great'
        }
      }
    });
    user2.get('accounts').pushObject(account);
  });
  assert.equal(account.get('user'), user2, 'user got set correctly');
  assert.equal(user.get('accounts.length'), 0, 'the account got removed correctly');
  assert.equal(user2.get('accounts.length'), 1, 'the account got pushed correctly');
});

test("Setting the belongsTo side keeps the oneToMany invariant on the hasMany- async", function(assert) {
  assert.expect(2);
  var user, user2, message;
  run(function () {
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          messages: {
            data: [{
              id: '1',
              type: 'message'
            }]
          }
        }
      }
    });
    user2 = store.push({
      data: {
        id: '2',
        type: 'user',
        attributes: {
          name: 'Tomhuda'
        }
      }
    });
    message = store.push({
      data: {
        id: '1',
        type: 'message',
        attributes: {
          title: 'EmberFest was great'
        },
        relationships: {
          user: {
            data: {
              id: '1',
              type: 'user'
            }
          }
        }
      }
    });
    message.set('user', user2);
  });

  run(function() {
    user.get('messages').then(function(fetchedMessages) {
      assert.equal(get(fetchedMessages, 'length'), 0, 'message got removed from the first user correctly');
    });
  });
  run(function() {
    user2.get('messages').then(function(fetchedMessages) {
      assert.equal(get(fetchedMessages, 'length'), 1, 'message got added to the second user correctly');
    });
  });
});

test("Setting the belongsTo side keeps the oneToMany invariant on the hasMany- sync", function(assert) {
  var user, user2, account;
  run(function () {
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
              id: '1',
              type: 'account'
            }]
          }
        }
      }
    });
    user2 = store.push({
      data: {
        id: '2',
        type: 'user',
        attributes: {
          name: 'Stanley'
        }
      }
    });
    account = store.push({
      data: {
        id: '1',
        type: 'account',
        attributes: {
          state: 'great'
        },
        relationships: {
          user: {
            data: {
              id: '1',
              type: 'user'
            }
          }
        }
      }
    });
    account.set('user', user2);
  });
  assert.equal(account.get('user'), user2, 'user got set correctly');
  assert.equal(user.get('accounts.length'), 0, 'the account got removed correctly');
  assert.equal(user2.get('accounts.length'), 1, 'the account got pushed correctly');
});


test("Setting the belongsTo side to null removes the record from the hasMany side - async", function(assert) {
  assert.expect(2);
  var user, message;
  run(function () {
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          messages: {
            data: [{
              id: '1',
              type: 'message'
            }]
          }
        }
      }
    });
    message = store.push({
      data: {
        id: '1',
        type: 'message',
        attributes: {
          title: 'EmberFest was great'
        },
        relationships: {
          user: {
            data: {
              id: '1',
              type: 'user'
            }
          }
        }
      }
    });
    message.set('user', null);
  });
  run(function() {
    user.get('messages').then(function(fetchedMessages) {
      assert.equal(get(fetchedMessages, 'length'), 0, 'message got removed from the  user correctly');
    });
  });

  run(function() {
    message.get('user').then(function(fetchedUser) {
      assert.equal(fetchedUser, null, 'user got set to null correctly');
    });
  });
});

test("Setting the belongsTo side to null removes the record from the hasMany side - sync", function(assert) {
  var user, account;
  run(function () {
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
              id: '1',
              type: 'account'
            }]
          }
        }
      }
    });
    account = store.push({
      data: {
        id: '1',
        type: 'account',
        attributes: {
          state: 'great'
        },
        relationships: {
          user: {
            data: {
              id: '1',
              type: 'user'
            }
          }
        }
      }
    });
    account.set('user', null);
  });

  assert.equal(account.get('user'), null, 'user got set to null correctly');

  assert.equal(user.get('accounts.length'), 0, 'the account got removed correctly');
});

/*
Rollback attributes from deleted state
*/

test("Rollbacking attributes of a deleted record works correctly when the hasMany side has been deleted - async", function(assert) {
  var user, message;
  run(function () {
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          messages: {
            data: [{
              id: '2',
              type: 'message'
            }]
          }
        }
      }
    });
    message = store.push({
      data: {
        id: '2',
        type: 'message',
        attributes: {
          title: 'EmberFest was great'
        }
      }
    });
  });
  run(function() {
    message.deleteRecord();
    message.rollbackAttributes();
  });
  run(function() {
    message.get('user').then(function(fetchedUser) {
      assert.equal(fetchedUser, user, 'Message still has the user');
    });
    user.get('messages').then(function(fetchedMessages) {
      assert.equal(fetchedMessages.objectAt(0), message, 'User has the message');
    });
  });
});

test("Rollbacking attributes of a deleted record works correctly when the hasMany side has been deleted - sync", function(assert) {
  var account, user;
  run(function () {
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
    assert.equal(user.get('accounts.length'), 1, "Accounts are rolled back");
    assert.equal(account.get('user'), user, 'Account still has the user');
  });
});

test("Rollbacking attributes of deleted record works correctly when the belongsTo side has been deleted - async", function(assert) {
  var user, message;
  run(function () {
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        },
        relationships: {
          messages: {
            data: [{
              id: '2',
              type: 'message'
            }]
          }
        }
      }
    });
    message = store.push({
      data: {
        id: '2',
        type: 'message',
        attributes: {
          title: 'EmberFest was great'
        }
      }
    });
  });
  run(function() {
    user.deleteRecord();
    user.rollbackAttributes();
  });
  run(function() {
    message.get('user').then(function(fetchedUser) {
      assert.equal(fetchedUser, user, 'Message has the user again');
    });
    user.get('messages').then(function(fetchedMessages) {
      assert.equal(fetchedMessages.get('length'), 1, 'User still has the messages');
    });
  });
});

test("Rollbacking attributes of a deleted record works correctly when the belongsTo side has been deleted - sync", function(assert) {
  var account, user;
  run(function () {
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
    user.deleteRecord();
    user.rollbackAttributes();
    assert.equal(user.get('accounts.length'), 1, "User still has the accounts");
    assert.equal(account.get('user'), user, 'Account has the user again');
  });
});

/*
Rollback attributes from created state
*/

test("Rollbacking attributes of a created record works correctly when the hasMany side has been created - async", function(assert) {
  var user, message;
  run(function () {
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        }
      }
    });
    message = store.createRecord('message', {
      user: user
    });
  });
  run(message, 'rollbackAttributes');
  run(function() {
    message.get('user').then(function(fetchedUser) {
      assert.equal(fetchedUser, null, 'Message does not have the user anymore');
    });
    user.get('messages').then(function(fetchedMessages) {
      assert.equal(fetchedMessages.get('length'), 0, message, 'User does not have the message anymore');
      assert.equal(fetchedMessages.get('firstObject'), null, "User message can't be accessed");
    });
  });
});

test("Rollbacking attributes of a created record works correctly when the hasMany side has been created - sync", function(assert) {
  var user, account;
  run(function () {
    user = store.push({
      data: {
        id: '1',
        type: 'user',
        attributes: {
          name: 'Stanley'
        }
      }
    });
    account = store.createRecord('account', {
      user: user
    });
  });
  run(account, 'rollbackAttributes');
  assert.equal(user.get('accounts.length'), 0, "Accounts are rolled back");
  assert.equal(account.get('user'), null, 'Account does not have the user anymore');
});

test("Rollbacking attributes of a created record works correctly when the belongsTo side has been created - async", function(assert) {
  var message, user;
  run(function () {
    message = store.push({
      data: {
        id: '2',
        type: 'message',
        attributes: {
          title: 'EmberFest was great'
        }
      }
    });
    user = store.createRecord('user');
  });
  run(function() {
    user.get('messages').then(function(messages) {
      messages.pushObject(message);
      user.rollbackAttributes();
      message.get('user').then(function(fetchedUser) {
        assert.equal(fetchedUser, null, 'Message does not have the user anymore');
      });
      user.get('messages').then(function(fetchedMessages) {
        assert.equal(fetchedMessages.get('length'), 0, 'User does not have the message anymore');
        assert.equal(fetchedMessages.get('firstObject'), null, "User message can't be accessed");
      });
    });
  });
});

test("Rollbacking attributes of a created record works correctly when the belongsTo side has been created - sync", function(assert) {
  var account, user;
  run(function () {
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
    user.get('accounts').pushObject(account);
  });
  run(user, 'rollbackAttributes');
  assert.equal(user.get('accounts.length'), 0, "User does not have the account anymore");
  assert.equal(account.get('user'), null, 'Account does not have the user anymore');
});
