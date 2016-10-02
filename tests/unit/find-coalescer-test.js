import Ember from 'ember';
import { createStore } from 'dummy/tests/helpers/store';

let Promise = Ember.RSVP.Promise;
let run = Ember.run;
let User, Boat, Comment;
let store, finder;

module('FindCoalescer', {
  setup: function() {

    User = DS.Model.extend({});
    Boat = DS.Model.extend({});
    Comment = DS.Model.extend({});

    store = createStore({
      user: User,
      boot: Boat,
      comment: Comment,
      adapter: DS.RESTAdapter.extend({
        // buildURL: function(type, id, record) {
        // },
        modelFactoryFor: function (key) {
          return {
            'user': User,
            'boat': Boat,
            'comment': Comment
          }[key];
        },

        ajax: function(url, type, options) {
        }
      })
    });

    finder = new DS.Store.FindCoalescer(store);
  }
});

test('exists', function() {
  ok(DS.Store.FindCoalescer);
});

test('find 3 of same type: all succeed', function() {
  let first, second, third;

  stop();
  expect(3);

  run(function () {
    finder._begin();
    first  = finder.find('user', 1);
    second = finder.find('user', 2);
    third  = finder.find('user', 3);

    run.scheduleOnce('afterRender', function () {
      Promise.all([first, second, third]).then(function() {
        start();
        // completed
      });
    });
  });
});

// test('findMany 3 of same type: all succeed', function() {
//   let firstThree  = finder.findMany('user', [1, 2, 3]);
//   return firstThree.then(function() {
//     // completed
//   });
// });

// test('find 3 of same type: two succeed one fails', function() {
//   let first  = finder.find('user', 1);
//   let second = finder.find('user', 2);
//   let third  = finder.find('user', 3);

//   return Promise.all([first, second, third]).then(function() {
//     // completed
//   });
// });

// test('find 3 of same type: all three fail', function() {
//   let first  = finder.find('user', 1);
//   let second = finder.find('user', 2);
//   let third  = finder.find('user', 3);

//   return Promise.all([first, second, third]).then(function() {
//     // completed
//   });
// });

// test('find 3 of different types: all succeed', function() {
//   let first  = finder.find('boat', 1);
//   let second = finder.find('user', 2);
//   let third  = finder.find('comment', 3);

//   return Promise.all([first, second, third]).then(function() {
//     // completed
//   });
// });

// test('find 3 of different types: first succeeds second fails', function() {
//   let first  = finder.find('boat', 1);
//   let second = finder.find('user', 2);
//   let third  = finder.find('comment', 3);

//   return Promise.all([first, second, third]).then(function() {
//     // completed
//   });
// });

// test('find 3 of different types: all fail', function() {
//   let first  = finder.find('boat', 1);
//   let second = finder.find('user', 2);
//   let third  = finder.find('comment', 3);

//   return Promise.all([first, second, third]).then(function() {
//     // completed
//   });
// });
