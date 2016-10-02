var Promise = Ember.RSVP.Promise;
var run = Ember.run;
var User, Boat, Comment;
var store, finder;

module('FindCoalescer', {
  setup: function() {
    store = createStore({
      adapter: DS.RESTAdapter.extend({
        buildURL: function(type, id, record) {
          debugger;
        },
        modelFactoryFor: function (key) {
          return {
            'user': User,
            'boat': Boat,
            'comment': Comment
          }[key];
        },
        
        ajax: function(url, type, options) {
          debugger;
        }
      })
    });

    finder = new DS.Store.FindCoalescer(store);

    User = DS.Model.extend({});
    Boat = DS.Model.extend({});
    Comment = DS.Model.extend({});
  }
});

test('exists', function() {
  ok(DS.Store.FindCoalescer);
});

test('find 3 of same type: all succeed', function() {
  var first, second, third;

  stop();
  expect(3);

  run(function () {
    finder._begin();
    first  = finder.find(User, 1);
    second = finder.find(User, 2);
    third  = finder.find(User, 3);

    run.scheduleOnce('afterRender', function () {
      Promise.all([first, second, third]).then(function() {
        start();
        debugger;
        // completed
      });
    });
  });
});

// test('findMany 3 of same type: all succeed', function() {
//   var firstThree  = finder.findMany('user', [1, 2, 3]);
//   return firstThree.then(function() {
//     // completed
//   });
// });

// test('find 3 of same type: two succeed one fails', function() {
//   var first  = finder.find('user', 1);
//   var second = finder.find('user', 2);
//   var third  = finder.find('user', 3);

//   return Promise.all([first, second, third]).then(function() {
//     // completed
//   });
// });

// test('find 3 of same type: all three fail', function() {
//   var first  = finder.find('user', 1);
//   var second = finder.find('user', 2);
//   var third  = finder.find('user', 3);

//   return Promise.all([first, second, third]).then(function() {
//     // completed
//   });
// });

// test('find 3 of different types: all succeed', function() {
//   var first  = finder.find('boat', 1);
//   var second = finder.find('user', 2);
//   var third  = finder.find('comment', 3);

//   return Promise.all([first, second, third]).then(function() {
//     // completed
//   });
// });

// test('find 3 of different types: first succeeds second fails', function() {
//   var first  = finder.find('boat', 1);
//   var second = finder.find('user', 2);
//   var third  = finder.find('comment', 3);

//   return Promise.all([first, second, third]).then(function() {
//     // completed
//   });
// });

// test('find 3 of different types: all fail', function() {
//   var first  = finder.find('boat', 1);
//   var second = finder.find('user', 2);
//   var third  = finder.find('comment', 3);

//   return Promise.all([first, second, third]).then(function() {
//     // completed
//   });
// });
