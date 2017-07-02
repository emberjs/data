import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

const { run } = Ember;
let env, Post, Comment;

module("integration/snapshot - DS.Snapshot", {
  beforeEach() {
    Post = DS.Model.extend({
      author: DS.attr(),
      title: DS.attr(),
      comments: DS.hasMany({ async: true })
    });
    Comment = DS.Model.extend({
      body: DS.attr(),
      post: DS.belongsTo({ async: true })
    });

    env = setupStore({
      post: Post,
      comment: Comment
    });
  },

  afterEach() {
    run(() => {
      env.store.destroy();
    });
  }
});

test("record._createSnapshot() returns a snapshot", function(assert) {
  assert.expect(1);

  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World'
        }
      }
    });
    let post = env.store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();

    assert.ok(snapshot instanceof DS.Snapshot, 'snapshot is an instance of DS.Snapshot');
  });
});

test("snapshot.id, snapshot.type and snapshot.modelName returns correctly", function(assert) {
  assert.expect(3);

  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World'
        }
      }
    });
    let post = env.store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();

    assert.equal(snapshot.id, '1', 'id is correct');
    assert.ok(DS.Model.detect(snapshot.type), 'type is correct');
    assert.equal(snapshot.modelName, 'post', 'modelName is correct');
  });
});

test('snapshot.type loads the class lazily', function(assert) {
  assert.expect(3);

  let postClassLoaded = false;
  let modelFor = env.store._modelFor;
  env.store._modelFor = (name) => {
    if (name === 'post') {
      postClassLoaded = true;
    }
    return modelFor.call(env.store, name);
  };

  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World'
        }
      }
    });
    let postInternalModel = env.store._internalModelForId('post', 1);
    let snapshot = postInternalModel.createSnapshot();

    assert.equal(false, postClassLoaded, 'model class is not eagerly loaded');
    assert.equal(snapshot.type, Post, 'type is correct');
    assert.equal(true, postClassLoaded, 'model class is loaded');
  });
});

test("snapshot.attr() does not change when record changes", function(assert) {
  assert.expect(2);

  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World'
        }
      }
    });
    let post = env.store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();

    assert.equal(snapshot.attr('title'), 'Hello World', 'snapshot title is correct');
    post.set('title', 'Tomster');
    assert.equal(snapshot.attr('title'), 'Hello World', 'snapshot title is still correct');
  });
});

test("snapshot.attr() throws an error attribute not found", function(assert) {
  assert.expect(1);

  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World'
        }
      }
    });
    let post = env.store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();

    assert.throws(() => {
      snapshot.attr('unknown');
    }, /has no attribute named 'unknown' defined/, 'attr throws error');
  });
});

test("snapshot.attributes() returns a copy of all attributes for the current snapshot", function(assert) {
  assert.expect(1);

  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World'
        }
      }
    });
    let post = env.store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();

    let attributes = snapshot.attributes();

    assert.deepEqual(attributes, { author: undefined, title: 'Hello World' }, 'attributes are returned correctly');
  });
});

test("snapshot.changedAttributes() returns a copy of all changed attributes for the current snapshot", function(assert) {
  assert.expect(1);

  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World'
        }
      }
    });
    let post = env.store.peekRecord('post', 1);
    post.set('title', 'Hello World!');
    let snapshot = post._createSnapshot();

    let changes = snapshot.changedAttributes();

    assert.deepEqual(changes.title, ['Hello World', 'Hello World!'], 'changed attributes are returned correctly');
  });
});

test("snapshot.belongsTo() returns undefined if relationship is undefined", function(assert) {
  assert.expect(1);

  run(() => {
    env.store.push({
      data: {
        type: 'comment',
        id: '1',
        attributes: {
          body: 'This is comment'
        }
      }
    });
    let comment = env.store.peekRecord('comment', 1);
    let snapshot = comment._createSnapshot();
    let relationship = snapshot.belongsTo('post');

    assert.equal(relationship, undefined, 'relationship is undefined');
  });
});

