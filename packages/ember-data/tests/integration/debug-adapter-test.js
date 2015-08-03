var App, store, debugAdapter;
var get = Ember.get;
var run = Ember.run;

module("DS.DebugAdapter", {
  setup: function() {
    Ember.run(function() {
      App = Ember.Application.create();
      App.toString = function() { return 'App'; };

      App.StoreService = DS.Store.extend({});

      App.ApplicationAdapter = DS.Adapter.extend({
        shouldBackgroundReloadRecord: () => false
      });

      App.Post = DS.Model.extend({
        title: DS.attr('string')
      });

      // TODO: Remove this when Ember is upgraded to >= 1.13
      App.Post.reopenClass({
        _debugContainerKey: 'model:post'
      });

    });

    store = App.__container__.lookup('service:store');
    debugAdapter = App.__container__.lookup('data-adapter:main');

    debugAdapter.reopen({
      getModelTypes: function() {
        return Ember.A([{ klass: App.__container__.lookupFactory('model:post'), name: 'post' }]);
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
    equal(types[0].name, 'post');
    equal(types[0].count, 0);
    strictEqual(types[0].object, store.modelFor('post'));
  };

  var updated = function(types) {
    equal(types[0].count, 1);
  };

  debugAdapter.watchModelTypes(added, updated);

  run(function() {
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Post Title'
        }
      }
    });
  });
});

test("Watching Records", function() {
  var post, record, addedRecords, updatedRecords, removedIndex, removedCount;

  Ember.run(function() {
    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Clean Post'
        }
      }
    });
  });

  var recordsAdded = function(wrappedRecords) {
    addedRecords = wrappedRecords;
  };
  var  recordsUpdated = function(wrappedRecords) {
    updatedRecords = wrappedRecords;
  };
  var recordsRemoved = function(index, count) {
    removedIndex = index;
    removedCount = count;
  };

  let modelClassOrName;
  if (debugAdapter.get('acceptsModelName')) {
    modelClassOrName = 'post';
  } else {
    modelClassOrName = App.__container__.lookupFactory('model:post');
  }
  debugAdapter.watchRecords(modelClassOrName, recordsAdded, recordsUpdated, recordsRemoved);

  equal(get(addedRecords, 'length'), 1);
  record = addedRecords[0];
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

  equal(get(updatedRecords, 'length'), 1);
  record = updatedRecords[0];
  deepEqual(record.columnValues, { id: '1', title: 'Modified Post' });
  deepEqual(record.filterValues, { isNew: false, isModified: true, isClean: false });
  deepEqual(record.searchKeywords, ['1', 'Modified Post']);
  deepEqual(record.color, 'blue');

  run(function() {
    post = store.createRecord('post', { id: '2', title: 'New Post' });
  });
  equal(get(addedRecords, 'length'), 1);
  record = addedRecords[0];
  deepEqual(record.columnValues, { id: '2', title: 'New Post' });
  deepEqual(record.filterValues, { isNew: true, isModified: false, isClean: false });
  deepEqual(record.searchKeywords, ['2', 'New Post']);
  deepEqual(record.color, 'green');

  Ember.run(post, 'unloadRecord');

  equal(removedIndex, 1);
  equal(removedCount, 1);
});
