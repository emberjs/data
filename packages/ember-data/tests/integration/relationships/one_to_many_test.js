var env, store, User, Message, Account;
var get = Ember.get;
var run = Ember.run;

var attr = DS.attr;
var hasMany = DS.hasMany;
var belongsTo = DS.belongsTo;

function stringify(string) {
  return function() { return string; };
}

module('integration/relationships/one_to_many_test - OneToMany relationships', {
  setup: function() {
    User = DS.Model.extend({
      name: attr('string'),
      messages: hasMany('message', { async: true }),
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
      user: belongsTo('user', { async: true })
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
    run(env.container, 'destroy');
  }
});

/*
  Server loading tests
*/

test("Relationship is available from the belongsTo side even if only loaded from the hasMany side - async", function () {
  var user, message;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley', messages: [2, 3] });
    message = store.push('message', { id: 2, title: 'EmberFest was great' });
  });
  run(function() {
    message.get('user').then(function(fetchedUser) {
      equal(fetchedUser, user, 'User relationship was set up correctly');
    });
  });
});

test("Relationship is available from the belongsTo side even if only loaded from the hasMany side - sync", function () {
  var account, user;
  run(function() {
    account = store.push('account', { id: 2 , state: 'lonely' });
    user = store.push('user', { id: 1, name: 'Stanley', accounts: [2] });
  });
  equal(account.get('user'), user, 'User relationship was set up correctly');
});

test("Relationship is available from the hasMany side even if only loaded from the belongsTo side - async", function () {
  var user, message;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley' });
    message = store.push('message', { id: 2, title: 'EmberFest was great', user: 1 });
  });
  run(function() {
    user.get('messages').then(function(fetchedMessages) {
      equal(fetchedMessages.objectAt(0), message, 'Messages relationship was set up correctly');
    });
  });
});

test("Relationship is available from the hasMany side even if only loaded from the belongsTo side - sync", function () {
  var user, account;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley' });
    account = store.push('account', { id: 2 , state: 'lonely', user: 1 });
  });
  equal(user.get('accounts').objectAt(0), account, 'Accounts relationship was set up correctly');
});

test("Fetching a belongsTo that is set to null removes the record from a relationship - async", function () {
  var user;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley', messages: [1,2] });
  });
  run(function() {
    store.push('message', { id: 1, title: 'EmberFest was great', user: 1 });
    store.push('message', { id: 2, title: 'EmberConf will be better', user: null });
  });
  run(function() {
    user.get('messages').then(function(fetchedMessages) {
      equal(get(fetchedMessages, 'length'), 1, 'Messages relationship was set up correctly');
    });
  });
});

test("Fetching a belongsTo that is set to null removes the record from a relationship - sync", function () {
  var account, user;
  run(function() {
    account = store.push('account', { id: 2 , state: 'lonely' });
    user = store.push('user', { id: 1, name: 'Stanley', accounts: [2] });
    account = store.push('account', { id: 2 , state: 'lonely', user: null });
  });
  equal(user.get('accounts').objectAt(0), null, 'Account was sucesfully removed');
});

test("Fetching a belongsTo that is not defined does not remove the record from a relationship - async", function () {
  var user;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley', messages: [1,2] });
  });
  run(function() {
    store.push('message', { id: 1, title: 'EmberFest was great', user: 1 });
    store.push('message', { id: 2, title: 'EmberConf will be better' });
  });
  run(function() {
    user.get('messages').then(function(fetchedMessages) {
      equal(get(fetchedMessages, 'length'), 2, 'Messages relationship was set up correctly');
    });
  });
});

test("Fetching a belongsTo that is not defined does not remove the record from a relationship - sync", function () {
  var account, user;
  run(function() {
    account = store.push('account', { id: 2 , state: 'lonely' });
    user = store.push('user', { id: 1, name: 'Stanley', accounts: [2] });
    account = store.push('account', { id: 2 , state: 'lonely' });
  });
  equal(user.get('accounts').objectAt(0), account, 'Account was sucesfully removed');
});

test("Fetching the hasMany that doesn't contain the belongsTo, sets the belongsTo to null - async", function () {
  var user, message, message2;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley', messages: [1] });
    message = store.push('message', { id: 1, title: 'EmberFest was great', user: 1 });
    message2 = store.push('message', { id: 2, title: 'EmberConf is gonna be better' });
  });
  run(function() {
    store.push('user', { id: 1, name: 'Stanley', messages: [2] });
  });

  run(function() {
    message.get('user').then(function(fetchedUser) {
      equal(fetchedUser, null, 'User was removed correctly');
    });

    message2.get('user').then(function(fetchedUser) {
      equal(fetchedUser, user, 'User was set on the second message');
    });
  });
});

