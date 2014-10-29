var Account, Topic, User, store, env;

var attr = DS.attr, hasMany = DS.hasMany;

function stringify(string) {
  return function() { return string; };
}

module('integration/relationships/many_to_many_test - ManyToMany relationships', {
  setup: function() {
    User = DS.Model.extend({
      name: attr('string'),
      topics: hasMany('topic', {async: true}),
      accounts: hasMany('account')
    });

    User.toString = stringify('User');

    Account = DS.Model.extend({
      state: attr(),
      users: hasMany('user')
    });

    Account.toString = stringify('Account');

    Topic = DS.Model.extend({
      title: attr('string'),
      users: hasMany('user', {async: true})
    });

    Topic.toString = stringify('Topic');

    env = setupStore({
      user: User,
      topic: Topic,
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

test("Loading from one hasMany side reflects on the other hasMany side - async", function () {
  store.push('user', {id:1, name: 'Stanley', topics: [2, 3]});
  var topic = store.push('topic', {id: 2, title: 'EmberFest was great'});
  topic.get('users').then(async(function(fetchedUsers) {
    equal(fetchedUsers.get('length'), 1, 'User relationship was set up correctly');
  }));
});

test("Relationship is available from the belongsTo side even if only loaded from the hasMany side - sync", function () {
  var account = store.push('account', {id:2 , state: 'lonely'});
  store.push('user', {id:1, name: 'Stanley', accounts: [2]});
  equal(account.get('users.length'), 1, 'User relationship was set up correctly');
});

test("Fetching a hasMany where a record was removed reflects on the other hasMany side - async", function () {
  var user = store.push('user', {id:1, name: 'Stanley', topics: [2]});
  var topic = store.push('topic', {id: 2, title: 'EmberFest was great', users:[]});
  user.get('topics').then(async(function(fetchedTopics) {
    equal(fetchedTopics.get('length'), 0, 'Topics were removed correctly');
    topic.get('users').then(async(function(fetchedUsers) {
      equal(fetchedUsers.get('length'), 0, 'Users were removed correctly');
    }));
  }));
});

test("Fetching a hasMany where a record was removed reflects on the other hasMany side - async", function () {
  var account = store.push('account', {id:2 , state: 'lonely'});
  var user = store.push('user', {id:1, name: 'Stanley', accounts: [2]});
  account = store.push('account', {id:2 , state: 'lonely', users: []});
  equal(user.get('accounts.length'), 0, 'Accounts were removed correctly');
  equal(account.get('users.length'), 0, 'Users were removed correctly');
});


/*
  Local edits
*/

test("Pushing to a hasMany reflects on the other hasMany side - async", function () {
  expect(1);
  var user = store.push('user', {id:1, name: 'Stanley', topics: []});
  var topic = store.push('topic', {id: 2, title: 'EmberFest was great'});
  topic.get('users').then(async(function(fetchedUsers) {
    fetchedUsers.pushObject(user);
    user.get('topics').then(async(function(fetchedTopics) {
      equal(fetchedTopics.get('length'), 1, 'User relationship was set up correctly');
    }));
  }));
});

test("Pushing to a hasMany reflects on the other hasMany side - sync", function () {
  var account = store.push('account', {id:2 , state: 'lonely'});
  var stanley = store.push('user', {id:1, name: 'Stanley'});
  stanley.get('accounts').pushObject(account);
  equal(account.get('users.length'), 1, 'User relationship was set up correctly');
});

test("Removing a record from a hasMany reflects on the other hasMany side - async", function () {
  var user = store.push('user', {id:1, name: 'Stanley', topics: [2]});
  var topic = store.push('topic', {id: 2, title: 'EmberFest was great'});
  user.get('topics').then(async(function(fetchedTopics) {
    equal(fetchedTopics.get('length'), 1, 'Topics were setup correctly');
    fetchedTopics.removeObject(topic);
    topic.get('users').then(async(function(fetchedUsers) {
      equal(fetchedUsers.get('length'), 0, 'Users were removed correctly');
    }));
  }));
});

test("Removing a record from a hasMany reflects on the other hasMany side - sync", function () {
  var account = store.push('account', {id:2 , state: 'lonely'});
  var user = store.push('user', {id:1, name: 'Stanley', accounts: [2]});
  equal(account.get('users.length'), 1, 'Users were setup correctly');
  account.get('users').removeObject(user);
  equal(user.get('accounts.length'), 0, 'Accounts were removed correctly');
  equal(account.get('users.length'), 0, 'Users were removed correctly');
});


/*
Deleting tests
*/

test("Deleting a record that has a hasMany relationship removes it from the otherMany array but does not remove the other record from itself - async", function () {
  var user = store.push('user', {id:1, name: 'Stanley', topics: [2]});
  var topic = store.push('topic', {id: 2, title: 'EmberFest was great'});
  topic.deleteRecord();
  topic.get('users').then(async(function(fetchedUsers) {
    equal(fetchedUsers.get('length'), 1, 'Users are still there');
  }));
  user.get('topics').then(async(function(fetchedTopics) {
    equal(fetchedTopics.get('length'), 0, 'Topic got removed from the user');
  }));
});

test("Deleting a record that has a hasMany relationship removes it from the otherMany array but does not remove the other record from itself - sync", function () {
  var account = store.push('account', {id:2 , state: 'lonely'});
  var user = store.push('user', {id:1, name: 'Stanley', accounts: [2]});
  account.deleteRecord();
  equal(account.get('users.length'), 1, 'Users are still there');
  equal(user.get('accounts.length'), 0, 'Acocount got removed from the user');
});

/*
  Rollback tests
*/

test("Rollbacking a deleted record that has a ManyToMany relationship works correctly - async", function () {
  var user = store.push('user', {id:1, name: 'Stanley', topics: [2]});
  var topic = store.push('topic', {id: 2, title: 'EmberFest was great'});
  topic.deleteRecord();
  topic.rollback();
  topic.get('users').then(async(function(fetchedUsers) {
    equal(fetchedUsers.get('length'), 1, 'Users are still there');
  }));
  user.get('topics').then(async(function(fetchedTopics) {
    equal(fetchedTopics.get('length'), 1, 'Topic got rollbacked into the user');
  }));
});

test("Deleting a record that has a hasMany relationship removes it from the otherMany array but does not remove the other record from itself - sync", function () {
  var account = store.push('account', {id:2 , state: 'lonely'});
  var user = store.push('user', {id:1, name: 'Stanley', accounts: [2]});
  account.deleteRecord();
  account.rollback();
  equal(account.get('users.length'), 1, 'Users are still there');
  equal(user.get('accounts.length'), 1, 'Account got rolledback correctly into the user');
});

test("Rollbacking a created record that has a ManyToMany relationship works correctly - async", function () {
  var user = store.push('user', {id:1, name: 'Stanley'});
  var topic = store.createRecord('topic');
  user.get('topics').then(async(function(fetchedTopics) {
    fetchedTopics.pushObject(topic);
    topic.rollback();
    topic.get('users').then(async(function(fetchedUsers) {
      equal(fetchedUsers.get('length'), 0, 'Users got removed');
    }));
    user.get('topics').then(async(function(fetchedTopics) {
      equal(fetchedTopics.get('length'), 0, 'Topics got removed');
    }));
  }));
});

test("Deleting a record that has a hasMany relationship removes it from the otherMany array but does not remove the other record from itself - sync", function () {
  var account = store.push('account', {id:2 , state: 'lonely'});
  var user = store.createRecord('user');
  account.get('users').pushObject(user);
  user.rollback();
  equal(account.get('users.length'), 0, 'Users got removed');
  equal(user.get('accounts.length'), undefined, 'Accounts got rolledback correctly');
});