test("snapshot.belongsTo() returns null if relationship is unset", function(assert) {
  assert.expect(1);

  run(() => {
    env.store.push({
      data: [{
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World'
        }
      }, {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'This is comment'
        },
        relationships: {
          post: {
            data: null
          }
        }
      }]
    });
    let comment = env.store.peekRecord('comment', 2);
    let snapshot = comment._createSnapshot();
    let relationship = snapshot.belongsTo('post');

    assert.equal(relationship, null, 'relationship is unset');
  });
});

test("snapshot.belongsTo() returns a snapshot if relationship is set", function(assert) {
  assert.expect(3);

  run(() => {
    env.store.push({
      data: [{
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World'
        }
      }, {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'This is comment'
        },
        relationships: {
          post: {
            data: { type: 'post', id: '1' }
          }
        }
      }]
    });
    let comment = env.store.peekRecord('comment', 2);
    let snapshot = comment._createSnapshot();
    let relationship = snapshot.belongsTo('post');

    assert.ok(relationship instanceof DS.Snapshot, 'snapshot is an instance of DS.Snapshot');
    assert.equal(relationship.id, '1', 'post id is correct');
    assert.equal(relationship.attr('title'), 'Hello World', 'post title is correct');
  });
});

test("snapshot.belongsTo() returns null if relationship is deleted", function(assert) {
  assert.expect(1);

  run(() => {
    env.store.push({
      data: [{
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World'
        }
      }, {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'This is comment'
        },
        relationships: {
          post: {
            data: { type: 'post', id: '1' }
          }
        }
      }]
    });
    let post = env.store.peekRecord('post', 1);
    let comment = env.store.peekRecord('comment', 2);

    post.deleteRecord();

    let snapshot = comment._createSnapshot();
    let relationship = snapshot.belongsTo('post');

    assert.equal(relationship, null, 'relationship unset after deleted');
  });
});

test("snapshot.belongsTo() returns undefined if relationship is a link", function(assert) {
  assert.expect(1);

  run(() => {
    env.store.push({
      data: {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'This is comment'
        },
        relationships: {
          post: {
            links: {
              related: 'post'
            }
          }
        }
      }
    });
    let comment = env.store.peekRecord('comment', 2);
    let snapshot = comment._createSnapshot();
    let relationship = snapshot.belongsTo('post');

    assert.equal(relationship, undefined, 'relationship is undefined');
  });
});

test("snapshot.belongsTo() throws error if relation doesn't exist", function(assert) {
  assert.expect(1);

  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World'
        }
      }
    });
    let post = env.store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();

    assert.throws(() => {
      snapshot.belongsTo('unknown');
    }, /has no belongsTo relationship named 'unknown'/, 'throws error');
  });
});

test("snapshot.belongsTo() returns a snapshot if relationship link has been fetched", function(assert) {
  assert.expect(2);

  env.adapter.findBelongsTo = function(store, snapshot, link, relationship) {
    return Ember.RSVP.resolve({ data: { id: 1, type: 'post', attributes: { title: 'Hello World' } } });
  };

  return run(() => {
    env.store.push({
      data: {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'This is comment'
        },
        relationships: {
          post: {
            links: {
              related: 'post'
            }
          }
        }
      }
    });
    let comment = env.store.peekRecord('comment', 2);

    return comment.get('post').then(post => {
      let snapshot = comment._createSnapshot();
      let relationship = snapshot.belongsTo('post');

      assert.ok(relationship instanceof DS.Snapshot, 'snapshot is an instance of DS.Snapshot');
      assert.equal(relationship.id, '1', 'post id is correct');
    });
  });
});

test("snapshot.belongsTo() and snapshot.hasMany() returns correctly when adding an object to a hasMany relationship", function(assert) {
  assert.expect(4);

  return run(() => {
    env.store.push({
      data: [{
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World'
        }
      }, {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'This is comment'
        }
      }]
    });
    let post = env.store.peekRecord('post', 1);
    let comment = env.store.peekRecord('comment', 2);

    return post.get('comments').then(comments => {
      comments.addObject(comment);

      let postSnapshot = post._createSnapshot();
      let commentSnapshot = comment._createSnapshot();

      let hasManyRelationship = postSnapshot.hasMany('comments');
      let belongsToRelationship = commentSnapshot.belongsTo('post');

      assert.ok(hasManyRelationship instanceof Array, 'hasMany relationship is an instance of Array');
      assert.equal(hasManyRelationship.length, 1, 'hasMany relationship contains related object');

      assert.ok(belongsToRelationship instanceof DS.Snapshot, 'belongsTo relationship is an instance of DS.Snapshot');
      assert.equal(belongsToRelationship.attr('title'), 'Hello World', 'belongsTo relationship contains related object');
    });
  });
});

