var Post, Account, Message, User, store, env;
var env, store, User, Message, Post, Comment;
var get = Ember.get, set = Ember.set;

var attr = DS.attr, hasMany = DS.hasMany, belongsTo = DS.belongsTo;
var resolve = Ember.RSVP.resolve, hash = Ember.RSVP.hash;

function stringify(string) {
  return function() { return string; };
}

module('integration/relationships/one_to_many_test - OneToMany relationships', {
  setup: function() {
    User = DS.Model.extend({
      name: attr('string'),
      messages: hasMany('message', {async: true}),
      accounts: hasMany('account')
    });
    User.toString = stringify('User');

    Account = DS.Model.extend({
      state: attr(),
      user: belongsTo('user')
    });
    Account.toString = stringify('Account');

    Message = DS.Model.extend({
      title: attr('string'),
      user: belongsTo('user', {async: true})
    });
    Message.toString = stringify('Message');

    env = setupStore({
      user: User,
      message: Message,
      account: Account
    });

    store = env.store;
  },

  teardown: function() {
    env.container.destroy();
  }
});

/*
  Server loading tests
*/

test("Relationship is available from the belongsTo side even if only loaded from the hasMany side - async", function () {
  var user = store.push('user', {id:1, name: 'Stanley', messages: [2, 3]});
  var message = store.push('message', {id: 2, title: 'EmberFest was great'});
  message.get('user').then(async(function(fetchedUser) {
    equal(fetchedUser, user, 'User relationship was set up correctly');
  }));
});

test("Relationship is available from the belongsTo side even if only loaded from the hasMany side - sync", function () {
  var account = store.push('account', {id:2 , state: 'lonely'});
  var user = store.push('user', {id:1, name: 'Stanley', accounts: [2]});
  equal(account.get('user'), user, 'User relationship was set up correctly');
});

test("Relationship is available from the hasMany side even if only loaded from the belongsTo side - async", function () {
  var user = store.push('user', {id:1, name: 'Stanley'});
  var message = store.push('message', {id: 2, title: 'EmberFest was great', user:1});
  user.get('messages').then(async(function(fetchedMessages) {
    equal(fetchedMessages.objectAt(0), message, 'Messages relationship was set up correctly');
  }));
});

test("Relationship is available from the hasMany side even if only loaded from the belongsTo side - sync", function () {
  var user = store.push('user', {id:1, name: 'Stanley'});
  var account = store.push('account', {id:2 , state: 'lonely', user:1});
  equal(user.get('accounts').objectAt(0), account, 'Accounts relationship was set up correctly');
});

test("Fetching a belongsTo that is set to null removes the record from a relationship - async", function () {
  var user = store.push('user', {id:1, name: 'Stanley', messages: [1,2]});
  store.push('message', {id: 1, title: 'EmberFest was great', user:1});
  store.push('message', {id: 2, title: 'EmberConf will be better', user:null});
  user.get('messages').then(async(function(fetchedMessages) {
    equal(get(fetchedMessages, 'length'), 1, 'Messages relationship was set up correctly');
  }));
});

test("Fetching a belongsTo that is set to null removes the record from a relationship - sync", function () {
  var account = store.push('account', {id:2 , state: 'lonely'});
  var user = store.push('user', {id:1, name: 'Stanley', accounts: [2]});
  account = store.push('account', {id:2 , state: 'lonely', user:null});
  equal(user.get('accounts').objectAt(0), null, 'Account was sucesfully removed');
});

test("Fetching a belongsTo that is not defined does not remove the record from a relationship - async", function () {
  var user = store.push('user', {id:1, name: 'Stanley', messages: [1,2]});
  store.push('message', {id: 1, title: 'EmberFest was great', user:1});
  store.push('message', {id: 2, title: 'EmberConf will be better'});
  user.get('messages').then(async(function(fetchedMessages) {
    equal(get(fetchedMessages, 'length'), 2, 'Messages relationship was set up correctly');
  }));
});

