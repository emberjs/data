import { resolve } from 'rsvp';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

import JSONAPIAdapter from '@ember-data/adapter/json-api';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import Model from '@ember-data/model';
import { Snapshot } from 'ember-data/-private';
import { attr, belongsTo, hasMany } from '@ember-data/model';

let owner, store, _Post;

module('integration/snapshot - Snapshot', function(hooks) {
  setupTest(hooks);
  hooks.beforeEach(function() {
    class Post extends Model {
      @attr()
      author;

      @attr()
      title;

      @hasMany({ async: true })
      comments;
    }

    class Comment extends Model {
      @attr()
      body;

      @belongsTo({ async: true })
      post;
    }
    _Post = Post;

    owner = this.owner;
    owner.register('model:post', Post);
    owner.register('model:comment', Comment);
    owner.register('adapter:application', JSONAPIAdapter.extend());
    owner.register('serializer:application', JSONAPISerializer.extend());
    store = owner.lookup('service:store');
  });

  test('snapshot.attributes() includes defaultValues when appropriate', function(assert) {
    class Address extends Model {
      @attr()
      street;

      @attr({ defaultValue: 'USA' })
      country;

      @attr({ defaultValue: () => 'CA' })
      state;
    }
    owner.register('model:address', Address);

    let newAddress = store.createRecord('address', {});
    let snapshot = newAddress._createSnapshot();
    let expected = {
      country: 'USA',
      state: 'CA',
      street: undefined,
    };

    assert.ok(snapshot instanceof Snapshot, 'snapshot is an instance of Snapshot');
    assert.deepEqual(snapshot.attributes(), expected, 'We generated attributes with default values');

    store.destroy();
  });

  test('record._createSnapshot() returns a snapshot', function(assert) {
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
    let post = store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();

    assert.ok(snapshot instanceof Snapshot, 'snapshot is an instance of Snapshot');
  });

  test('snapshot.id, snapshot.type and snapshot.modelName returns correctly', function(assert) {
    assert.expect(3);

    store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World',
        },
      },
    });
    let post = store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();

    assert.equal(snapshot.id, '1', 'id is correct');
    assert.ok(Model.detect(snapshot.type), 'type is correct');
    assert.equal(snapshot.modelName, 'post', 'modelName is correct');
  });

  test('snapshot.type loads the class lazily', async function(assert) {
    assert.expect(3);

    let postClassLoaded = false;
    let modelFactoryFor = store._modelFactoryFor;
    store._modelFactoryFor = name => {
      if (name === 'post') {
        postClassLoaded = true;
      }
      return modelFactoryFor.call(store, name);
    };

    await store._push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World',
        },
      },
    });
    let postInternalModel = store._internalModelForId('post', 1);
    let snapshot = await postInternalModel.createSnapshot();

    assert.equal(false, postClassLoaded, 'model class is not eagerly loaded');
    assert.equal(snapshot.type, _Post, 'type is correct');
    assert.equal(true, postClassLoaded, 'model class is loaded');
  });

  test('an initial findRecord call has no record for internal-model when a snapshot is generated', function(assert) {
    assert.expect(2);
    store.adapterFor('application').findRecord = (store, type, id, snapshot) => {
      assert.equal(snapshot._internalModel.hasRecord, false, 'We do not have a materialized record');
      assert.equal(snapshot.__attributes, null, 'attributes were not populated initially');
      return resolve({
        data: {
          type: 'post',
          id: '1',
          attributes: {
            title: 'Hello World',
          },
        },
      });
    };

    store.findRecord('post', '1');
  });

  test('snapshots for un-materialized internal-models generate attributes lazily', function(assert) {
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

    let postInternalModel = store._internalModelForId('post', 1);
    let snapshot = postInternalModel.createSnapshot();
    let expected = {
      author: undefined,
      title: 'Hello World',
    };

    assert.equal(snapshot.__attributes, null, 'attributes were not populated initially');
    snapshot.attributes();
    assert.deepEqual(snapshot.__attributes, expected, 'attributes were populated on access');
  });

  test('snapshots for materialized internal-models generate attributes greedily', function(assert) {
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

    let postInternalModel = store._internalModelForId('post', 1);
    let snapshot = postInternalModel.createSnapshot();
    let expected = {
      author: undefined,
      title: 'Hello World',
    };

    assert.deepEqual(snapshot.__attributes, expected, 'attributes were populated initially');
  });

  test('snapshot.attr() does not change when record changes', function(assert) {
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
    let post = store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();

    assert.equal(snapshot.attr('title'), 'Hello World', 'snapshot title is correct');
    post.set('title', 'Tomster');
    assert.equal(snapshot.attr('title'), 'Hello World', 'snapshot title is still correct');
  });

  test('snapshot.attr() throws an error attribute not found', function(assert) {
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
    let post = store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();

    assert.throws(
      () => {
        snapshot.attr('unknown');
      },
      /has no attribute named 'unknown' defined/,
      'attr throws error'
    );
  });

  test('snapshot.attributes() returns a copy of all attributes for the current snapshot', function(assert) {
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
    let post = store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();

    let attributes = snapshot.attributes();

    assert.deepEqual(attributes, { author: undefined, title: 'Hello World' }, 'attributes are returned correctly');
  });

  test('snapshot.changedAttributes() returns a copy of all changed attributes for the current snapshot', function(assert) {
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
    let post = store.peekRecord('post', 1);
    post.set('title', 'Hello World!');
    let snapshot = post._createSnapshot();

    let changes = snapshot.changedAttributes();

    assert.deepEqual(changes.title, ['Hello World', 'Hello World!'], 'changed attributes are returned correctly');
  });

  test('snapshot.belongsTo() returns undefined if relationship is undefined', function(assert) {
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
    let comment = store.peekRecord('comment', 1);
    let snapshot = comment._createSnapshot();
    let relationship = snapshot.belongsTo('post');

    assert.equal(relationship, undefined, 'relationship is undefined');
  });

  test('snapshot.belongsTo() returns null if relationship is unset', function(assert) {
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
    let comment = store.peekRecord('comment', 2);
    let snapshot = comment._createSnapshot();
    let relationship = snapshot.belongsTo('post');

    assert.equal(relationship, null, 'relationship is unset');
  });

  test('snapshot.belongsTo() returns a snapshot if relationship is set', function(assert) {
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
    let comment = store.peekRecord('comment', 2);
    let snapshot = comment._createSnapshot();
    let relationship = snapshot.belongsTo('post');

    assert.ok(relationship instanceof Snapshot, 'snapshot is an instance of Snapshot');
    assert.equal(relationship.id, '1', 'post id is correct');
    assert.equal(relationship.attr('title'), 'Hello World', 'post title is correct');
  });

  test('snapshot.belongsTo() returns null if relationship is deleted', function(assert) {
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
    let post = store.peekRecord('post', 1);
    let comment = store.peekRecord('comment', 2);

    post.deleteRecord();

    let snapshot = comment._createSnapshot();
    let relationship = snapshot.belongsTo('post');

    assert.equal(relationship, null, 'relationship unset after deleted');
  });

  test('snapshot.belongsTo() returns undefined if relationship is a link', function(assert) {
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
    let comment = store.peekRecord('comment', 2);
    let snapshot = comment._createSnapshot();
    let relationship = snapshot.belongsTo('post');

    assert.equal(relationship, undefined, 'relationship is undefined');
  });

  test("snapshot.belongsTo() throws error if relation doesn't exist", function(assert) {
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
    let post = store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();

    assert.throws(
      () => {
        snapshot.belongsTo('unknown');
      },
      /has no belongsTo relationship named 'unknown'/,
      'throws error'
    );
  });

  test('snapshot.belongsTo() returns a snapshot if relationship link has been fetched', async function(assert) {
    assert.expect(4);

    store.adapterFor('application').findBelongsTo = function(store, snapshot, link, relationship) {
      return resolve({ data: { id: 1, type: 'post', attributes: { title: 'Hello World' } } });
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
    let comment = store.peekRecord('comment', 2);

    await comment.get('post').then(post => {
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
      let comment = store.peekRecord('comment', 2);

      post.get('comments').then(comments => {
        comments.addObject(comment);

        let postSnapshot = post._createSnapshot();
        let commentSnapshot = comment._createSnapshot();

        let hasManyRelationship = postSnapshot.hasMany('comments');
        let belongsToRelationship = commentSnapshot.belongsTo('post');

        assert.ok(hasManyRelationship instanceof Array, 'hasMany relationship is an instance of Array');
        assert.equal(hasManyRelationship.length, 1, 'hasMany relationship contains related object');

        assert.ok(belongsToRelationship instanceof Snapshot, 'belongsTo relationship is an instance of Snapshot');
        assert.equal(
          belongsToRelationship.attr('title'),
          'Hello World',
          'belongsTo relationship contains related object'
        );
      });
    });
  });

  test('snapshot.belongsTo() and snapshot.hasMany() returns correctly when adding an object to a hasMany relationship', async function(assert) {
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
    let post = store.peekRecord('post', 1);
    let comment = store.peekRecord('comment', 2);

    await post.get('comments').then(comments => {
      comments.addObject(comment);

      let postSnapshot = post._createSnapshot();
      let commentSnapshot = comment._createSnapshot();

      let hasManyRelationship = postSnapshot.hasMany('comments');
      let belongsToRelationship = commentSnapshot.belongsTo('post');

      assert.ok(hasManyRelationship instanceof Array, 'hasMany relationship is an instance of Array');
      assert.equal(hasManyRelationship.length, 1, 'hasMany relationship contains related object');

      assert.ok(belongsToRelationship instanceof Snapshot, 'belongsTo relationship is an instance of Snapshot');
      assert.equal(
        belongsToRelationship.attr('title'),
        'Hello World',
        'belongsTo relationship contains related object'
      );
    });
  });

  test('snapshot.belongsTo() and snapshot.hasMany() returns correctly when setting an object to a belongsTo relationship', function(assert) {
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
    let post = store.peekRecord('post', 1);
    let comment = store.peekRecord('comment', 2);

    comment.set('post', post);

    let postSnapshot = post._createSnapshot();
    let commentSnapshot = comment._createSnapshot();

    let hasManyRelationship = postSnapshot.hasMany('comments');
    let belongsToRelationship = commentSnapshot.belongsTo('post');

    assert.ok(hasManyRelationship instanceof Array, 'hasMany relationship is an instance of Array');
    assert.equal(hasManyRelationship.length, 1, 'hasMany relationship contains related object');

    assert.ok(belongsToRelationship instanceof Snapshot, 'belongsTo relationship is an instance of Snapshot');
    assert.equal(belongsToRelationship.attr('title'), 'Hello World', 'belongsTo relationship contains related object');
  });

  test('snapshot.belongsTo() returns ID if option.id is set', function(assert) {
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
    let comment = store.peekRecord('comment', 2);
    let snapshot = comment._createSnapshot();
    let relationship = snapshot.belongsTo('post', { id: true });

    assert.equal(relationship, '1', 'relationship ID correctly returned');
  });

  test('snapshot.belongsTo() returns null if option.id is set but relationship was deleted', function(assert) {
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
    let post = store.peekRecord('post', 1);
    let comment = store.peekRecord('comment', 2);

    post.deleteRecord();

    let snapshot = comment._createSnapshot();
    let relationship = snapshot.belongsTo('post', { id: true });

    assert.equal(relationship, null, 'relationship unset after deleted');
  });

  test('snapshot.hasMany() returns undefined if relationship is undefined', function(assert) {
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
    let post = store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();
    let relationship = snapshot.hasMany('comments');

    assert.equal(relationship, undefined, 'relationship is undefined');
  });

  test('snapshot.hasMany() returns empty array if relationship is empty', function(assert) {
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
    let post = store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();
    let relationship = snapshot.hasMany('comments');

    assert.ok(relationship instanceof Array, 'relationship is an instance of Array');
    assert.equal(relationship.length, 0, 'relationship is empty');
  });

  test('snapshot.hasMany() returns array of snapshots if relationship is set', function(assert) {
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
    let post = store.peekRecord('post', 3);
    let snapshot = post._createSnapshot();
    let relationship = snapshot.hasMany('comments');

    assert.ok(relationship instanceof Array, 'relationship is an instance of Array');
    assert.equal(relationship.length, 2, 'relationship has two items');

    let relationship1 = relationship[0];

    assert.ok(relationship1 instanceof Snapshot, 'relationship item is an instance of Snapshot');
    assert.equal(relationship1.id, '1', 'relationship item id is correct');
    assert.equal(relationship1.attr('body'), 'This is the first comment', 'relationship item body is correct');
  });

  test('snapshot.hasMany() returns empty array if relationship records are deleted', function(assert) {
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
    let comment1 = store.peekRecord('comment', 1);
    let comment2 = store.peekRecord('comment', 2);
    let post = store.peekRecord('post', 3);

    comment1.deleteRecord();
    comment2.deleteRecord();

    let snapshot = post._createSnapshot();
    let relationship = snapshot.hasMany('comments');

    assert.ok(relationship instanceof Array, 'relationship is an instance of Array');
    assert.equal(relationship.length, 0, 'relationship is empty');
  });

  test('snapshot.hasMany() returns array of IDs if option.ids is set', function(assert) {
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
    let post = store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();
    let relationship = snapshot.hasMany('comments', { ids: true });

    assert.deepEqual(relationship, ['2', '3'], 'relationship IDs correctly returned');
  });

  test('snapshot.hasMany() returns empty array of IDs if option.ids is set but relationship records were deleted', function(assert) {
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
    let comment1 = store.peekRecord('comment', 1);
    let comment2 = store.peekRecord('comment', 2);
    let post = store.peekRecord('post', 3);

    comment1.deleteRecord();
    comment2.deleteRecord();

    let snapshot = post._createSnapshot();
    let relationship = snapshot.hasMany('comments', { ids: true });

    assert.ok(relationship instanceof Array, 'relationship is an instance of Array');
    assert.equal(relationship.length, 0, 'relationship is empty');
  });

  test('snapshot.hasMany() returns undefined if relationship is a link', function(assert) {
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
    let post = store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();
    let relationship = snapshot.hasMany('comments');

    assert.equal(relationship, undefined, 'relationship is undefined');
  });

  test('snapshot.hasMany() returns array of snapshots if relationship link has been fetched', async function(assert) {
    assert.expect(2);

    store.adapterFor('application').findHasMany = function(store, snapshot, link, relationship) {
      return resolve({
        data: [{ id: 2, type: 'comment', attributes: { body: 'This is comment' } }],
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

    let post = store.peekRecord('post', 1);

    await post.get('comments').then(comments => {
      let snapshot = post._createSnapshot();
      let relationship = snapshot.hasMany('comments');

      assert.ok(relationship instanceof Array, 'relationship is an instance of Array');
      assert.equal(relationship.length, 1, 'relationship has one item');
    });
  });

  test("snapshot.hasMany() throws error if relation doesn't exist", function(assert) {
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
    let post = store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();

    assert.throws(
      () => {
        snapshot.hasMany('unknown');
      },
      /has no hasMany relationship named 'unknown'/,
      'throws error'
    );
  });

  test('snapshot.hasMany() respects the order of items in the relationship', function(assert) {
    assert.expect(3);

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
    let comment3 = store.peekRecord('comment', 3);
    let post = store.peekRecord('post', 4);

    post.get('comments').removeObject(comment3);
    post.get('comments').insertAt(0, comment3);

    let snapshot = post._createSnapshot();
    let relationship = snapshot.hasMany('comments');

    assert.equal(relationship[0].id, '3', 'order of comment 3 is correct');
    assert.equal(relationship[1].id, '1', 'order of comment 1 is correct');
    assert.equal(relationship[2].id, '2', 'order of comment 2 is correct');
  });

  test('snapshot.eachAttribute() proxies to record', function(assert) {
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
    let post = store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();

    let attributes = [];
    snapshot.eachAttribute(name => attributes.push(name));
    assert.deepEqual(attributes, ['author', 'title'], 'attributes are iterated correctly');
  });

  test('snapshot.eachRelationship() proxies to record', function(assert) {
    assert.expect(2);

    let getRelationships = function(snapshot) {
      let relationships = [];
      snapshot.eachRelationship(name => relationships.push(name));
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
    let comment = store.peekRecord('comment', 1);
    let post = store.peekRecord('post', 2);
    let snapshot;

    snapshot = comment._createSnapshot();
    assert.deepEqual(getRelationships(snapshot), ['post'], 'relationships are iterated correctly');

    snapshot = post._createSnapshot();
    assert.deepEqual(getRelationships(snapshot), ['comments'], 'relationships are iterated correctly');
  });

  test('snapshot.belongsTo() does not trigger a call to store._scheduleFetch', function(assert) {
    assert.expect(0);

    store._scheduleFetch = function() {
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
    let comment = store.peekRecord('comment', 1);
    let snapshot = comment._createSnapshot();

    snapshot.belongsTo('post');
  });

  test('snapshot.hasMany() does not trigger a call to store._scheduleFetch', function(assert) {
    assert.expect(0);

    store._scheduleFetch = function() {
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
    let post = store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();

    snapshot.hasMany('comments');
  });

  test('snapshot.serialize() serializes itself', function(assert) {
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
    let post = store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();

    post.set('title', 'New Title');

    let expected = {
      data: {
        attributes: {
          author: undefined,
          title: 'Hello World',
        },
        type: 'posts',
      },
    };
    assert.deepEqual(snapshot.serialize(), expected, 'shapshot serializes correctly');
    expected.data.id = '1';
    assert.deepEqual(snapshot.serialize({ includeId: true }), expected, 'serialize takes options');
  });
});