test("snapshot.belongsTo() and snapshot.hasMany() returns correctly when setting an object to a belongsTo relationship", function(assert) {
  assert.expect(4);

  run(() => {
    env.store.push({
      data: [{
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World'
        }
      }, {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'This is comment'
        }
      }]
    });
    let post = env.store.peekRecord('post', 1);
    let comment = env.store.peekRecord('comment', 2);

    comment.set('post', post);

    let postSnapshot = post._createSnapshot();
    let commentSnapshot = comment._createSnapshot();

    let hasManyRelationship = postSnapshot.hasMany('comments');
    let belongsToRelationship = commentSnapshot.belongsTo('post');

    assert.ok(hasManyRelationship instanceof Array, 'hasMany relationship is an instance of Array');
    assert.equal(hasManyRelationship.length, 1, 'hasMany relationship contains related object');

    assert.ok(belongsToRelationship instanceof DS.Snapshot, 'belongsTo relationship is an instance of DS.Snapshot');
    assert.equal(belongsToRelationship.attr('title'), 'Hello World', 'belongsTo relationship contains related object');
  });
});

test("snapshot.belongsTo() returns ID if option.id is set", function(assert) {
  assert.expect(1);

  run(() => {
    env.store.push({
      data: [{
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World'
        }
      }, {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'This is comment'
        },
        relationships: {
          post: {
            data: { type: 'post', id: '1' }
          }
        }
      }]
    });
    let comment = env.store.peekRecord('comment', 2);
    let snapshot = comment._createSnapshot();
    let relationship = snapshot.belongsTo('post', { id: true });

    assert.equal(relationship, '1', 'relationship ID correctly returned');
  });
});

test("snapshot.belongsTo() returns null if option.id is set but relationship was deleted", function(assert) {
  assert.expect(1);

  run(() => {
    env.store.push({
      data: [{
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World'
        }
      }, {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'This is comment'
        },
        relationships: {
          post: {
            data: { type: 'post', id: '1' }
          }
        }
      }]
    });
    let post = env.store.peekRecord('post', 1);
    let comment = env.store.peekRecord('comment', 2);

    post.deleteRecord();

    let snapshot = comment._createSnapshot();
    let relationship = snapshot.belongsTo('post', { id: true });

    assert.equal(relationship, null, 'relationship unset after deleted');
  });
});

test("snapshot.hasMany() returns undefined if relationship is undefined", function(assert) {
  assert.expect(1);

  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World'
        }
      }
    });
    let post = env.store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();
    let relationship = snapshot.hasMany('comments');

    assert.equal(relationship, undefined, 'relationship is undefined');
  });
});

test("snapshot.hasMany() returns empty array if relationship is empty", function(assert) {
  assert.expect(2);

  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World'
        },
        relationships: {
          comments: {
            data: []
          }
        }
      }
    });
    let post = env.store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();
    let relationship = snapshot.hasMany('comments');

    assert.ok(relationship instanceof Array, 'relationship is an instance of Array');
    assert.equal(relationship.length, 0, 'relationship is empty');
  });
});

test("snapshot.hasMany() returns array of snapshots if relationship is set", function(assert) {
  assert.expect(5);

  run(() => {
    env.store.push({
      data: [{
        type: 'comment',
        id: '1',
        attributes: {
          body: 'This is the first comment'
        }
      }, {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'This is the second comment'
        }
      }, {
        type: 'post',
        id: '3',
        attributes: {
          title: 'Hello World'
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' }
            ]
          }
        }
      }]
    });
    let post = env.store.peekRecord('post', 3);
    let snapshot = post._createSnapshot();
    let relationship = snapshot.hasMany('comments');

    assert.ok(relationship instanceof Array, 'relationship is an instance of Array');
    assert.equal(relationship.length, 2, 'relationship has two items');

    let relationship1 = relationship[0];

    assert.ok(relationship1 instanceof DS.Snapshot, 'relationship item is an instance of DS.Snapshot');

    assert.equal(relationship1.id, '1', 'relationship item id is correct');
    assert.equal(relationship1.attr('body'), 'This is the first comment', 'relationship item body is correct');
  });
});