test("Fetching a belongsTo that is not defined does not remove the record from a relationship - sync", function () {
  var account = store.push('account', {id:2 , state: 'lonely'});
  var user = store.push('user', {id:1, name: 'Stanley', accounts: [2]});
  account = store.push('account', {id:2 , state: 'lonely'});
  equal(user.get('accounts').objectAt(0), account, 'Account was sucesfully removed');
});

test("Fetching the hasMany that doesn't contain the belongsTo, sets the belongsTo to null - async", function () {
  var user = store.push('user', {id:1, name: 'Stanley', messages: [1]});
  var message = store.push('message', {id: 1, title: 'EmberFest was great', user:1});
  var message2 = store.push('message', {id: 2, title: 'EmberConf is gonna be better'});
  store.push('user', {id:1, name: 'Stanley', messages: [2]});

  message.get('user').then(async(function(fetchedUser) {
    equal(fetchedUser, null, 'User was removed correctly');
  }));

  message2.get('user').then(async(function(fetchedUser) {
    equal(fetchedUser, user, 'User was set on the second message');
  }));
});

test("Fetching the hasMany that doesn't contain the belongsTo, sets the belongsTo to null - sync", function () {
  store.push('user', {id:1, name: 'Stanley', accounts: [1]});
  var account = store.push('account', {id: 1, state: 'great', user:1});
  store.push('account', {id: 2, state: 'awesome'});
  store.push('user', {id:1, name: 'Stanley', accounts: [2]});

  equal(account.get('user'), null, 'User was removed correctly');
});

test("Fetching the hasMany side where the hasMany is undefined does not change the belongsTo side - async", function () {
  store.push('user', {id:1, name: 'Stanley', messages: [1]});
  var message = store.push('message', {id: 1, title: 'EmberFest was great', user:1});
  var user = store.push('user', {id:1, name: 'Stanley'});

  message.get('user').then(async(function(fetchedUser) {
    equal(fetchedUser, user, 'User was not removed');
  }));
});

test("Fetching the hasMany side where the hasMany is undefined does not change the belongsTo side - sync", function () {
  store.push('user', {id:1, name: 'Stanley', accounts: [1]});
  var account = store.push('account', {id: 1, state: 'great', user:1});
  store.push('account', {id: 2, state: 'awesome'});
  var user = store.push('user', {id:1, name: 'Stanley'});

  equal(account.get('user'), user, 'User was not removed');
});

/*
  Local edits
*/

test("Pushing to the hasMany reflects the change on the belongsTo side - async", function () {
  var user =  store.push('user', {id:1, name: 'Stanley', messages: [1]});
  store.push('message', {id: 1, title: 'EmberFest was great'});
  var message2 = store.push('message', {id: 2, title: 'EmberFest was great'});

  user.get('messages').then(async(function(fetchedMessages) {
    fetchedMessages.pushObject(message2);
    message2.get('user').then(async(function(fetchedUser) {
      equal(fetchedUser, user, "user got set correctly");
    }));
  }));
});

test("Pushing to the hasMany reflects the change on the belongsTo side - sync", function () {
  var user = store.push('user', {id:1, name: 'Stanley', accounts: [1]});
  store.push('account', {id: 1, state: 'great', user:1});

  var account2 = store.push('account', {id: 2, state: 'awesome'});
  user.get('accounts').pushObject(account2);

  equal(account2.get('user'), user, 'user got set correctly');
});

test("Removing from the hasMany side reflects the change on the belongsTo side - async", function () {
  var user = store.push('user', {id:1, name: 'Stanley', messages: [1]});
  var message = store.push('message', {id: 1, title: 'EmberFest was great'});

  user.get('messages').then(async(function(fetchedMessages) {
    fetchedMessages.removeObject(message);
    message.get('user').then(async(function(fetchedUser) {
      equal(fetchedUser, null, "user got removed correctly");
    }));
  }));
});

