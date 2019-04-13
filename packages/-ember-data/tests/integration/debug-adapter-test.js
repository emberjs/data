import { setupTest } from 'ember-qunit';
import { A } from '@ember/array';
import { get } from '@ember/object';
import { run } from '@ember/runloop';
import Model from '@ember-data/model';
import Adapter from '@ember-data/adapter';
import { module, test } from 'qunit';
import { settled } from '@ember/test-helpers';
import { attr, hasMany, belongsTo } from '@ember-data/model';

class Post extends Model {
  @attr()
  title;
}

module('integration/debug-adapter - DS.DebugAdapter', function(hooks) {
  setupTest(hooks);

  let store, debugAdapter;

  hooks.beforeEach(function() {
    let { owner } = this;

    owner.register('model:post', Post);
    store = owner.lookup('service:store');
    debugAdapter = owner.lookup('data-adapter:main');

    debugAdapter.reopen({
      getModelTypes() {
        return A([{ klass: Post, name: 'post' }]);
      },
    });
  });

  test('Watching Model Types', async function(assert) {
    assert.expect(5);

    function added(types) {
      assert.equal(types.length, 1, 'added one type');
      assert.equal(types[0].name, 'post', 'the type is post');
      assert.equal(types[0].count, 0, 'we added zero posts');
      assert.strictEqual(
        types[0].object,
        store.modelFor('post'),
        'we received the ModelClass for post'
      );
    }

    function updated(types) {
      assert.equal(types[0].count, 1, 'We updated one record');
    }

    debugAdapter.watchModelTypes(added, updated);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Post Title',
        },
      },
    });
  });

  test('Watching Records', async function(assert) {
    let addedRecords, updatedRecords, removedIndex, removedCount;

    this.owner.register(
      'adapter:application',
      Adapter.extend({
        shouldBackgroundReloadRecord() {
          return false;
        },
      })
    );

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Clean Post',
        },
      },
    });

    var recordsAdded = function(wrappedRecords) {
      addedRecords = wrappedRecords;
    };
    var recordsUpdated = function(wrappedRecords) {
      updatedRecords = wrappedRecords;
    };
    var recordsRemoved = function(index, count) {
      removedIndex = index;
      removedCount = count;
    };

    debugAdapter.watchRecords('post', recordsAdded, recordsUpdated, recordsRemoved);

    assert.equal(get(addedRecords, 'length'), 1, 'We initially have 1 post');
    let record = addedRecords[0];
    assert.deepEqual(
      record.columnValues,
      { id: '1', title: 'Clean Post' },
      'The initial post has the right values'
    );
    assert.deepEqual(
      record.filterValues,
      { isNew: false, isModified: false, isClean: true },
      'The initial post has the right state'
    );
    assert.deepEqual(record.searchKeywords, ['1', 'Clean Post'], 'We have meaningful keywords');
    assert.deepEqual(
      record.color,
      'black',
      'We are given the right display color for a clean value'
    );

    let post = await store.findRecord('post', 1);

    post.set('title', 'Modified Post');

    assert.equal(get(updatedRecords, 'length'), 1, 'We updated 1 post');
    record = updatedRecords[0];
    assert.deepEqual(
      record.columnValues,
      { id: '1', title: 'Modified Post' },
      'The modified values are correct for the post'
    );
    assert.deepEqual(
      record.filterValues,
      { isNew: false, isModified: true, isClean: false },
      'The modified state is correct for the post'
    );
    assert.deepEqual(
      record.searchKeywords,
      ['1', 'Modified Post'],
      'The keywords have been updated'
    );
    assert.deepEqual(record.color, 'blue', 'we have a color to represent we were modified');

    // reset
    addedRecords = updatedRecords = [];
    removedCount = removedIndex = null;

    post = store.createRecord('post', { id: '2', title: 'New Post' });

    await settled();

    assert.equal(
      get(addedRecords, 'length'),
      1,
      'We are notified when we add a newly created post'
    );
    record = addedRecords[0];
    assert.deepEqual(
      record && record.columnValues,
      { id: '2', title: 'New Post' },
      'The newly created post has the right values'
    );
    assert.deepEqual(
      record && record.filterValues,
      { isNew: true, isModified: false, isClean: false },
      'The newly created post has the right state'
    );
    assert.deepEqual(
      record && record.searchKeywords,
      ['2', 'New Post'],
      'The newly created post has meaningful keywords'
    );
    assert.deepEqual(record && record.color, 'green'),
      'The newly created post has meaningful color to represent new-ness';

    // reset
    addedRecords = updatedRecords = [];
    removedCount = removedIndex = null;

    run(() => post.unloadRecord());

    await settled();

    assert.equal(
      removedIndex,
      1,
      'We are notified of the start index of a removal when we remove posts'
    );
    assert.equal(removedCount, 1, 'We are notified of the total posts removed');
  });

  test('Column names', function(assert) {
    class Person extends Model {
      @attr()
      title;

      @attr()
      firstOrLastName;
    }

    const columns = debugAdapter.columnsForType(Person);

    assert.equal(columns[0].desc, 'Id');
    assert.equal(columns[1].desc, 'Title');
    assert.equal(columns[2].desc, 'First or last name');
  });
});
