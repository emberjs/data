var Promise = Ember.RSVP.Promise;
var store, finder;

module('FindCoalescer', {
  setup: function() {
    store = { };
    finder = new DS.Store.FindCoalescer(store);
  }
});

test('exists', function() {
  ok(DS.Store.FindCoalescer);
});

test('find 3 of same type: both succeed', function() {
  var first  = finder.find('user', 1);
  var second = finder.find('user', 2);
  var third  = finder.find('user', 3);

  return Promise.all([first, second, third]).then(function() {
    // completed
  });
});

test('find 3 of same type: one succeeds one fails', function() {
  var first  = finder.find('user', 1);
  var second = finder.find('user', 2);
  var third  = finder.find('user', 3);

  return Promise.all([first, second, third]).then(function() {
    // completed
  });
});

test('find 3 of same type: both fail', function() {
  var first  = finder.find('user', 1);
  var second = finder.find('user', 2);
  var third  = finder.find('user', 3);

  return Promise.all([first, second, third]).then(function() {
    // completed
  });
});

test('find 3 of different types:  all succeed', function() {
  var first  = finder.find('boat', 1);
  var second = finder.find('user', 2);
  var third  = finder.find('comment', 3);

  return Promise.all([first, second, third]).then(function() {
    // completed
  });
});

test('find 3 of different types: first succeeds second fails', function() {
  var first  = finder.find('boat', 1);
  var second = finder.find('user', 2);
  var third  = finder.find('comment', 3);

  return Promise.all([first, second, third]).then(function() {
    // completed
  });
});

test('find 3 of different types: all fail', function() {
  var first  = finder.find('boat', 1);
  var second = finder.find('user', 2);
  var third  = finder.find('comment', 3);

  return Promise.all([first, second, third]).then(function() {
    // completed
  });
});