test("Fetching the hasMany that doesn't contain the belongsTo, sets the belongsTo to null - sync", function () {
  var account;
  run(function() {
    store.push('user', { id: 1, name: 'Stanley', accounts: [1] });
    account = store.push('account', { id: 1, state: 'great', user: 1 });
    store.push('account', { id: 2, state: 'awesome' });
    store.push('user', { id: 1, name: 'Stanley', accounts: [2] });
  });

  equal(account.get('user'), null, 'User was removed correctly');
});

test("Fetching the hasMany side where the hasMany is undefined does not change the belongsTo side - async", function () {
  var message, user;
  run(function() {
    store.push('user', { id: 1, name: 'Stanley', messages: [1] });
    message = store.push('message', { id: 1, title: 'EmberFest was great', user: 1 });
    user = store.push('user', { id: 1, name: 'Stanley' });
  });

  run(function() {
    message.get('user').then(function(fetchedUser) {
      equal(fetchedUser, user, 'User was not removed');
    });
  });
});

test("Fetching the hasMany side where the hasMany is undefined does not change the belongsTo side - sync", function () {
  var account, user;
  run(function() {
    store.push('user', { id: 1, name: 'Stanley', accounts: [1] });
    account = store.push('account', { id: 1, state: 'great', user: 1 });
    store.push('account', { id: 2, state: 'awesome' });
    user = store.push('user', { id: 1, name: 'Stanley' });
  });

  equal(account.get('user'), user, 'User was not removed');
});

/*
  Local edits
*/

test("Pushing to the hasMany reflects the change on the belongsTo side - async", function () {
  var user, message2;
  run(function() {
    user =  store.push('user', { id: 1, name: 'Stanley', messages: [1] });
    store.push('message', { id: 1, title: 'EmberFest was great' });
    message2 = store.push('message', { id: 2, title: 'EmberFest was great' });
  });

  run(function() {
    user.get('messages').then(function(fetchedMessages) {
      fetchedMessages.pushObject(message2);
      message2.get('user').then(function(fetchedUser) {
        equal(fetchedUser, user, "user got set correctly");
      });
    });
  });
});

test("Pushing to the hasMany reflects the change on the belongsTo side - sync", function () {
  var user, account2;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley', accounts: [1] });
    store.push('account', { id: 1, state: 'great', user: 1 });

    account2 = store.push('account', { id: 2, state: 'awesome' });
    user.get('accounts').pushObject(account2);
  });

  equal(account2.get('user'), user, 'user got set correctly');
});

test("Removing from the hasMany side reflects the change on the belongsTo side - async", function () {
  var user, message;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley', messages: [1] });
    message = store.push('message', { id: 1, title: 'EmberFest was great' });
  });

  run(function() {
    user.get('messages').then(function(fetchedMessages) {
      fetchedMessages.removeObject(message);
      message.get('user').then(function(fetchedUser) {
        equal(fetchedUser, null, "user got removed correctly");
      });
    });
  });
});

test("Removing from the hasMany side reflects the change on the belongsTo side - sync", function () {
  var user, account;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley', accounts: [1] });
    account = store.push('account', { id: 1, state: 'great', user: 1 });
  });
  run(function() {
    user.get('accounts').removeObject(account);
  });

  equal(account.get('user'), null, 'user got removed correctly');
});

test("Pushing to the hasMany side keeps the oneToMany invariant on the belongsTo side - async", function () {
  expect(2);
  var user, user2, message;
  run(function() {
    user =  store.push('user', { id: 1, name: 'Stanley', messages: [1] });
    user2 =  store.push('user', { id: 2, name: 'Tomhuda' });
    message = store.push('message', { id: 1, title: 'EmberFest was great' });
  });

  run(function() {
    user2.get('messages').then(function(fetchedMessages) {
      fetchedMessages.pushObject(message);

      message.get('user').then(function(fetchedUser) {
        equal(fetchedUser, user2, "user got set correctly");
      });

      user.get('messages').then(function(newFetchedMessages) {
        equal(get(newFetchedMessages, 'length'), 0, 'message got removed from the old messages hasMany');
      });
    });
  });
});

