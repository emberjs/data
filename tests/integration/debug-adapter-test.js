import { setupTest } from 'ember-qunit';
import { A } from '@ember/array';
import { get } from '@ember/object';
import Model from 'ember-data/model';
import { attr } from '@ember-decorators/data';
import Adapter from 'ember-data/adapter';
import { module, test } from 'qunit';
import { settled } from '@ember/test-helpers';

class Post extends Model {
  @attr
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
      assert.equal(types.length, 1);
      assert.equal(types[0].name, 'post');
      assert.equal(types[0].count, 0);
      assert.strictEqual(types[0].object, store.modelFor('post'));
    }

    function updated(types) {
      assert.equal(types[0].count, 1);
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

    assert.equal(get(addedRecords, 'length'), 1);
    let record = addedRecords[0];
    assert.deepEqual(record.columnValues, { id: '1', title: 'Clean Post' });
    assert.deepEqual(record.filterValues, { isNew: false, isModified: false, isClean: true });
    assert.deepEqual(record.searchKeywords, ['1', 'Clean Post']);
    assert.deepEqual(record.color, 'black');

    let post = await store.findRecord('post', 1);

    post.set('title', 'Modified Post');

    assert.equal(get(updatedRecords, 'length'), 1);
    record = updatedRecords[0];
    assert.deepEqual(record.columnValues, { id: '1', title: 'Modified Post' });
    assert.deepEqual(record.filterValues, { isNew: false, isModified: true, isClean: false });
    assert.deepEqual(record.searchKeywords, ['1', 'Modified Post']);
    assert.deepEqual(record.color, 'blue');

    post = store.createRecord('post', { id: '2', title: 'New Post' });

    await settled();

    assert.equal(get(addedRecords, 'length'), 1);
    record = addedRecords[0];
    assert.deepEqual(record.columnValues, { id: '2', title: 'New Post' });
    assert.deepEqual(record.filterValues, { isNew: true, isModified: false, isClean: false });
    assert.deepEqual(record.searchKeywords, ['2', 'New Post']);
    assert.deepEqual(record.color, 'green');

    post.unloadRecord();

    await settled();

    assert.equal(removedIndex, 1);
    assert.equal(removedCount, 1);
  });

  test('Column names', function(assert) {
    class Person extends Model {
      @attr
      title;

      @attr
      firstOrLastName;
    }

    const columns = debugAdapter.columnsForType(Person);

    assert.equal(columns[0].desc, 'Id');
    assert.equal(columns[1].desc, 'Title');
    assert.equal(columns[2].desc, 'First or last name');
  });
});
