import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

let App, store, debugAdapter;
const { get, run } = Ember;

module('DS.DebugAdapter', {
  beforeEach() {
    Ember.run(function() {
      App = Ember.Application.extend({
        toString() { return 'debug-app'; }
      }).create();

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

    let klass;

    if (App.__container__.factoryFor) {
      klass = App.__container__.factoryFor('model:post').class;
    } else {
      klass = App.__container__.lookupFactory('model:post');
    }

    debugAdapter.reopen({
      getModelTypes() {
        return Ember.A([{ klass, name: 'post' }]);
      }
    });
  },
  afterEach() {
    run(App, App.destroy);
    App = store = null;
  }
});

test('Watching Model Types', function(assert) {
  assert.expect(5);

  function added(types) {
    assert.equal(types.length, 1);
    assert.equal(types[0].name, 'post');
    assert.equal(types[0].count, 0);
    assert.strictEqual(types[0].object, store.modelFor('post'));
  }

  function updated(types) {
    assert.equal(types[0].count, 1);
  }

  debugAdapter.watchModelTypes(added, updated);

  run(() => {
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

test("Watching Records", function(assert) {
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

  assert.equal(get(addedRecords, 'length'), 1);
  record = addedRecords[0];
  assert.deepEqual(record.columnValues, { id: '1', title: 'Clean Post' });
  assert.deepEqual(record.filterValues, { isNew: false, isModified: false, isClean: true });
  assert.deepEqual(record.searchKeywords, ['1', 'Clean Post']);
  assert.deepEqual(record.color, 'black');

  Ember.run(function() {
    post = store.findRecord('post', 1);
  });

  Ember.run(function() {
    post.set('title', 'Modified Post');
  });

  assert.equal(get(updatedRecords, 'length'), 1);
  record = updatedRecords[0];
  assert.deepEqual(record.columnValues, { id: '1', title: 'Modified Post' });
  assert.deepEqual(record.filterValues, { isNew: false, isModified: true, isClean: false });
  assert.deepEqual(record.searchKeywords, ['1', 'Modified Post']);
  assert.deepEqual(record.color, 'blue');

  run(function() {
    post = store.createRecord('post', { id: '2', title: 'New Post' });
  });
  assert.equal(get(addedRecords, 'length'), 1);
  record = addedRecords[0];
  assert.deepEqual(record.columnValues, { id: '2', title: 'New Post' });
  assert.deepEqual(record.filterValues, { isNew: true, isModified: false, isClean: false });
  assert.deepEqual(record.searchKeywords, ['2', 'New Post']);
  assert.deepEqual(record.color, 'green');

  Ember.run(post, 'unloadRecord');

  assert.equal(removedIndex, 1);
  assert.equal(removedCount, 1);
});