test("Pushing to the hasMany side keeps the oneToMany invariant - sync", function () {
  var user, user2, account;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley', accounts: [1] });
    user2 = store.push('user', { id: 2, name: 'Stanley' });
    account = store.push('account', { id: 1, state: 'great' });
    user2.get('accounts').pushObject(account);
  });

  equal(account.get('user'), user2, 'user got set correctly');
  equal(user.get('accounts.length'), 0, 'the account got removed correctly');
  equal(user2.get('accounts.length'), 1, 'the account got pushed correctly');
});

test("Setting the belongsTo side keeps the oneToMany invariant on the hasMany- async", function () {
  expect(2);
  var user, user2, message;
  run(function() {
    user =  store.push('user', { id: 1, name: 'Stanley', messages: [1] });
    user2 =  store.push('user', { id: 2, name: 'Tomhuda' });
    message = store.push('message', { id: 1, title: 'EmberFest was great', user: 1 });
    message.set('user', user2);
  });

  run(function() {
    user.get('messages').then(function(fetchedMessages) {
      equal(get(fetchedMessages, 'length'), 0, 'message got removed from the first user correctly');
    });
  });
  run(function() {
    user2.get('messages').then(function(fetchedMessages) {
      equal(get(fetchedMessages, 'length'), 1, 'message got added to the second user correctly');
    });
  });
});

test("Setting the belongsTo side keeps the oneToMany invariant on the hasMany- sync", function () {
  var user, user2, account;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley', accounts: [1] });
    user2 = store.push('user', { id: 2, name: 'Stanley' });
    account = store.push('account', { id: 1, state: 'great', user: 1 });
    account.set('user', user2);
  });

  equal(account.get('user'), user2, 'user got set correctly');

  equal(user.get('accounts.length'), 0, 'the account got removed correctly');
  equal(user2.get('accounts.length'), 1, 'the account got pushed correctly');
});


test("Setting the belongsTo side to null removes the record from the hasMany side - async", function () {
  expect(2);
  var user, message;
  run(function() {
    user =  store.push('user', { id: 1, name: 'Stanley', messages: [1] });
    message = store.push('message', { id: 1, title: 'EmberFest was great', user: 1 });
    message.set('user', null);
  });

  run(function() {
    user.get('messages').then(function(fetchedMessages) {
      equal(get(fetchedMessages, 'length'), 0, 'message got removed from the  user correctly');
    });
  });

  run(function() {
    message.get('user').then(function(fetchedUser) {
      equal(fetchedUser, null, 'user got set to null correctly');
    });
  });
});

test("Setting the belongsTo side to null removes the record from the hasMany side - sync", function () {
  var user, account;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley', accounts: [1] });
    account = store.push('account', { id: 1, state: 'great', user: 1 });
    account.set('user', null);
  });

  equal(account.get('user'), null, 'user got set to null correctly');

  equal(user.get('accounts.length'), 0, 'the account got removed correctly');
});

/*
Deleting
*/

test("When deleting a record that has a belongsTo it is removed from the hasMany side but not the belongsTo side- async", function () {
  var user, message;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley', messages: [2] });
    message = store.push('message', { id: 2, title: 'EmberFest was great' });
  });
  run(message, 'deleteRecord');
  run(function() {
    message.get('user').then(function(fetchedUser) {
      equal(fetchedUser, user, 'Message still has the user');
    });
    user.get('messages').then(function(fetchedMessages) {
      equal(fetchedMessages.get('length'), 0, 'User was removed from the messages');
    });
  });
});

test("When deleting a record that has a belongsTo it is removed from the hasMany side but not the belongsTo side- sync", function () {
  var account, user;
  run(function() {
    account = store.push('account', { id: 2 , state: 'lonely' });
    user = store.push('user', { id: 1, name: 'Stanley', accounts: [2] });
    account.deleteRecord();
  });
  equal(user.get('accounts.length'), 0, "User was removed from the accounts");
  equal(account.get('user'), user, 'Account still has the user');
});

test("When deleting a record that has a hasMany it is removed from the belongsTo side but not the hasMany side- async", function () {
  var user, message;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley', messages: [2] });
    message = store.push('message', { id: 2, title: 'EmberFest was great' });
  });
  run(user, 'deleteRecord');
  run(function() {
    message.get('user').then(function(fetchedUser) {
      equal(fetchedUser, null, 'Message does not have the user anymore');
    });
    user.get('messages').then(function(fetchedMessages) {
      equal(fetchedMessages.get('length'), 1, 'User still has the messages');
    });
  });
});

