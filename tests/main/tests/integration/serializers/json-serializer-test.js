/* eslint no-prototype-builtins: 'off' */
// prototype hasOwnProperty has no security issues here because it is not production code

import { run } from '@ember/runloop';
import { underscore } from '@ember/string';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONSerializer from '@ember-data/serializer/json';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';
import Transform from '@ember-data/serializer/transform';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('integration/serializer/json - JSONSerializer', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('serializer:application', JSONSerializer.extend());
  });

  test("serialize doesn't include ID when includeId is false", function (assert) {
    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: false }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: false }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let post = store.createRecord('post', {
      title: 'Rails is omakase',
      comments: [],
    });
    let json = serializer.serialize(post._createSnapshot(), { includeId: false });

    assert.deepEqual(json, {
      title: 'Rails is omakase',
      comments: [],
    });
  });

  test("serialize doesn't include relationship if not aware of one", function (assert) {
    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: false }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: false }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let post = store.createRecord('post', { title: 'Rails is omakase' });
    let json = serializer.serialize(post._createSnapshot());

    assert.deepEqual(json, {
      title: 'Rails is omakase',
    });
  });

  test('serialize includes id when includeId is true', function (assert) {
    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');

    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: false }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: false }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let post = store.createRecord('post', { title: 'Rails is omakase', comments: [] });

    run(() => {
      post.set('id', 'test');
    });

    let json = serializer.serialize(post._createSnapshot(), { includeId: true });

    assert.deepEqual(json, {
      id: 'test',
      title: 'Rails is omakase',
      comments: [],
    });
  });

  test('serializeAttribute', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: false }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: false }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');
    let post = store.createRecord('post', { title: 'Rails is omakase' });
    let json = {};

    serializer.serializeAttribute(post._createSnapshot(), json, 'title', { type: 'string' });

    assert.deepEqual(json, {
      title: 'Rails is omakase',
    });
  });

  test('serializeAttribute respects keyForAttribute', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: false }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: false }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    this.owner.register(
      'serializer:post',
      JSONSerializer.extend({
        keyForAttribute(key) {
          return key.toUpperCase();
        },
      })
    );

    let store = this.owner.lookup('service:store');
    let post = store.createRecord('post', { title: 'Rails is omakase' });
    let json = {};

    store.serializerFor('post').serializeAttribute(post._createSnapshot(), json, 'title', { type: 'string' });

    assert.deepEqual(json, { TITLE: 'Rails is omakase' });
  });

  test('serializeBelongsTo', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: false }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: false }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');
    let post = store.createRecord('post', { title: 'Rails is omakase', id: '1' });
    let comment = store.createRecord('comment', { body: 'Omakase is delicious', post: post });
    let json = {};

    serializer.serializeBelongsTo(comment._createSnapshot(), json, { key: 'post', options: {} });

    assert.deepEqual(json, { post: '1' });
  });

  test('serializeBelongsTo with null', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: false }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: false }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');
    let comment = store.createRecord('comment', { body: 'Omakase is delicious', post: null });
    let json = {};

    serializer.serializeBelongsTo(comment._createSnapshot(), json, { key: 'post', options: {} });

    assert.deepEqual(
      json,
      {
        post: null,
      },
      'Can set a belongsTo to a null value'
    );
  });

  test('async serializeBelongsTo with null', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: false }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');
    let comment = store.createRecord('comment', { body: 'Omakase is delicious', post: null });
    let json = {};

    serializer.serializeBelongsTo(comment._createSnapshot(), json, { key: 'post', options: {} });

    assert.deepEqual(
      json,
      {
        post: null,
      },
      'Can set a belongsTo to a null value'
    );
  });

  test('serializeBelongsTo respects keyForRelationship', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: false }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    this.owner.register(
      'serializer:post',
      JSONSerializer.extend({
        keyForRelationship(key, type) {
          return key.toUpperCase();
        },
      })
    );

    let store = this.owner.lookup('service:store');
    let post = store.createRecord('post', { title: 'Rails is omakase', id: '1' });
    let comment = store.createRecord('comment', { body: 'Omakase is delicious', post: post });
    let json = {};

    store.serializerFor('post').serializeBelongsTo(comment._createSnapshot(), json, { key: 'post', options: {} });

    assert.deepEqual(json, {
      POST: '1',
    });
  });

  test('serializeHasMany respects keyForRelationship', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: false }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    this.owner.register(
      'serializer:post',
      JSONSerializer.extend({
        keyForRelationship(key, type) {
          return key.toUpperCase();
        },
      })
    );

    let store = this.owner.lookup('service:store');
    let post = store.createRecord('post', { title: 'Rails is omakase', id: '1' });
    let comment = store.createRecord('comment', {
      body: 'Omakase is delicious',
      post: post,
      id: '1',
    });

    run(function () {
      post.comments.push(comment);
    });

    let json = {};

    store.serializerFor('post').serializeHasMany(post._createSnapshot(), json, { key: 'comments', options: {} });

    assert.deepEqual(json, {
      COMMENTS: ['1'],
    });
  });

  test('serializeHasMany omits unknown relationships on pushed record', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: false }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');

    let post = run(() =>
      store.push({
        data: {
          id: '1',
          type: 'post',
          attributes: {
            title: 'Rails is omakase',
          },
        },
      })
    );
    let json = {};

    store.serializerFor('post').serializeHasMany(post._createSnapshot(), json, { key: 'comments', options: {} });

    assert.notOk(json.hasOwnProperty('comments'), 'Does not add the relationship key to json');
  });

  test('shouldSerializeHasMany', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: false }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let post = store.createRecord('post', { title: 'Rails is omakase', id: '1' });
    store.createRecord('comment', { body: 'Omakase is delicious', post: post, id: '1' });

    var snapshot = post._createSnapshot();
    var relationship = snapshot.record.relationshipFor('comments');
    var key = relationship.key;

    var shouldSerialize = store.serializerFor('post').shouldSerializeHasMany(snapshot, key, relationship);

    assert.ok(shouldSerialize, 'shouldSerializeHasMany correctly identifies with hasMany relationship');
  });

  test('serializeIntoHash', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: false }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('application');
    let post = store.createRecord('post', { title: 'Rails is omakase', comments: [] });
    let json = {};

    serializer.serializeIntoHash(json, store.modelFor('post'), post._createSnapshot());

    assert.deepEqual(json, {
      title: 'Rails is omakase',
      comments: [],
    });
  });

  test('serializePolymorphicType sync', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: false }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    assert.expect(1);

    this.owner.register(
      'serializer:comment',
      JSONSerializer.extend({
        serializePolymorphicType(record, json, relationship) {
          let key = relationship.key;
          let belongsTo = record.belongsTo(key);
          json[relationship.key + 'TYPE'] = belongsTo.modelName;

          assert.ok(true, 'serializePolymorphicType is called when serialize a polymorphic belongsTo');
        },
      })
    );

    let store = this.owner.lookup('service:store');
    let post = store.createRecord('post', { title: 'Rails is omakase', id: '1' });
    let comment = store.createRecord('comment', { body: 'Omakase is delicious', post: post });

    store
      .serializerFor('comment')
      .serializeBelongsTo(comment._createSnapshot(), {}, { key: 'post', options: { polymorphic: true } });
  });

  test('serializePolymorphicType async', function (assert) {
    assert.expect(1);
    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: false }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    this.owner.register(
      'serializer:comment',
      JSONSerializer.extend({
        serializePolymorphicType(record, json, relationship) {
          assert.ok(true, 'serializePolymorphicType is called when serialize a polymorphic belongsTo');
        },
      })
    );

    let store = this.owner.lookup('service:store');
    let post = store.createRecord('post', { title: 'Rails is omakase', id: '1' });
    let comment = store.createRecord('comment', { body: 'Omakase is delicious', post: post });

    store
      .serializerFor('comment')
      .serializeBelongsTo(comment._createSnapshot(), {}, { key: 'post', options: { async: true, polymorphic: true } });
  });

  test('normalizeResponse normalizes each record in the array', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: false }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    var postNormalizeCount = 0;
    var posts = [
      { id: '1', title: 'Rails is omakase' },
      { id: '2', title: 'Another Post' },
    ];

    this.owner.register(
      'serializer:post',
      JSONSerializer.extend({
        normalize() {
          postNormalizeCount++;
          return this._super.apply(this, arguments);
        },
      })
    );

    let store = this.owner.lookup('service:store');

    run(function () {
      store.serializerFor('post').normalizeResponse(store, store.modelFor('post'), posts, null, 'findAll');
    });

    assert.strictEqual(postNormalizeCount, 2, 'two posts are normalized');
  });

  test('Serializer should respect the attrs hash when extracting records', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: false }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    this.owner.register(
      'serializer:post',
      JSONSerializer.extend({
        attrs: {
          title: 'title_payload_key',
          comments: { key: 'my_comments' },
        },
      })
    );

    var jsonHash = {
      id: '1',
      title_payload_key: 'Rails is omakase',
      my_comments: [1, 2],
    };

    let store = this.owner.lookup('service:store');
    var post = store
      .serializerFor('post')
      .normalizeResponse(store, store.modelFor('post'), jsonHash, '1', 'findRecord');

    assert.strictEqual(post.data.attributes.title, 'Rails is omakase');
    assert.deepEqual(post.data.relationships.comments.data, [
      { id: '1', type: 'comment' },
      { id: '2', type: 'comment' },
    ]);
  });

  test('Serializer should map `attrs` attributes directly when keyForAttribute also has a transform', function (assert) {
    const Post = Model.extend({
      authorName: attr('string'),
    });

    this.owner.register('model:post', Post);

    this.owner.register(
      'serializer:post',
      JSONSerializer.extend({
        keyForAttribute: underscore,
        attrs: {
          authorName: 'author_name_key',
        },
      })
    );

    var jsonHash = {
      id: '1',
      author_name_key: 'DHH',
    };

    let store = this.owner.lookup('service:store');

    var post = store
      .serializerFor('post')
      .normalizeResponse(store, store.modelFor('post'), jsonHash, '1', 'findRecord');

    assert.strictEqual(post.data.attributes.authorName, 'DHH');
  });

  test('Serializer should respect the attrs hash when serializing records', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: true }) comments;
      @belongsTo('post', { inverse: null, async: true }) parentPost;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    this.owner.register(
      'serializer:post',
      JSONSerializer.extend({
        attrs: {
          title: 'title_payload_key',
          parentPost: { key: 'my_parent' },
        },
      })
    );

    let store = this.owner.lookup('service:store');

    let parentPost = run(() =>
      store.push({
        data: {
          type: 'post',
          id: '2',
          attributes: {
            title: 'Rails is omakase',
          },
        },
      })
    );
    let post = store.createRecord('post', {
      title: 'Rails is omakase',
      parentPost: parentPost,
    });
    let payload = store.serializerFor('post').serialize(post._createSnapshot());

    assert.strictEqual(payload.title_payload_key, 'Rails is omakase');
    assert.strictEqual(payload.my_parent, '2');
  });

  test('Serializer respects if embedded model has an attribute named "type" - #3726', function (assert) {
    this.owner.register('serializer:child', JSONSerializer);
    this.owner.register(
      'serializer:parent',
      JSONSerializer.extend(EmbeddedRecordsMixin, {
        attrs: {
          child: { embedded: 'always' },
        },
      })
    );
    this.owner.register(
      'model:parent',
      Model.extend({
        child: belongsTo('child', { async: true, inverse: null }),
      })
    );
    this.owner.register(
      'model:child',
      Model.extend({
        type: attr(),
      })
    );

    var jsonHash = {
      id: '1',
      child: {
        id: '1',
        type: 'first_type',
      },
    };

    let store = this.owner.lookup('service:store');
    var Parent = store.modelFor('parent');
    var payload = store.serializerFor('parent').normalizeResponse(store, Parent, jsonHash, '1', 'findRecord');
    assert.deepEqual(payload.included, [
      {
        id: '1',
        type: 'child',
        attributes: {
          type: 'first_type',
        },
        relationships: {},
      },
    ]);
  });

  test('Serializer respects if embedded model has a relationship named "type" - #3726', function (assert) {
    this.owner.register('serializer:child', JSONSerializer);
    this.owner.register(
      'serializer:parent',
      JSONSerializer.extend(EmbeddedRecordsMixin, {
        attrs: {
          child: { embedded: 'always' },
        },
      })
    );
    this.owner.register(
      'model:parent',
      Model.extend({
        child: belongsTo('child', { async: true, inverse: null }),
      })
    );
    this.owner.register(
      'model:child',
      Model.extend({
        type: belongsTo('le-type', { async: true, inverse: null }),
      })
    );
    this.owner.register('model:le-type', Model.extend());

    var jsonHash = {
      id: '1',
      child: {
        id: '1',
        type: 'my_type_id',
      },
    };

    let store = this.owner.lookup('service:store');
    var Parent = store.modelFor('parent');
    var payload = store.serializerFor('parent').normalizeResponse(store, Parent, jsonHash, '1', 'findRecord');
    assert.deepEqual(payload.included, [
      {
        id: '1',
        type: 'child',
        attributes: {},
        relationships: {
          type: {
            data: {
              id: 'my_type_id',
              type: 'le-type',
            },
          },
        },
      },
    ]);
  });

  test('Serializer respects `serialize: false` on the attrs hash', function (assert) {
    assert.expect(2);
    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    this.owner.register(
      'serializer:post',
      JSONSerializer.extend({
        attrs: {
          title: { serialize: false },
        },
      })
    );

    let store = this.owner.lookup('service:store');
    let post = store.createRecord('post', { title: 'Rails is omakase' });
    let payload = store.serializerFor('post').serialize(post._createSnapshot());

    assert.notOk(payload.hasOwnProperty('title'), 'Does not add the key to instance');
    assert.notOk(payload.hasOwnProperty('[object Object]'), 'Does not add some random key like [object Object]');
  });

  test('Serializer respects `serialize: false` on the attrs hash for a `hasMany` property', function (assert) {
    assert.expect(1);
    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    this.owner.register(
      'serializer:post',
      JSONSerializer.extend({
        attrs: {
          comments: { serialize: false },
        },
      })
    );

    let store = this.owner.lookup('service:store');
    let post = store.createRecord('post', { title: 'Rails is omakase' });
    store.createRecord('comment', { body: 'Omakase is delicious', post: post });

    var serializer = store.serializerFor('post');
    var serializedProperty = serializer.keyForRelationship('comments', 'hasMany');

    var payload = serializer.serialize(post._createSnapshot());
    assert.notOk(payload.hasOwnProperty(serializedProperty), 'Does not add the key to instance');
  });

  test('Serializer respects `serialize: false` on the attrs hash for a `belongsTo` property', function (assert) {
    assert.expect(1);
    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    this.owner.register(
      'serializer:comment',
      JSONSerializer.extend({
        attrs: {
          post: { serialize: false },
        },
      })
    );

    let store = this.owner.lookup('service:store');
    let post = store.createRecord('post', { title: 'Rails is omakase' });
    let comment = store.createRecord('comment', { body: 'Omakase is delicious', post: post });

    var serializer = store.serializerFor('comment');
    var serializedProperty = serializer.keyForRelationship('post', 'belongsTo');

    var payload = serializer.serialize(comment._createSnapshot());
    assert.notOk(payload.hasOwnProperty(serializedProperty), 'Does not add the key to instance');
  });

  test('Serializer respects `serialize: false` on the attrs hash for a `hasMany` property', function (assert) {
    assert.expect(1);
    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    this.owner.register(
      'serializer:post',
      JSONSerializer.extend({
        attrs: {
          comments: { serialize: false },
        },
      })
    );

    let store = this.owner.lookup('service:store');
    let post = store.createRecord('post', { title: 'Rails is omakase' });
    store.createRecord('comment', { body: 'Omakase is delicious', post: post });

    var serializer = store.serializerFor('post');
    var serializedProperty = serializer.keyForRelationship('comments', 'hasMany');

    var payload = serializer.serialize(post._createSnapshot());
    assert.notOk(payload.hasOwnProperty(serializedProperty), 'Does not add the key to instance');
  });

  test('Serializer respects `serialize: false` on the attrs hash for a `belongsTo` property', function (assert) {
    assert.expect(1);
    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    this.owner.register(
      'serializer:comment',
      JSONSerializer.extend({
        attrs: {
          post: { serialize: false },
        },
      })
    );

    let store = this.owner.lookup('service:store');
    let post = store.createRecord('post', { title: 'Rails is omakase' });
    let comment = store.createRecord('comment', { body: 'Omakase is delicious', post: post });

    var serializer = store.serializerFor('comment');
    var serializedProperty = serializer.keyForRelationship('post', 'belongsTo');

    var payload = serializer.serialize(comment._createSnapshot());
    assert.notOk(payload.hasOwnProperty(serializedProperty), 'Does not add the key to instance');
  });

  test('Serializer respects `serialize: true` on the attrs hash for a `hasMany` property', async function (assert) {
    assert.expect(1);
    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    this.owner.register(
      'serializer:post',
      JSONSerializer.extend({
        attrs: {
          comments: { serialize: true },
        },
      })
    );

    let store = this.owner.lookup('service:store');
    let post = store.createRecord('post', { title: 'Rails is omakase' });
    let comment = store.createRecord('comment', { body: 'Omakase is delicious', post: post });

    const comments = await post.comments;
    comments.push(comment);

    const serializer = store.serializerFor('post');
    const serializedProperty = serializer.keyForRelationship('comments', 'hasMany');
    const payload = serializer.serialize(post._createSnapshot());

    assert.ok(payload.hasOwnProperty(serializedProperty), 'Add the key to instance');
  });

  test('Serializer respects `serialize: true` on the attrs hash for a `belongsTo` property', function (assert) {
    assert.expect(1);
    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    this.owner.register(
      'serializer:comment',
      JSONSerializer.extend({
        attrs: {
          post: { serialize: true },
        },
      })
    );

    let store = this.owner.lookup('service:store');
    let post = store.createRecord('post', { title: 'Rails is omakase' });
    let comment = store.createRecord('comment', { body: 'Omakase is delicious', post: post });

    var serializer = store.serializerFor('comment');
    var serializedProperty = serializer.keyForRelationship('post', 'belongsTo');

    var payload = serializer.serialize(comment._createSnapshot());
    assert.ok(payload.hasOwnProperty(serializedProperty), 'Add the key to instance');
  });

  test('Serializer should merge attrs from superclasses', function (assert) {
    assert.expect(4);
    class Post extends Model {
      @attr('string') title;
      @attr('string') description;
      @attr('string') anotherString;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    var BaseSerializer = JSONSerializer.extend({
      attrs: {
        title: 'title_payload_key',
        anotherString: 'base_another_string_key',
      },
    });
    this.owner.register(
      'serializer:post',
      BaseSerializer.extend({
        attrs: {
          description: 'description_payload_key',
          anotherString: 'overwritten_another_string_key',
        },
      })
    );

    let store = this.owner.lookup('service:store');
    let post = store.createRecord('post', {
      title: 'Rails is omakase',
      description: 'Omakase is delicious',
      anotherString: 'yet another string',
    });
    let payload = store.serializerFor('post').serialize(post._createSnapshot());

    assert.strictEqual(payload.title_payload_key, 'Rails is omakase');
    assert.strictEqual(payload.description_payload_key, 'Omakase is delicious');
    assert.strictEqual(payload.overwritten_another_string_key, 'yet another string');
    assert.notOk(payload.base_another_string_key, 'overwritten key is not added');
  });

  test('Serializer should respect the primaryKey attribute when extracting records', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @attr('string') description;
      @attr('string') anotherString;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);

    this.owner.register(
      'serializer:post',
      JSONSerializer.extend({
        primaryKey: '_ID_',
      })
    );

    let jsonHash = { _ID_: 1, title: 'Rails is omakase' };
    let store = this.owner.lookup('service:store');
    let post = store
      .serializerFor('post')
      .normalizeResponse(store, store.modelFor('post'), jsonHash, '1', 'findRecord');

    assert.strictEqual(post.data.id, '1');
    assert.strictEqual(post.data.attributes.title, 'Rails is omakase');
  });

  test('Serializer should respect the primaryKey attribute when serializing records', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @attr('string') description;
      @attr('string') anotherString;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register(
      'serializer:post',
      JSONSerializer.extend({
        primaryKey: '_ID_',
      })
    );

    let store = this.owner.lookup('service:store');
    let post = store.createRecord('post', { id: '1', title: 'Rails is omakase' });
    let payload = store.serializerFor('post').serialize(post._createSnapshot(), { includeId: true });

    assert.strictEqual(payload._ID_, '1');
  });

  test('Serializer should respect keyForAttribute when extracting records', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @attr('string') description;
      @attr('string') anotherString;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register(
      'serializer:post',
      JSONSerializer.extend({
        keyForAttribute(key) {
          return key.toUpperCase();
        },
      })
    );

    let jsonHash = { id: '1', TITLE: 'Rails is omakase' };
    let store = this.owner.lookup('service:store');
    let post = store.serializerFor('post').normalize(store.modelFor('post'), jsonHash);

    assert.strictEqual(post.data.id, '1');
    assert.strictEqual(post.data.attributes.title, 'Rails is omakase');
  });

  test('Serializer should respect keyForRelationship when extracting records', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @attr('string') description;
      @attr('string') anotherString;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register(
      'serializer:post',
      JSONSerializer.extend({
        keyForRelationship(key, type) {
          return key.toUpperCase();
        },
      })
    );

    let jsonHash = { id: '1', title: 'Rails is omakase', COMMENTS: ['1'] };
    let store = this.owner.lookup('service:store');
    let post = store.serializerFor('post').normalize(store.modelFor('post'), jsonHash);

    assert.deepEqual(post.data.relationships.comments.data, [{ id: '1', type: 'comment' }]);
  });

  test('Calling normalize should normalize the payload (only the passed keys)', function (assert) {
    assert.expect(1);
    class Post extends Model {
      @attr('string') title;
      @attr('string') description;
      @attr('string') anotherString;
      @attr('string') content;
      @attr('string') inHash;
      @attr('string') notInHash;
      @belongsTo('person', { async: false, inverse: 'posts' }) author;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }
    class Person extends Model {
      @hasMany('post', { async: false, inverse: 'author' }) posts;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('model:person', Person);

    this.owner.register(
      'serializer:post',
      JSONSerializer.extend({
        attrs: {
          notInHash: 'aCustomAttrNotInHash',
          inHash: 'aCustomAttrInHash',
        },
      })
    );

    let store = this.owner.lookup('service:store');

    var normalizedPayload = store.serializerFor('post').normalize(store.modelFor('post'), {
      id: '1',
      title: 'Ember rocks',
      author: 1,
      aCustomAttrInHash: 'blah',
    });

    assert.deepEqual(normalizedPayload, {
      data: {
        id: '1',
        type: 'post',
        attributes: {
          inHash: 'blah',
          title: 'Ember rocks',
        },
        relationships: {
          author: {
            data: { id: '1', type: 'person' },
          },
        },
      },
    });
  });

  test('serializeBelongsTo with async polymorphic', function (assert) {
    var json = {};
    var expected = { post: '1', postTYPE: 'post' };

    class Post extends Model {
      @attr('string') title;
      @hasMany('comment', { inverse: null, async: false }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: false }) post;
    }
    class Favorite extends Model {
      @belongsTo('post', { inverse: null, async: true, polymorphic: true }) post;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('model:favorite', Favorite);

    this.owner.register(
      'serializer:favorite',
      JSONSerializer.extend({
        serializePolymorphicType(snapshot, json, relationship) {
          var key = relationship.key;
          json[key + 'TYPE'] = snapshot.belongsTo(key).modelName;
        },
      })
    );

    let store = this.owner.lookup('service:store');
    let post = store.createRecord('post', { title: 'Kitties are omakase', id: '1' });
    let favorite = store.createRecord('favorite', { post: post, id: '3' });

    store.serializerFor('favorite').serializeBelongsTo(favorite._createSnapshot(), json, {
      key: 'post',
      options: { polymorphic: true, async: true },
    });

    assert.deepEqual(json, expected, 'returned JSON is correct');
  });

  test('extractErrors respects custom key mappings', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @attr('string') description;
      @attr('string') anotherString;
      @attr('string') content;
      @attr('string') inHash;
      @attr('string') notInHash;
      @belongsTo('person', { async: false, inverse: 'posts' }) author;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }
    class Person extends Model {
      @hasMany('post', { async: false, inverse: 'author' }) posts;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('model:person', Person);
    this.owner.register(
      'serializer:post',
      JSONSerializer.extend({
        attrs: {
          title: 'le_title',
          comments: { key: 'my_comments' },
        },
      })
    );

    var payload = {
      errors: [
        {
          source: { pointer: 'data/attributes/le_title' },
          detail: 'title errors',
        },
        {
          source: { pointer: 'data/attributes/my_comments' },
          detail: 'comments errors',
        },
      ],
    };

    let store = this.owner.lookup('service:store');
    var errors = store.serializerFor('post').extractErrors(store, store.modelFor('post'), payload);

    assert.deepEqual(errors, {
      title: ['title errors'],
      comments: ['comments errors'],
    });
  });

  test('extractErrors expects error information located on the errors property of payload', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @attr('string') description;
      @attr('string') anotherString;
      @attr('string') content;
      @attr('string') inHash;
      @attr('string') notInHash;
      @belongsTo('person', { async: false, inverse: 'posts' }) author;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }
    class Person extends Model {
      @hasMany('post', { async: false, inverse: 'author' }) posts;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('model:person', Person);
    this.owner.register('serializer:post', JSONSerializer.extend());

    var payload = {
      attributeWhichWillBeRemovedinExtractErrors: ['true'],
      errors: [
        {
          source: { pointer: 'data/attributes/title' },
          detail: 'title errors',
        },
      ],
    };

    let store = this.owner.lookup('service:store');
    var errors = store.serializerFor('post').extractErrors(store, store.modelFor('post'), payload);

    assert.deepEqual(errors, { title: ['title errors'] });
  });

  test('extractErrors leaves payload untouched if it has no errors property', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @attr('string') description;
      @attr('string') anotherString;
      @attr('string') content;
      @attr('string') inHash;
      @attr('string') notInHash;
      @belongsTo('person', { async: false, inverse: 'posts' }) author;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }
    class Person extends Model {
      @hasMany('post', { async: false, inverse: 'author' }) posts;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('model:person', Person);
    this.owner.register('serializer:post', JSONSerializer.extend());

    var payload = {
      untouchedSinceNoErrorsSiblingPresent: ['true'],
    };

    let store = this.owner.lookup('service:store');
    var errors = store.serializerFor('post').extractErrors(store, store.modelFor('post'), payload);

    assert.deepEqual(errors, { untouchedSinceNoErrorsSiblingPresent: ['true'] });
  });

  test('normalizeResponse should extract meta using extractMeta', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @attr('string') description;
      @attr('string') anotherString;
      @attr('string') content;
      @attr('string') inHash;
      @attr('string') notInHash;
      @belongsTo('person', { async: false, inverse: 'posts' }) author;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }
    class Person extends Model {
      @hasMany('post', { async: false, inverse: 'author' }) posts;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('model:person', Person);
    this.owner.register(
      'serializer:post',
      JSONSerializer.extend({
        extractMeta(store, modelClass, payload) {
          let meta = this._super(...arguments);
          meta.authors.push('Tomhuda');
          return meta;
        },
      })
    );

    var jsonHash = {
      id: '1',
      title_payload_key: 'Rails is omakase',
      my_comments: [1, 2],
      meta: {
        authors: ['Tomster'],
      },
    };

    let store = this.owner.lookup('service:store');
    var post = store
      .serializerFor('post')
      .normalizeResponse(store, store.modelFor('post'), jsonHash, '1', 'findRecord');

    assert.deepEqual(post.meta.authors, ['Tomster', 'Tomhuda']);
  });

  test('normalizeResponse returns empty `included` payload by default', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @attr('string') description;
      @attr('string') anotherString;
      @attr('string') content;
      @attr('string') inHash;
      @attr('string') notInHash;
      @belongsTo('person', { async: false, inverse: 'posts' }) author;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }
    class Person extends Model {
      @hasMany('post', { async: false, inverse: 'author' }) posts;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('model:person', Person);
    this.owner.register('serializer:post', JSONSerializer.extend());

    var jsonHash = {
      id: '1',
      title: 'Rails is omakase',
    };

    let store = this.owner.lookup('service:store');
    var post = store
      .serializerFor('post')
      .normalizeResponse(store, store.modelFor('post'), jsonHash, '1', 'findRecord');

    assert.deepEqual(post.included, []);
  });

  test('normalizeResponse returns empty `included` payload when relationship is undefined', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @attr('string') description;
      @attr('string') anotherString;
      @attr('string') content;
      @attr('string') inHash;
      @attr('string') notInHash;
      @belongsTo('person', { async: false, inverse: 'posts' }) author;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }
    class Person extends Model {
      @hasMany('post', { async: false, inverse: 'author' }) posts;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('model:person', Person);
    this.owner.register('serializer:post', JSONSerializer.extend());

    var jsonHash = {
      id: '1',
      title: 'Rails is omakase',
      comments: null,
    };

    let store = this.owner.lookup('service:store');
    var post = store
      .serializerFor('post')
      .normalizeResponse(store, store.modelFor('post'), jsonHash, '1', 'findRecord');

    assert.deepEqual(post.included, []);
  });

  test('normalizeResponse respects `included` items (single response)', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @attr('string') description;
      @attr('string') anotherString;
      @attr('string') content;
      @attr('string') inHash;
      @attr('string') notInHash;
      @belongsTo('person', { async: false, inverse: 'posts' }) author;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }
    class Person extends Model {
      @hasMany('post', { async: false, inverse: 'author' }) posts;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('model:person', Person);
    this.owner.register('serializer:comment', JSONSerializer);
    this.owner.register(
      'serializer:post',
      JSONSerializer.extend(EmbeddedRecordsMixin, {
        attrs: {
          comments: { embedded: 'always' },
        },
      })
    );

    var jsonHash = {
      id: '1',
      title: 'Rails is omakase',
      comments: [
        { id: '1', body: 'comment 1' },
        { id: '2', body: 'comment 2' },
      ],
    };

    let store = this.owner.lookup('service:store');
    var post = store
      .serializerFor('post')
      .normalizeResponse(store, store.modelFor('post'), jsonHash, '1', 'findRecord');

    assert.deepEqual(post.included, [
      { id: '1', type: 'comment', attributes: { body: 'comment 1' }, relationships: {} },
      { id: '2', type: 'comment', attributes: { body: 'comment 2' }, relationships: {} },
    ]);
  });

  test('normalizeResponse respects `included` items (array response)', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @attr('string') description;
      @attr('string') anotherString;
      @attr('string') content;
      @attr('string') inHash;
      @attr('string') notInHash;
      @belongsTo('person', { async: false, inverse: 'posts' }) author;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }
    class Person extends Model {
      @hasMany('post', { async: false, inverse: 'author' }) posts;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('model:person', Person);
    this.owner.register('serializer:comment', JSONSerializer);
    this.owner.register(
      'serializer:post',
      JSONSerializer.extend(EmbeddedRecordsMixin, {
        attrs: {
          comments: { embedded: 'always' },
        },
      })
    );

    var payload = [
      {
        id: '1',
        title: 'Rails is omakase',
        comments: [{ id: '1', body: 'comment 1' }],
      },
      {
        id: '2',
        title: 'Post 2',
        comments: [
          { id: '2', body: 'comment 2' },
          { id: '3', body: 'comment 3' },
        ],
      },
    ];

    let store = this.owner.lookup('service:store');
    var post = store.serializerFor('post').normalizeResponse(store, store.modelFor('post'), payload, '1', 'findAll');

    assert.deepEqual(post.included, [
      { id: '1', type: 'comment', attributes: { body: 'comment 1' }, relationships: {} },
      { id: '2', type: 'comment', attributes: { body: 'comment 2' }, relationships: {} },
      { id: '3', type: 'comment', attributes: { body: 'comment 3' }, relationships: {} },
    ]);
  });

  testInDebug('normalizeResponse ignores unmapped attributes', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @attr('string') description;
      @attr('string') anotherString;
      @attr('string') content;
      @attr('string') inHash;
      @attr('string') notInHash;
      @belongsTo('person', { async: false, inverse: 'posts' }) author;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }
    class Person extends Model {
      @hasMany('post', { async: false, inverse: 'author' }) posts;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('model:person', Person);
    this.owner.register(
      'serializer:post',
      JSONSerializer.extend({
        attrs: {
          title: { serialize: false },
          notInMapping: { serialize: false },
        },
      })
    );

    var jsonHash = {
      id: '1',
      notInMapping: 'I should be ignored',
      title: 'Rails is omakase',
    };

    let store = this.owner.lookup('service:store');

    assert.expectWarning(function () {
      var post = store
        .serializerFor('post')
        .normalizeResponse(store, store.modelFor('post'), jsonHash, '1', 'findRecord');
      assert.strictEqual(post.data.attributes.title, 'Rails is omakase');
    }, /There is no attribute or relationship with the name/);
  });

  test('options are passed to transform for serialization via createSnapshot', function (assert) {
    assert.expect(1);
    class Post extends Model {
      @attr('string') title;
      @attr('string') description;
      @attr('string') anotherString;
      @attr('string') content;
      @attr('string') inHash;
      @attr('string') notInHash;
      @attr('custom', { custom: 'config' }) custom;
      @belongsTo('person', { async: false, inverse: 'posts' }) author;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }
    class Person extends Model {
      @hasMany('post', { async: false, inverse: 'author' }) posts;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('model:person', Person);

    this.owner.register(
      'transform:custom',
      Transform.extend({
        serialize: function (deserialized, options) {
          assert.deepEqual(options, { custom: 'config' });
        },
      })
    );

    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('post');
    let post = store.createRecord('post', { custom: 'value' });

    serializer.serialize(post._createSnapshot());
  });

  test('options are passed to transform for normalization via serializer.normalize', function (assert) {
    assert.expect(1);
    class Post extends Model {
      @attr('string') title;
      @attr('string') description;
      @attr('string') anotherString;
      @attr('string') content;
      @attr('string') inHash;
      @attr('string') notInHash;
      @attr('custom', { custom: 'config' }) custom;
      @belongsTo('person', { async: false, inverse: 'posts' }) author;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }
    class Person extends Model {
      @hasMany('post', { async: false, inverse: 'author' }) posts;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('model:person', Person);

    this.owner.register(
      'transform:custom',
      Transform.extend({
        deserialize: function (serialized, options) {
          assert.deepEqual(options, { custom: 'config' });
        },
      })
    );

    let store = this.owner.lookup('service:store');
    let serializer = store.serializerFor('post');

    serializer.normalize(store.modelFor('post'), {
      custom: 'value',
    });
  });

  test('Serializer should respect the attrs hash in links', function (assert) {
    class Post extends Model {
      @attr('string') title;
      @attr('string') description;
      @attr('string') anotherString;
      @attr('string') content;
      @attr('string') inHash;
      @attr('string') notInHash;
      @belongsTo('person', { async: false, inverse: 'posts' }) author;
      @hasMany('comment', { inverse: null, async: true }) comments;
    }
    class Comment extends Model {
      @attr('string') body;
      @belongsTo('post', { inverse: null, async: true }) post;
    }
    class Person extends Model {
      @hasMany('post', { async: false, inverse: 'author' }) posts;
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('model:person', Person);

    this.owner.register(
      'serializer:post',
      JSONSerializer.extend({
        attrs: {
          title: 'title_payload_key',
          comments: { key: 'my_comments' },
        },
      })
    );

    var jsonHash = {
      title_payload_key: 'Rails is omakase',
      links: {
        my_comments: 'posts/1/comments',
      },
    };

    let store = this.owner.lookup('service:store');
    var post = this.owner.lookup('serializer:post').normalizeSingleResponse(store, store.modelFor('post'), jsonHash);

    assert.strictEqual(post.data.attributes.title, 'Rails is omakase');
    assert.strictEqual(post.data.relationships.comments.links.related, 'posts/1/comments');
  });
});