test("Removing from the hasMany side reflects the change on the belongsTo side - sync", function () {
  var user = store.push('user', {id:1, name: 'Stanley', accounts: [1]});
  var account = store.push('account', {id: 1, state: 'great', user:1});

  user.get('accounts').removeObject(account);

  equal(account.get('user'), null, 'user got removed correctly');
});

test("Pushing to the hasMany side keeps the oneToMany invariant on the belongsTo side - async", function () {
  expect(2);
  var user =  store.push('user', {id:1, name: 'Stanley', messages: [1]});
  var user2 =  store.push('user', {id:2, name: 'Tomhuda'});
  var message = store.push('message', {id: 1, title: 'EmberFest was great'});

  user2.get('messages').then(async(function(fetchedMessages) {
    fetchedMessages.pushObject(message);

    message.get('user').then(async(function(fetchedUser) {
      equal(fetchedUser, user2, "user got set correctly");
    }));

    user.get('messages').then(async(function(newFetchedMessages) {
      equal(get(newFetchedMessages, 'length'), 0, 'message got removed from the old messages hasMany');
    }));
  }));
});

test("Pushing to the hasMany side keeps the oneToMany invariant - sync", function () {
  var user = store.push('user', {id:1, name: 'Stanley', accounts: [1]});
  var user2 = store.push('user', {id:2, name: 'Stanley'});

  var account = store.push('account', {id: 1, state: 'great'});

  user2.get('accounts').pushObject(account);
  equal(account.get('user'), user2, 'user got set correctly');
  equal(user.get('accounts.length'), 0, 'the account got removed correctly');
  equal(user2.get('accounts.length'), 1, 'the account got pushed correctly');
});

test("Setting the belongsTo side keeps the oneToMany invariant on the hasMany- async", function () {
  expect(2);
  var user =  store.push('user', {id:1, name: 'Stanley', messages: [1]});
  var user2 =  store.push('user', {id:2, name: 'Tomhuda'});

  var message = store.push('message', {id: 1, title: 'EmberFest was great', user: 1});

  message.set('user', user2);

  user.get('messages').then(async(function(fetchedMessages) {
    equal(get(fetchedMessages, 'length'), 0, 'message got removed from the first user correctly');
  }));

  user2.get('messages').then(async(function(fetchedMessages) {
    equal(get(fetchedMessages, 'length'), 1, 'message got added to the second user correctly');
  }));

});

test("Setting the belongsTo side keeps the oneToMany invariant on the hasMany- sync", function () {
  var user = store.push('user', {id:1, name: 'Stanley', accounts: [1]});
  var user2 = store.push('user', {id:2, name: 'Stanley'});

  var account = store.push('account', {id: 1, state: 'great', user: 1});

  account.set('user', user2);

  equal(account.get('user'), user2, 'user got set correctly');

  equal(user.get('accounts.length'), 0, 'the account got removed correctly');
  equal(user2.get('accounts.length'), 1, 'the account got pushed correctly');
});


test("Setting the belongsTo side to null removes the record from the hasMany side - async", function () {
  expect(2);
  var user =  store.push('user', {id:1, name: 'Stanley', messages: [1]});
  var message = store.push('message', {id: 1, title: 'EmberFest was great', user: 1});

  message.set('user', null);

  user.get('messages').then(async(function(fetchedMessages) {
    equal(get(fetchedMessages, 'length'), 0, 'message got removed from the  user correctly');
  }));

  message.get('user').then(async(function(fetchedUser) {
    equal(fetchedUser, null, 'user got set to null correctly');
  }));

});

test("Setting the belongsTo side to null removes the record from the hasMany side - sync", function () {
  var user = store.push('user', {id:1, name: 'Stanley', accounts: [1]});

  var account = store.push('account', {id: 1, state: 'great', user: 1});

  account.set('user', null);

  equal(account.get('user'), null, 'user got set to null correctly');

  equal(user.get('accounts.length'), 0, 'the account got removed correctly');
});

/*
Deleting
*/