test("When deleting a record that has a hasMany it is removed from the belongsTo side but not the hasMany side - sync", function () {
  var account, user;
  run(function() {
    account = store.push('account', { id: 2 , state: 'lonely' });
    user = store.push('user', { id: 1, name: 'Stanley', accounts: [2] });
  });
  run(function() {
    user.deleteRecord();
  });
  equal(user.get('accounts.length'), 1, "User still has the accounts");
  equal(account.get('user'), null, 'Account no longer has the user');
});

/*
Rollback from deleted state
*/

test("Rollbacking a deleted record works correctly when the hasMany side has been deleted - async", function () {
  var user, message;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley', messages: [2] });
    message = store.push('message', { id: 2, title: 'EmberFest was great' });
  });
  run(function() {
    message.deleteRecord();
    message.rollback();
  });
  run(function() {
    message.get('user').then(function(fetchedUser) {
      equal(fetchedUser, user, 'Message still has the user');
    });
    user.get('messages').then(function(fetchedMessages) {
      equal(fetchedMessages.objectAt(0), message, 'User has the message');
    });
  });
});

test("Rollbacking a deleted record works correctly when the hasMany side has been deleted - sync", function () {
  var account, user;
  run(function() {
    account = store.push('account', { id: 2 , state: 'lonely' });
    user = store.push('user', { id: 1, name: 'Stanley', accounts: [2] });
  });
  run(function() {
    account.deleteRecord();
    account.rollback();
  });
  equal(user.get('accounts.length'), 1, "Accounts are rolled back");
  equal(account.get('user'), user, 'Account still has the user');
});

test("Rollbacking a deleted record works correctly when the belongsTo side has been deleted - async", function () {
  var user, message;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley', messages: [2] });
    message = store.push('message', { id: 2, title: 'EmberFest was great' });
  });
  run(function() {
    user.deleteRecord();
    user.rollback();
  });
  run(function() {
    message.get('user').then(function(fetchedUser) {
      equal(fetchedUser, user, 'Message has the user again');
    });
    user.get('messages').then(function(fetchedMessages) {
      equal(fetchedMessages.get('length'), 1, 'User still has the messages');
    });
  });
});

test("Rollbacking a deleted record works correctly when the belongsTo side has been deleted - sync", function () {
  var account, user;
  run(function() {
    account = store.push('account', { id: 2 , state: 'lonely' });
    user = store.push('user', { id: 1, name: 'Stanley', accounts: [2] });
  });
  run(function() {
    user.deleteRecord();
    user.rollback();
  });
  equal(user.get('accounts.length'), 1, "User still has the accounts");
  equal(account.get('user'), user, 'Account has the user again');
});

/*
Rollback from created state
*/

test("Rollbacking a created record works correctly when the hasMany side has been created - async", function () {
  var user, message;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley' });
    message = store.createRecord('message', { user: user });
  });
  run(message, 'rollback');
  run(function() {
    message.get('user').then(function(fetchedUser) {
      equal(fetchedUser, null, 'Message does not have the user anymore');
    });
    user.get('messages').then(function(fetchedMessages) {
      equal(fetchedMessages.get('length'), 0, message, 'User does not have the message anymore');
    });
  });
});

test("Rollbacking a created record works correctly when the hasMany side has been created - sync", function () {
  var user, account;
  run(function() {
    user = store.push('user', { id: 1, name: 'Stanley' });
    account = store.createRecord('account', { user: user });
  });
  run(account, 'rollback');
  equal(user.get('accounts.length'), 0, "Accounts are rolled back");
  equal(account.get('user'), null, 'Account does not have the user anymore');
});

test("Rollbacking a created record works correctly when the belongsTo side has been created - async", function () {
  var message, user;
  run(function() {
    message = store.push('message', { id: 2, title: 'EmberFest was great' });
    user = store.createRecord('user');
  });
  run(function() {
    user.get('messages').then(function(messages) {
      messages.pushObject(message);
      user.rollback();
      message.get('user').then(function(fetchedUser) {
        equal(fetchedUser, null, 'Message does not have the user anymore');
      });
      user.get('messages').then(function(fetchedMessages) {
        equal(fetchedMessages.get('length'), 0, 'User does not have the message anymore');
      });
    });
  });
});

test("Rollbacking a created record works correctly when the belongsTo side has been created - sync", function () {
  var account, user;
  run(function() {
    account = store.push('account', { id: 2 , state: 'lonely' });
    user = store.createRecord('user');
  });
  run(function() {
    user.get('accounts').pushObject(account);
  });
  run(user, 'rollback');
  equal(user.get('accounts.length'), undefined, "User does not have the account anymore");
  equal(account.get('user'), null, 'Account does not have the user anymore');
});