test("snapshot.hasMany() returns empty array if relationship records are deleted", function(assert) {
  assert.expect(2);

  run(() => {
    env.store.push({
      data: [{
        type: 'comment',
        id: '1',
        attributes: {
          body: 'This is the first comment'
        }
      }, {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'This is the second comment'
        }
      }, {
        type: 'post',
        id: '3',
        attributes: {
          title: 'Hello World'
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' }
            ]
          }
        }
      }]
    });
    let comment1 = env.store.peekRecord('comment', 1);
    let comment2 = env.store.peekRecord('comment', 2);
    let post = env.store.peekRecord('post', 3);

    comment1.deleteRecord();
    comment2.deleteRecord();

    let snapshot = post._createSnapshot();
    let relationship = snapshot.hasMany('comments');

    assert.ok(relationship instanceof Array, 'relationship is an instance of Array');
    assert.equal(relationship.length, 0, 'relationship is empty');
  });
});

test("snapshot.hasMany() returns array of IDs if option.ids is set", function(assert) {
  assert.expect(1);

  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World'
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' }
            ]
          }
        }
      }
    });
    let post = env.store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();
    let relationship = snapshot.hasMany('comments', { ids: true });

    assert.deepEqual(relationship, ['2', '3'], 'relationship IDs correctly returned');
  });
});

test("snapshot.hasMany() returns empty array of IDs if option.ids is set but relationship records were deleted", function(assert) {
  assert.expect(2);

  run(() => {
    env.store.push({
      data: [{
        type: 'comment',
        id: '1',
        attributes: {
          body: 'This is the first comment'
        }
      }, {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'This is the second comment'
        }
      }, {
        type: 'post',
        id: '3',
        attributes: {
          title: 'Hello World'
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' }
            ]
          }
        }
      }]
    });
    let comment1 = env.store.peekRecord('comment', 1);
    let comment2 = env.store.peekRecord('comment', 2);
    let post = env.store.peekRecord('post', 3);

    comment1.deleteRecord();
    comment2.deleteRecord();

    let snapshot = post._createSnapshot();
    let relationship = snapshot.hasMany('comments', { ids: true });

    assert.ok(relationship instanceof Array, 'relationship is an instance of Array');
    assert.equal(relationship.length, 0, 'relationship is empty');
  });
});

test("snapshot.hasMany() returns undefined if relationship is a link", function(assert) {
  assert.expect(1);

  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World'
        },
        relationships: {
          comments: {
            links: {
              related: 'comments'
            }
          }
        }
      }
    });
    let post = env.store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();
    let relationship = snapshot.hasMany('comments');

    assert.equal(relationship, undefined, 'relationship is undefined');
  });
});

test("snapshot.hasMany() returns array of snapshots if relationship link has been fetched", function(assert) {
  assert.expect(2);

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    return Ember.RSVP.resolve({ data: [{ id: 2, type: 'comment', attributes: { body: 'This is comment' } }]});
  };

  return run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World'
        },
        relationships: {
          comments: {
            links: {
              related: 'comments'
            }
          }
        }
      }
    });

    let post = env.store.peekRecord('post', 1);

    return post.get('comments').then(comments => {
      let snapshot = post._createSnapshot();
      let relationship = snapshot.hasMany('comments');

      assert.ok(relationship instanceof Array, 'relationship is an instance of Array');
      assert.equal(relationship.length, 1, 'relationship has one item');
    });
  });
});

test("snapshot.hasMany() throws error if relation doesn't exist", function(assert) {
  assert.expect(1);

  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World'
        }
      }
    });
    let post = env.store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();

    assert.throws(() => {
      snapshot.hasMany('unknown');
    }, /has no hasMany relationship named 'unknown'/, 'throws error');
  });
});

