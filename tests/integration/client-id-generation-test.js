import { resolve } from 'rsvp';
import { get } from '@ember/object';
import { setupTest } from 'ember-qunit';
import { module, test } from 'qunit';
import Model from 'ember-data/model';
import JSONAPIAdapter from 'ember-data/adapters/json-api';
import { attr, belongsTo, hasMany } from '@ember-decorators/data';

module('integration - Client Id Generation', function(hooks) {
  setupTest(hooks);
  let store;
  let adapter;

  hooks.beforeEach(function() {
    let { owner } = this;

    class Comment extends Model {
      @attr
      text;
      @belongsTo('post', { async: false, inverse: 'comments' })
      post;
    }
    class Post extends Model {
      @attr
      title;
      @hasMany('comment', { async: false, inverse: 'post' })
      comments;
    }
    class Misc extends Model {
      @attr('string')
      foo;
    }

    owner.register('model:comment', Comment);
    owner.register('model:post', Post);
    owner.register('model:misc', Misc);
    owner.register('adapter:application', JSONAPIAdapter);

    store = owner.lookup('service:store');
    adapter = store.adapterFor('application');
  });

  test('If an adapter implements the `generateIdForRecord` method, the store should be able to assign IDs without saving to the persistence layer.', async function(assert) {
    assert.expect(6);

    let idCount = 1;

    adapter.generateIdForRecord = function(passedStore, record) {
      assert.ok(store === passedStore, 'store is the first parameter');

      return 'id-' + idCount++;
    };

    adapter.createRecord = function(store, modelClass, snapshot) {
      let type = modelClass.modelName;

      if (type === 'comment') {
        assert.equal(snapshot.id, 'id-1', "Comment passed to `createRecord` has 'id-1' assigned");
        return resolve({
          data: {
            type,
            id: snapshot.id,
          },
        });
      } else {
        assert.equal(snapshot.id, 'id-2', "Post passed to `createRecord` has 'id-2' assigned");
        return resolve({
          data: {
            type,
            id: snapshot.id,
          },
        });
      }
    };

    let comment = store.createRecord('comment');
    let post = store.createRecord('post');

    assert.equal(get(comment, 'id'), 'id-1', "comment is assigned id 'id-1'");
    assert.equal(get(post, 'id'), 'id-2', "post is assigned id 'id-2'");

    // Despite client-generated IDs, calling save() on the store should still
    // invoke the adapter's `createRecord` method.
    await comment.save();
    await post.save();
  });

  test('empty string and undefined ids should coerce to null', async function(assert) {
    assert.expect(6);
    let idCount = 0;
    let id = 1;
    let ids = [undefined, ''];

    adapter.generateIdForRecord = function(passedStore, record) {
      assert.ok(store === passedStore, 'store is the first parameter');

      return ids[idCount++];
    };

    adapter.createRecord = function(store, type, record) {
      assert.equal(typeof get(record, 'id'), 'object', 'correct type');
      return resolve({ data: { id: id++, type: type.modelName } });
    };

    let comment = store.createRecord('misc');
    let post = store.createRecord('misc');

    assert.equal(get(comment, 'id'), null, "comment is assigned id 'null'");
    assert.equal(get(post, 'id'), null, "post is assigned id 'null'");

    // Despite client-generated IDs, calling commit() on the store should still
    // invoke the adapter's `createRecord` method.
    await comment.save();
    await post.save();
  });
});