test("When deleting a record that has a belongsTo it is removed from the hasMany side but not the belongsTo side- async", function () {
  var user = store.push('user', {id:1, name: 'Stanley', messages: [2]});
  var message = store.push('message', {id: 2, title: 'EmberFest was great'});
  message.deleteRecord();
  message.get('user').then(async(function(fetchedUser) {
    equal(fetchedUser, user, 'Message still has the user');
  }));
  user.get('messages').then(async(function(fetchedMessages) {
    equal(fetchedMessages.get('length'), 0, 'User was removed from the messages');
  }));
});

test("When deleting a record that has a belongsTo it is removed from the hasMany side but not the belongsTo side- sync", function () {
  var account = store.push('account', {id:2 , state: 'lonely'});
  var user = store.push('user', {id:1, name: 'Stanley', accounts: [2]});
  account.deleteRecord();
  equal(user.get('accounts.length'), 0, "User was removed from the accounts");
  equal(account.get('user'), user, 'Account still has the user');
});

test("When deleting a record that has a hasMany it is removed from the belongsTo side but not the hasMany side- async", function () {
  var user = store.push('user', {id:1, name: 'Stanley', messages: [2]});
  var message = store.push('message', {id: 2, title: 'EmberFest was great'});
  user.deleteRecord();
  message.get('user').then(async(function(fetchedUser) {
    equal(fetchedUser, null, 'Message does not have the user anymore');
  }));
  user.get('messages').then(async(function(fetchedMessages) {
    equal(fetchedMessages.get('length'), 1, 'User still has the messages');
  }));
});

test("When deleting a record that has a hasMany it is removed from the belongsTo side but not the hasMany side - sync", function () {
  var account = store.push('account', {id:2 , state: 'lonely'});
  var user = store.push('user', {id:1, name: 'Stanley', accounts: [2]});
  user.deleteRecord();
  equal(user.get('accounts.length'), 1, "User still has the accounts");
  equal(account.get('user'), null, 'Account no longer has the user');
});

/*
Rollback from deleted state
*/

test("Rollbacking a deleted record works correctly when the hasMany side has been deleted - async", function () {
  var user = store.push('user', {id:1, name: 'Stanley', messages: [2]});
  var message = store.push('message', {id: 2, title: 'EmberFest was great'});
  message.deleteRecord();
  message.rollback();
  message.get('user').then(async(function(fetchedUser) {
    equal(fetchedUser, user, 'Message still has the user');
  }));
  user.get('messages').then(async(function(fetchedMessages) {
    equal(fetchedMessages.objectAt(0), message, 'User has the message');
  }));
});

test("Rollbacking a deleted record works correctly when the hasMany side has been deleted - sync", function () {
  var account = store.push('account', {id:2 , state: 'lonely'});
  var user = store.push('user', {id:1, name: 'Stanley', accounts: [2]});
  account.deleteRecord();
  account.rollback();
  equal(user.get('accounts.length'), 1, "Accounts are rolled back");
  equal(account.get('user'), user, 'Account still has the user');
});

test("Rollbacking a deleted record works correctly when the belongsTo side has been deleted - async", function () {
  var user = store.push('user', {id:1, name: 'Stanley', messages: [2]});
  var message = store.push('message', {id: 2, title: 'EmberFest was great'});
  user.deleteRecord();
  user.rollback();
  message.get('user').then(async(function(fetchedUser) {
    equal(fetchedUser, user, 'Message has the user again');
  }));
  user.get('messages').then(async(function(fetchedMessages) {
    equal(fetchedMessages.get('length'), 1, 'User still has the messages');
  }));
});

test("Rollbacking a deleted record works correctly when the belongsTo side has been deleted - sync", function () {
  var account = store.push('account', {id:2 , state: 'lonely'});
  var user = store.push('user', {id:1, name: 'Stanley', accounts: [2]});
  user.deleteRecord();
  user.rollback();
  equal(user.get('accounts.length'), 1, "User still has the accounts");
  equal(account.get('user'), user, 'Account has the user again');
});