test("snapshot.hasMany() respects the order of items in the relationship", function(assert) {
  assert.expect(3);

  run(() => {
    env.store.push({
      data: [{
        type: 'comment',
        id: '1',
        attributes: {
          body: 'This is the first comment'
        }
      }, {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'This is the second comment'
        }
      }, {
        type: 'comment',
        id: '3',
        attributes: {
          body: 'This is the third comment'
        }
      }, {
        type: 'post',
        id: '4',
        attributes: {
          title: 'Hello World'
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' }
            ]
          }
        }
      }]
    });
    let comment3 = env.store.peekRecord('comment', 3);
    let post = env.store.peekRecord('post', 4);

    post.get('comments').removeObject(comment3);
    post.get('comments').insertAt(0, comment3);

    let snapshot = post._createSnapshot();
    let relationship = snapshot.hasMany('comments');

    assert.equal(relationship[0].id, '3', 'order of comment 3 is correct');
    assert.equal(relationship[1].id, '1', 'order of comment 1 is correct');
    assert.equal(relationship[2].id, '2', 'order of comment 2 is correct');
  });
});

test("snapshot.eachAttribute() proxies to record", function(assert) {
  assert.expect(1);

  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World'
        }
      }
    });
    let post = env.store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();

    let attributes = [];
    snapshot.eachAttribute(name => attributes.push(name));
    assert.deepEqual(attributes, ['author', 'title'], 'attributes are iterated correctly');
  });
});

test("snapshot.eachRelationship() proxies to record", function(assert) {
  assert.expect(2);

  let getRelationships = function(snapshot) {
    let relationships = [];
    snapshot.eachRelationship(name => relationships.push(name));
    return relationships;
  };

  run(() => {
    env.store.push({
      data: [{
        type: 'comment',
        id: '1',
        attributes: {
          body: 'This is the first comment'
        }
      }, {
        type: 'post',
        id: '2',
        attributes: {
          title: 'Hello World'
        }
      }]
    });
    let comment = env.store.peekRecord('comment', 1);
    let post = env.store.peekRecord('post', 2);
    let snapshot;

    snapshot = comment._createSnapshot();
    assert.deepEqual(getRelationships(snapshot), ['post'], 'relationships are iterated correctly');

    snapshot = post._createSnapshot();
    assert.deepEqual(getRelationships(snapshot), ['comments'], 'relationships are iterated correctly');
  });
});

test("snapshot.belongsTo() does not trigger a call to store._scheduleFetch", function(assert) {
  assert.expect(0);

  env.store._scheduleFetch = function() {
    assert.ok(false, 'store._scheduleFetch should not be called');
  };

  run(() => {
    env.store.push({
      data: {
        type: 'comment',
        id: '1',
        attributes: {
          body: 'This is the first comment'
        },
        relationships: {
          post: {
            data: { type: 'post', id: '2' }
          }
        }
      }
    });
    let comment = env.store.peekRecord('comment', 1);
    let snapshot = comment._createSnapshot();

    snapshot.belongsTo('post');
  });
});

test("snapshot.hasMany() does not trigger a call to store._scheduleFetch", function(assert) {
  assert.expect(0);

  env.store._scheduleFetch = function() {
    assert.ok(false, 'store._scheduleFetch should not be called');
  };

  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World'
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' }
            ]
          }
        }
      }
    });
    let post = env.store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();

    snapshot.hasMany('comments');
  });
});

test("snapshot.serialize() serializes itself", function(assert) {
  assert.expect(2);

  run(() => {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        attributes: {
          title: 'Hello World'
        }
      }
    });
    let post = env.store.peekRecord('post', 1);
    let snapshot = post._createSnapshot();

    post.set('title', 'New Title');

    let expected = {
      data: {
        attributes: {
          author: undefined,
          title: 'Hello World'
        },
        type: 'posts'
      }
    };
    assert.deepEqual(snapshot.serialize(), expected, 'shapshot serializes correctly');
    expected.data.id = '1';
    assert.deepEqual(snapshot.serialize({ includeId: true }), expected, 'serialize takes options');
  });
});
