import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import { FetchManager, Snapshot } from '@ember-data/legacy-compat/-private';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

let owner, store;

module('integration/snapshot - Snapshot', function (hooks) {
  setupTest(hooks);
  hooks.beforeEach(function () {
    class Post extends Model {
      @attr()
      author;

      @attr()
      title;

      @hasMany('comment', { async: true, inverse: 'post' })
      comments;
    }

    class Comment extends Model {
      @attr()
      body;

      @belongsTo('post', { async: true, inverse: 'comments' })
      post;
    }

    owner = this.owner;
    owner.register('model:post', Post);
    owner.register('model:comment', Comment);
    owner.register('adapter:application', JSONAPIAdapter.extend());
    owner.register('serializer:application', class extends JSONAPISerializer {});
    store = owner.lookup('service:store');
    store._fetchManager = new FetchManager(store);
  });

  test('snapshot.attributes() includes defaultValues when appropriate', function (assert) {
    class Address extends Model {
      @attr()
      street;

      @attr({ defaultValue: 'USA' })
      country;

      @attr({ defaultValue: () => 'CA' })
      state;
    }
    owner.register('model:address', Address);

    const newAddress = store.createRecord('address', {});
    const snapshot = newAddress._createSnapshot();
    const expected = {
      country: 'USA',
      state: 'CA',
      street: undefined,
    };

    assert.ok(snapshot instanceof Snapshot, 'snapshot is an instance of Snapshot');
    assert.deepEqual(snapshot.attributes(), expected, 'We generated attributes with default values');

    store.destroy();
  });

  test('record._createSnapshot() returns a snapshot', function (assert) {
    assert.expect(1);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World',
        },
      },
    });
    const post = store.peekRecord('post', 1);
    const snapshot = post._createSnapshot();

    assert.ok(snapshot instanceof Snapshot, 'snapshot is an instance of Snapshot');
  });

  test('snapshot.id, and snapshot.modelName returns correctly', function (assert) {
    assert.expect(2);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World',
        },
      },
    });
    const post = store.peekRecord('post', 1);
    const snapshot = post._createSnapshot();

    assert.strictEqual(snapshot.id, '1', 'id is correct');
    assert.strictEqual(snapshot.modelName, 'post', 'modelName is correct');
  });

  test('an initial findRecord call has no record for internal-model when a snapshot is generated', async function (assert) {
    assert.expect(2);
    store.adapterFor('application').findRecord = (store, type, id, snapshot) => {
      const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'post', id: '1' });
      const record = store._instanceCache.peek({ identifier, bucket: 'record' });
      assert.false(!!record, 'We do not have a materialized record');
      assert.strictEqual(snapshot.__attributes, null, 'attributes were not populated initially');
      return Promise.resolve({
        data: {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Hello World',
          },
        },
      });
    };

    await store.findRecord('post', '1');
  });

  test('snapshots for un-materialized internal-models generate attributes lazily', function (assert) {
    assert.expect(2);

    store._push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World',
        },
      },
    });

    const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'post', id: '1' });
    const snapshot = store._fetchManager.createSnapshot(identifier);
    const expected = {
      author: undefined,
      title: 'Hello World',
    };

    assert.strictEqual(snapshot.__attributes, null, 'attributes were not populated initially');
    snapshot.attributes();
    assert.deepEqual(snapshot.__attributes, expected, 'attributes were populated on access');
  });

  test('snapshots for materialized internal-models generate attributes greedily', function (assert) {
    assert.expect(1);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World',
        },
      },
    });

    const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'post', id: '1' });
    const snapshot = store._fetchManager.createSnapshot(identifier);
    const expected = {
      author: undefined,
      title: 'Hello World',
    };

    assert.deepEqual(snapshot.__attributes, expected, 'attributes were populated initially');
  });

  test('snapshot.attr() does not change when record changes', function (assert) {
    assert.expect(2);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World',
        },
      },
    });
    const post = store.peekRecord('post', 1);
    const snapshot = post._createSnapshot();

    assert.strictEqual(snapshot.attr('title'), 'Hello World', 'snapshot title is correct');
    post.set('title', 'Tomster');
    assert.strictEqual(snapshot.attr('title'), 'Hello World', 'snapshot title is still correct');
  });

  test('snapshot.attr() throws an error attribute not found', function (assert) {
    assert.expect(1);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World',
        },
      },
    });
    const post = store.peekRecord('post', 1);
    const snapshot = post._createSnapshot();
    assert.expectAssertion(
      () => {
        snapshot.attr('unknown');
      },
      /has no attribute named 'unknown' defined/,
      'attr throws error'
    );
  });

  test('snapshot.attributes() returns a copy of all attributes for the current snapshot', function (assert) {
    assert.expect(1);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World',
        },
      },
    });
    const post = store.peekRecord('post', 1);
    const snapshot = post._createSnapshot();

    const attributes = snapshot.attributes();

    assert.deepEqual(attributes, { author: undefined, title: 'Hello World' }, 'attributes are returned correctly');
  });

  test('snapshot.changedAttributes() returns a copy of all changed attributes for the current snapshot', function (assert) {
    assert.expect(1);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World',
        },
      },
    });
    const post = store.peekRecord('post', 1);
    post.set('title', 'Hello World!');
    const snapshot = post._createSnapshot();

    const changes = snapshot.changedAttributes();

    assert.deepEqual(changes.title, ['Hello World', 'Hello World!'], 'changed attributes are returned correctly');
  });

  test('snapshot.belongsTo() returns undefined if relationship is undefined', function (assert) {
    assert.expect(1);

    store.push({
      data: {
        type: 'comment',
        id: '1',
        attributes: {
          body: 'This is comment',
        },
      },
    });
    const comment = store.peekRecord('comment', 1);
    const snapshot = comment._createSnapshot();
    const relationship = snapshot.belongsTo('post');

    assert.strictEqual(relationship, undefined, 'relationship is undefined');
  });

  test('snapshot.belongsTo() returns null if relationship is unset', function (assert) {
    assert.expect(1);

    store.push({
      data: [
        {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Hello World',
          },
        },
        {
          type: 'comment',
          id: '2',
          attributes: {
            body: 'This is comment',
          },
          relationships: {
            post: {
              data: null,
            },
          },
        },
      ],
    });
    const comment = store.peekRecord('comment', 2);
    const snapshot = comment._createSnapshot();
    const relationship = snapshot.belongsTo('post');

    assert.strictEqual(relationship, null, 'relationship is unset');
  });

  test('snapshot.belongsTo() returns a snapshot if relationship is set', function (assert) {
    assert.expect(3);

    store.push({
      data: [
        {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Hello World',
          },
        },
        {
          type: 'comment',
          id: '2',
          attributes: {
            body: 'This is comment',
          },
          relationships: {
            post: {
              data: { type: 'post', id: '1' },
            },
          },
        },
      ],
    });
    const comment = store.peekRecord('comment', 2);
    const snapshot = comment._createSnapshot();
    const relationship = snapshot.belongsTo('post');

    assert.ok(relationship instanceof Snapshot, 'snapshot is an instance of Snapshot');
    assert.strictEqual(relationship.id, '1', 'post id is correct');
    assert.strictEqual(relationship.attr('title'), 'Hello World', 'post title is correct');
  });

  test('snapshot.belongsTo().changedAttributes() returns an empty object if belongsTo record in not instantiated #7015', function (assert) {
    assert.expect(2);

    store.push({
      data: [
        {
          type: 'comment',
          id: '2',
          attributes: {
            body: 'This is comment',
          },
          relationships: {
            post: {
              data: { type: 'post', id: '1' },
            },
          },
        },
      ],
      included: [
        {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Hello World',
          },
        },
      ],
    });
    const comment = store.peekRecord('comment', 2);
    const snapshot = comment._createSnapshot();
    const relationship = snapshot.belongsTo('post');

    assert.ok(relationship instanceof Snapshot, 'snapshot is an instance of Snapshot');
    assert.deepEqual(relationship.changedAttributes(), {}, 'changedAttributes are correct');
  });

  test('snapshot.belongsTo() returns null if relationship is deleted', function (assert) {
    assert.expect(1);

    store.push({
      data: [
        {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Hello World',
          },
        },
        {
          type: 'comment',
          id: '2',
          attributes: {
            body: 'This is comment',
          },
          relationships: {
            post: {
              data: { type: 'post', id: '1' },
            },
          },
        },
      ],
    });
    const post = store.peekRecord('post', 1);
    const comment = store.peekRecord('comment', 2);

    post.deleteRecord();

    const snapshot = comment._createSnapshot();
    const relationship = snapshot.belongsTo('post');

    assert.strictEqual(relationship, null, 'relationship unset after deleted');
  });

  test('snapshot.belongsTo() returns undefined if relationship is a link', function (assert) {
    assert.expect(1);

    store.push({
      data: {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'This is comment',
        },
        relationships: {
          post: {
            links: {
              related: 'post',
            },
          },
        },
      },
    });
    const comment = store.peekRecord('comment', 2);
    const snapshot = comment._createSnapshot();
    const relationship = snapshot.belongsTo('post');

    assert.strictEqual(relationship, undefined, 'relationship is undefined');
  });

  test('snapshot.belongsTo() returns null after a fetched relationship link returns null', async function (assert) {
    assert.expect(2);

    store.adapterFor('application').findBelongsTo = function (store, snapshot, link, relationship) {
      return Promise.resolve({ data: null });
    };

    store.push({
      data: {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'This is comment',
        },
        relationships: {
          post: {
            links: {
              related: 'post',
            },
          },
        },
      },
    });
    const comment = store.peekRecord('comment', 2);

    assert.strictEqual(comment._createSnapshot().belongsTo('post'), undefined, 'relationship is undefined');
    await comment.post;
    assert.strictEqual(comment._createSnapshot().belongsTo('post'), undefined, 'relationship is undefined');
  });

  test("snapshot.belongsTo() throws error if relation doesn't exist", function (assert) {
    assert.expect(1);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World',
        },
      },
    });
    const post = store.peekRecord('post', 1);
    const snapshot = post._createSnapshot();

    assert.expectAssertion(
      () => {
        snapshot.belongsTo('unknown');
      },
      /has no belongsTo relationship named 'unknown'/,
      'throws error'
    );
  });

  test('snapshot.belongsTo() returns a snapshot if relationship link has been fetched', async function (assert) {
    store.adapterFor('application').findBelongsTo = function (store, snapshot, link, relationship) {
      return Promise.resolve({
        data: {
          id: '1',
          type: 'post',
          attributes: { title: 'Hello World' },
          relationships: { comments: { links: { related: './comments' } } },
        },
        included: [
          {
            type: 'comment',
            id: '2',
            relationships: {
              post: {
                data: {
                  type: 'post',
                  id: '1',
                },
              },
            },
          },
        ],
      });
    };

    const comment = store.push({
      data: {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'This is comment',
        },
        relationships: {
          post: {
            links: {
              related: 'post',
            },
          },
        },
      },
    });

    // test preconditions of
    const initialCommentSnapshot = comment._createSnapshot();
    const initialBelongsTo = initialCommentSnapshot.belongsTo('post');
    assert.strictEqual(initialBelongsTo, undefined, 'relationship is empty');

    // fetch the link
    const post = await comment.post;

    const postSnapshot = post._createSnapshot();
    const commentSnapshot = comment._createSnapshot();

    const hasManyRelationship = postSnapshot.hasMany('comments');
    const belongsToRelationship = commentSnapshot.belongsTo('post');

    assert.ok(hasManyRelationship instanceof Array, 'hasMany relationship is an instance of Array');
    assert.strictEqual(hasManyRelationship.length, 1, 'hasMany relationship contains related object');

    assert.ok(belongsToRelationship instanceof Snapshot, 'belongsTo relationship is an instance of Snapshot');
    assert.strictEqual(
      belongsToRelationship.attr('title'),
      'Hello World',
      'belongsTo relationship contains related object'
    );
  });

  test('snapshot.belongsTo() and snapshot.hasMany() returns correctly when adding an object to a hasMany relationship', async function (assert) {
    assert.expect(4);

    store.push({
      data: [
        {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Hello World',
          },
        },
        {
          type: 'comment',
          id: '2',
          attributes: {
            body: 'This is comment',
          },
        },
      ],
    });
    const post = store.peekRecord('post', '1');
    const comment = store.peekRecord('comment', '2');

    const comments = await post.comments;
    comments.push(comment);

    const postSnapshot = post._createSnapshot();
    const commentSnapshot = comment._createSnapshot();

    const hasManyRelationship = postSnapshot.hasMany('comments');
    const belongsToRelationship = commentSnapshot.belongsTo('post');

    assert.ok(hasManyRelationship instanceof Array, 'hasMany relationship is an instance of Array');
    assert.strictEqual(hasManyRelationship.length, 1, 'hasMany relationship contains related object');

    assert.ok(belongsToRelationship instanceof Snapshot, 'belongsTo relationship is an instance of Snapshot');
    assert.strictEqual(
      belongsToRelationship.attr('title'),
      'Hello World',
      'belongsTo relationship contains related object'
    );
  });

  test('snapshot.belongsTo() and snapshot.hasMany() returns correctly when setting an object to a belongsTo relationship', function (assert) {
    assert.expect(4);

    store.push({
      data: [
        {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Hello World',
          },
        },
        {
          type: 'comment',
          id: '2',
          attributes: {
            body: 'This is comment',
          },
        },
      ],
    });
    const post = store.peekRecord('post', 1);
    const comment = store.peekRecord('comment', 2);

    comment.set('post', post);

    const postSnapshot = post._createSnapshot();
    const commentSnapshot = comment._createSnapshot();

    const hasManyRelationship = postSnapshot.hasMany('comments');
    const belongsToRelationship = commentSnapshot.belongsTo('post');

    assert.ok(hasManyRelationship instanceof Array, 'hasMany relationship is an instance of Array');
    assert.strictEqual(hasManyRelationship.length, 1, 'hasMany relationship contains related object');

    assert.ok(belongsToRelationship instanceof Snapshot, 'belongsTo relationship is an instance of Snapshot');
    assert.strictEqual(
      belongsToRelationship.attr('title'),
      'Hello World',
      'belongsTo relationship contains related object'
    );
  });

  test('snapshot.belongsTo() returns ID if option.id is set', function (assert) {
    assert.expect(1);

    store.push({
      data: [
        {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Hello World',
          },
        },
        {
          type: 'comment',
          id: '2',
          attributes: {
            body: 'This is comment',
          },
          relationships: {
            post: {
              data: { type: 'post', id: '1' },
            },
          },
        },
      ],
    });
    const comment = store.peekRecord('comment', 2);
    const snapshot = comment._createSnapshot();
    const relationship = snapshot.belongsTo('post', { id: true });

    assert.strictEqual(relationship, '1', 'relationship ID correctly returned');
  });

  test('snapshot.belongsTo() returns null if option.id is set but relationship was deleted', function (assert) {
    assert.expect(1);

    store.push({
      data: [
        {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Hello World',
          },
        },
        {
          type: 'comment',
          id: '2',
          attributes: {
            body: 'This is comment',
          },
          relationships: {
            post: {
              data: { type: 'post', id: '1' },
            },
          },
        },
      ],
    });
    const post = store.peekRecord('post', 1);
    const comment = store.peekRecord('comment', 2);

    post.deleteRecord();

    const snapshot = comment._createSnapshot();
    const relationship = snapshot.belongsTo('post', { id: true });

    assert.strictEqual(relationship, null, 'relationship unset after deleted');
  });

  test('snapshot.hasMany() returns undefined if relationship is undefined', function (assert) {
    assert.expect(1);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World',
        },
      },
    });
    const post = store.peekRecord('post', 1);
    const snapshot = post._createSnapshot();
    const relationship = snapshot.hasMany('comments');

    assert.strictEqual(relationship, undefined, 'relationship is undefined');
  });

  test('snapshot.hasMany() returns empty array if relationship is empty', function (assert) {
    assert.expect(2);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World',
        },
        relationships: {
          comments: {
            data: [],
          },
        },
      },
    });
    const post = store.peekRecord('post', 1);
    const snapshot = post._createSnapshot();
    const relationship = snapshot.hasMany('comments');

    assert.ok(relationship instanceof Array, 'relationship is an instance of Array');
    assert.strictEqual(relationship.length, 0, 'relationship is empty');
  });

  test('snapshot.hasMany() returns array of snapshots if relationship is set', function (assert) {
    assert.expect(5);

    store.push({
      data: [
        {
          type: 'comment',
          id: '1',
          attributes: {
            body: 'This is the first comment',
          },
        },
        {
          type: 'comment',
          id: '2',
          attributes: {
            body: 'This is the second comment',
          },
        },
        {
          type: 'post',
          id: '3',
          attributes: {
            title: 'Hello World',
          },
          relationships: {
            comments: {
              data: [
                { type: 'comment', id: '1' },
                { type: 'comment', id: '2' },
              ],
            },
          },
        },
      ],
    });
    const post = store.peekRecord('post', 3);
    const snapshot = post._createSnapshot();
    const relationship = snapshot.hasMany('comments');

    assert.ok(relationship instanceof Array, 'relationship is an instance of Array');
    assert.strictEqual(relationship.length, 2, 'relationship has two items');

    const relationship1 = relationship[0];

    assert.ok(relationship1 instanceof Snapshot, 'relationship item is an instance of Snapshot');
    assert.strictEqual(relationship1.id, '1', 'relationship item id is correct');
    assert.strictEqual(relationship1.attr('body'), 'This is the first comment', 'relationship item body is correct');
  });

  test('snapshot.hasMany() returns empty array if relationship records are deleted', function (assert) {
    assert.expect(2);

    store.push({
      data: [
        {
          type: 'comment',
          id: '1',
          attributes: {
            body: 'This is the first comment',
          },
        },
        {
          type: 'comment',
          id: '2',
          attributes: {
            body: 'This is the second comment',
          },
        },
        {
          type: 'post',
          id: '3',
          attributes: {
            title: 'Hello World',
          },
          relationships: {
            comments: {
              data: [
                { type: 'comment', id: '1' },
                { type: 'comment', id: '2' },
              ],
            },
          },
        },
      ],
    });
    const comment1 = store.peekRecord('comment', 1);
    const comment2 = store.peekRecord('comment', 2);
    const post = store.peekRecord('post', 3);

    comment1.deleteRecord();
    comment2.deleteRecord();

    const snapshot = post._createSnapshot();
    const relationship = snapshot.hasMany('comments');

    assert.ok(relationship instanceof Array, 'relationship is an instance of Array');
    assert.strictEqual(relationship.length, 0, 'relationship is empty');
  });

  test('snapshot.hasMany() returns array of IDs if option.ids is set', function (assert) {
    assert.expect(1);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World',
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' },
            ],
          },
        },
      },
    });
    const post = store.peekRecord('post', 1);
    const snapshot = post._createSnapshot();
    const relationship = snapshot.hasMany('comments', { ids: true });

    assert.deepEqual(relationship, ['2', '3'], 'relationship IDs correctly returned');
  });

  test('snapshot.hasMany() returns empty array of IDs if option.ids is set but relationship records were deleted', function (assert) {
    assert.expect(2);

    store.push({
      data: [
        {
          type: 'comment',
          id: '1',
          attributes: {
            body: 'This is the first comment',
          },
        },
        {
          type: 'comment',
          id: '2',
          attributes: {
            body: 'This is the second comment',
          },
        },
        {
          type: 'post',
          id: '3',
          attributes: {
            title: 'Hello World',
          },
          relationships: {
            comments: {
              data: [
                { type: 'comment', id: '1' },
                { type: 'comment', id: '2' },
              ],
            },
          },
        },
      ],
    });
    const comment1 = store.peekRecord('comment', 1);
    const comment2 = store.peekRecord('comment', 2);
    const post = store.peekRecord('post', 3);

    comment1.deleteRecord();
    comment2.deleteRecord();

    const snapshot = post._createSnapshot();
    const relationship = snapshot.hasMany('comments', { ids: true });

    assert.ok(relationship instanceof Array, 'relationship is an instance of Array');
    assert.strictEqual(relationship.length, 0, 'relationship is empty');
  });

  test('snapshot.hasMany() returns undefined if relationship is a link', function (assert) {
    assert.expect(1);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World',
        },
        relationships: {
          comments: {
            links: {
              related: 'comments',
            },
          },
        },
      },
    });
    const post = store.peekRecord('post', 1);
    const snapshot = post._createSnapshot();
    const relationship = snapshot.hasMany('comments');

    assert.strictEqual(relationship, undefined, 'relationship is undefined');
  });

  test('snapshot.hasMany() returns array of snapshots if relationship link has been fetched', async function (assert) {
    assert.expect(2);

    store.adapterFor('application').findHasMany = function (store, snapshot, link, relationship) {
      return Promise.resolve({
        data: [{ id: '2', type: 'comment', attributes: { body: 'This is comment' } }],
      });
    };

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World',
        },
        relationships: {
          comments: {
            links: {
              related: 'comments',
            },
          },
        },
      },
    });

    const post = store.peekRecord('post', 1);

    await post.comments.then((comments) => {
      const snapshot = post._createSnapshot();
      const relationship = snapshot.hasMany('comments');

      assert.ok(relationship instanceof Array, 'relationship is an instance of Array');
      assert.strictEqual(relationship.length, 1, 'relationship has one item');
    });
  });

  test("snapshot.hasMany() throws error if relation doesn't exist", function (assert) {
    assert.expect(1);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World',
        },
      },
    });
    const post = store.peekRecord('post', 1);
    const snapshot = post._createSnapshot();

    assert.expectAssertion(
      () => {
        snapshot.hasMany('unknown');
      },
      /has no hasMany relationship named 'unknown'/,
      'throws error'
    );
  });

  test('snapshot.hasMany() respects the order of items in the relationship', async function (assert) {
    assert.expect(10);

    const [comment1, comment2, comment3, post] = store.push({
      data: [
        {
          type: 'comment',
          id: '1',
          attributes: {
            body: 'This is the first comment',
          },
        },
        {
          type: 'comment',
          id: '2',
          attributes: {
            body: 'This is the second comment',
          },
        },
        {
          type: 'comment',
          id: '3',
          attributes: {
            body: 'This is the third comment',
          },
        },
        {
          type: 'post',
          id: '4',
          attributes: {
            title: 'Hello World',
          },
          relationships: {
            comments: {
              data: [
                { type: 'comment', id: '1' },
                { type: 'comment', id: '2' },
                { type: 'comment', id: '3' },
              ],
            },
          },
        },
      ],
    });
    const comments = await post.comments;
    let snapshot = post._createSnapshot();
    let relationship = snapshot.hasMany('comments');

    assert.arrayStrictEquals(comments, [comment1, comment2, comment3], 'initial relationship order is correct');
    assert.arrayStrictEquals(
      relationship.map((s) => s.id),
      ['1', '2', '3'],
      'initial relationship reference order is correct'
    );

    // change order locally
    comments.splice(comments.indexOf(comment3), 1);
    comments.unshift(comment3);

    snapshot = post._createSnapshot();
    relationship = snapshot.hasMany('comments');

    assert.arrayStrictEquals(comments, [comment3, comment1, comment2], 'relationship preserved local order');
    assert.arrayStrictEquals(
      relationship.map((s) => s.id),
      ['3', '1', '2'],
      'relationship reference preserved local order'
    );

    // change order locally again
    comments.splice(comments.indexOf(comment1), 1);

    snapshot = post._createSnapshot();
    relationship = snapshot.hasMany('comments');

    assert.arrayStrictEquals(comments, [comment3, comment2], 'relationship preserved local order');
    assert.arrayStrictEquals(
      relationship.map((s) => s.id),
      ['3', '2'],
      'relationship reference preserved local order'
    );

    // and again
    comments.push(comment1);

    snapshot = post._createSnapshot();
    relationship = snapshot.hasMany('comments');

    assert.arrayStrictEquals(comments, [comment3, comment2, comment1], 'relationship preserved local order');
    assert.arrayStrictEquals(
      relationship.map((s) => s.id),
      ['3', '2', '1'],
      'relationship reference preserved local order'
    );

    // push a new remote state with a different order
    store.push({
      data: {
        type: 'post',
        id: '4',
        attributes: {
          title: 'Hello World',
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '3' },
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
            ],
          },
        },
      },
    });

    snapshot = post._createSnapshot();
    relationship = snapshot.hasMany('comments');

    assert.arrayStrictEquals(comments, [comment3, comment1, comment2], 'relationship updated to remote order');
    assert.arrayStrictEquals(
      relationship.map((s) => s.id),
      ['3', '1', '2'],
      'relationship updated to remote order'
    );
  });

  test('snapshot.eachAttribute() proxies to record', function (assert) {
    assert.expect(1);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World',
        },
      },
    });
    const post = store.peekRecord('post', 1);
    const snapshot = post._createSnapshot();

    const attributes = [];
    snapshot.eachAttribute((name) => attributes.push(name));
    assert.deepEqual(attributes, ['author', 'title'], 'attributes are iterated correctly');
  });

  test('snapshot.eachRelationship() proxies to record', function (assert) {
    assert.expect(2);

    const getRelationships = function (snapshot) {
      const relationships = [];
      snapshot.eachRelationship((name) => relationships.push(name));
      return relationships;
    };

    store.push({
      data: [
        {
          type: 'comment',
          id: '1',
          attributes: {
            body: 'This is the first comment',
          },
        },
        {
          type: 'post',
          id: '2',
          attributes: {
            title: 'Hello World',
          },
        },
      ],
    });
    const comment = store.peekRecord('comment', 1);
    const post = store.peekRecord('post', 2);
    let snapshot;

    snapshot = comment._createSnapshot();
    assert.deepEqual(getRelationships(snapshot), ['post'], 'relationships are iterated correctly');

    snapshot = post._createSnapshot();
    assert.deepEqual(getRelationships(snapshot), ['comments'], 'relationships are iterated correctly');
  });

  test('snapshot.belongsTo() does not trigger a call to store._scheduleFetch', function (assert) {
    assert.expect(0);

    store._scheduleFetch = function () {
      assert.ok(false, 'store._scheduleFetch should not be called');
    };

    store.push({
      data: {
        type: 'comment',
        id: '1',
        attributes: {
          body: 'This is the first comment',
        },
        relationships: {
          post: {
            data: { type: 'post', id: '2' },
          },
        },
      },
    });
    const comment = store.peekRecord('comment', 1);
    const snapshot = comment._createSnapshot();

    snapshot.belongsTo('post');
  });

  test('snapshot.hasMany() does not trigger a call to store._scheduleFetch', function (assert) {
    assert.expect(0);

    store._scheduleFetch = function () {
      assert.ok(false, 'store._scheduleFetch should not be called');
    };

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World',
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' },
            ],
          },
        },
      },
    });
    const post = store.peekRecord('post', 1);
    const snapshot = post._createSnapshot();

    snapshot.hasMany('comments');
  });

  test('snapshot.serialize() serializes itself', function (assert) {
    assert.expect(2);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World',
        },
      },
    });
    const post = store.peekRecord('post', 1);
    const snapshot = post._createSnapshot();

    post.set('title', 'New Title');

    const expected = {
      data: {
        attributes: {
          author: undefined,
          title: 'Hello World',
        },
        type: 'posts',
      },
    };
    assert.deepEqual(snapshot.serialize(), expected, 'snapshot serializes correctly');
    expected.data.id = '1';
    assert.deepEqual(snapshot.serialize({ includeId: true }), expected, 'serialize takes options');
  });
});
