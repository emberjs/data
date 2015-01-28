var App, store, debugAdapter;
var get = Ember.get;
var run = Ember.run;

module("DS.DebugAdapter", {
  setup: function() {
    Ember.run(function() {
      App = Ember.Application.create();
      App.toString = function() { return 'App'; };

      App.ApplicationStore = DS.Store.extend({
        adapter: DS.Adapter.extend()
      });

      App.Post = DS.Model.extend({
        title: DS.attr('string')
      });

    });

    store = App.__container__.lookup('store:main');
    debugAdapter = App.__container__.lookup('data-adapter:main');

    debugAdapter.reopen({
      getModelTypes: function() {
        return Ember.A([{ klass: App.Post, name: 'App.Post' }]);
      }
    });
  },
  teardown: function() {
    run(App, App.destroy);
  }
});

test("Watching Model Types", function() {
  expect(5);

  var added = function(types) {
    equal(types.length, 1);
    equal(types[0].name, 'App.Post');
    equal(types[0].count, 0);
    strictEqual(types[0].object, App.Post);
  };

  var updated = function(types) {
    equal(types[0].count, 1);
  };

  debugAdapter.watchModelTypes(added, updated);

  run(function() {
    store.push('post', { id: 1, title: 'Post Title' });
  });
});

test("Watching Records", function() {
  var post, args, record;

  Ember.run(function() {
    store.push('post', { id: '1', title: 'Clean Post' });
  });

  var callback = function() {
    args = arguments;
  };

  debugAdapter.watchRecords(App.Post, callback, callback, callback);

  equal(get(args[0], 'length'), 1);
  record = args[0][0];
  deepEqual(record.columnValues, { id: '1', title: 'Clean Post' });
  deepEqual(record.filterValues, { isNew: false, isModified: false, isClean: true });
  deepEqual(record.searchKeywords, ['1', 'Clean Post']);
  deepEqual(record.color, 'black');

  Ember.run(function() {
    post = store.find('post', 1);
  });

  Ember.run(function() {
    post.set('title', 'Modified Post');
  });

  record = args[0][0];
  deepEqual(record.columnValues, { id: '1', title: 'Modified Post' });
  deepEqual(record.filterValues, { isNew: false, isModified: true, isClean: false });
  deepEqual(record.searchKeywords, ['1', 'Modified Post']);
  deepEqual(record.color, 'blue');

  run(function() {
    post = store.createRecord('post', { id: '2', title: 'New Post' });
  });
  record = args[0][0];
  deepEqual(record.columnValues, { id: '2', title: 'New Post' });
  deepEqual(record.filterValues, { isNew: true, isModified: false, isClean: false });
  deepEqual(record.searchKeywords, ['2', 'New Post']);
  deepEqual(record.color, 'green');

  Ember.run(post, 'deleteRecord');

  var index = args[0];
  var count = args[1];
  equal(index, 1);
  equal(count, 1);
});
