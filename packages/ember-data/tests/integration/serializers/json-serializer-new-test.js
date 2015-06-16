var Post, post, Comment, Favorite, TestSerializer, env;
var run = Ember.run;

module("integration/serializer/json - JSONSerializer (new API)", {
  setup: function() {
    Post = DS.Model.extend({
      title: DS.attr('string'),
      comments: DS.hasMany('comment', { inverse: null, async: false })
    });
    Comment = DS.Model.extend({
      body: DS.attr('string'),
      post: DS.belongsTo('post', { async: false })
    });
    Favorite = DS.Model.extend({
      post: DS.belongsTo('post', { async: true, polymorphic: true })
    });
    TestSerializer = DS.JSONSerializer.extend({
      isNewSerializerAPI: true
    });
    env = setupStore({
      post:     Post,
      comment:  Comment,
      favorite: Favorite
    });
    env.store.modelFor('post');
    env.store.modelFor('comment');
    env.store.modelFor('favorite');

    env.registry.register('serializer:application', TestSerializer);
  },

  teardown: function() {
    run(env.store, 'destroy');
  }
});

test("normalizeArrayResponse normalizes each record in the array", function() {
  var postNormalizeCount = 0;
  var posts = [
    { id: "1", title: "Rails is omakase" },
    { id: "2", title: "Another Post" }
  ];

  env.registry.register('serializer:post', TestSerializer.extend({
    normalize: function () {
      postNormalizeCount++;
      return this._super.apply(this, arguments);
    }
  }));

  run(function() {
    env.container.lookup("serializer:post").normalizeArrayResponse(env.store, Post, posts, null, 'findAll');
  });
  equal(postNormalizeCount, 2, "two posts are normalized");
});

test('Serializer should respect the attrs hash when extracting records', function() {
  env.registry.register("serializer:post", TestSerializer.extend({
    attrs: {
      title: "title_payload_key",
      comments: { key: 'my_comments' }
    }
  }));

  var jsonHash = {
    id: "1",
    title_payload_key: "Rails is omakase",
    my_comments: [1, 2]
  };

  var post = env.container.lookup("serializer:post").normalizeSingleResponse(env.store, Post, jsonHash, '1', 'find');

  equal(post.data.attributes.title, "Rails is omakase");
  deepEqual(post.data.relationships.comments.data, [{ id: "1", type: "comment" }, { id: "2", type: "comment" }]);
});

test('normalizeSingleResponse should extract meta using extractMeta', function() {
  env.registry.register("serializer:post", TestSerializer.extend({
    extractMeta: function(store, modelClass, payload) {
      let meta = this._super(...arguments);
      meta.authors.push('Tomhuda');
      return meta;
    }
  }));

  var jsonHash = {
    id: "1",
    title_payload_key: "Rails is omakase",
    my_comments: [1, 2],
    meta: {
      authors: ['Tomster']
    }
  };

  var post = env.container.lookup("serializer:post").normalizeSingleResponse(env.store, Post, jsonHash, '1', 'find');

  deepEqual(post.meta.authors, ['Tomster', 'Tomhuda']);
});

test("Serializer should respect the primaryKey attribute when extracting records", function() {
  env.registry.register('serializer:post', TestSerializer.extend({
    primaryKey: '_ID_'
  }));

  var jsonHash = { "_ID_": 1, title: "Rails is omakase" };

  run(function() {
    post = env.container.lookup("serializer:post").normalizeSingleResponse(env.store, Post, jsonHash, '1', 'find');
  });

  equal(post.data.id, "1");
  equal(post.data.attributes.title, "Rails is omakase");
});

test("Serializer should respect keyForAttribute when extracting records", function() {
  env.registry.register('serializer:post', TestSerializer.extend({
    keyForAttribute: function(key) {
      return key.toUpperCase();
    }
  }));

  var jsonHash = { id: 1, TITLE: 'Rails is omakase' };

  post = env.container.lookup("serializer:post").normalize(Post, jsonHash);

  equal(post.data.id, "1");
  equal(post.data.attributes.title, "Rails is omakase");
});

test("Serializer should respect keyForRelationship when extracting records", function() {
  env.registry.register('serializer:post', TestSerializer.extend({
    keyForRelationship: function(key, type) {
      return key.toUpperCase();
    }
  }));

  var jsonHash = { id: 1, title: 'Rails is omakase', COMMENTS: ['1'] };

  post = env.container.lookup("serializer:post").normalize(Post, jsonHash);

  deepEqual(post.data.relationships.comments.data, [{ id: "1", type: "comment" }]);
});

test("Calling normalize should normalize the payload (only the passed keys)", function () {
  expect(1);
  var Person = DS.Model.extend({
    posts: DS.hasMany('post', { async: false })
  });
  env.registry.register('serializer:post', TestSerializer.extend({
    attrs: {
      notInHash: 'aCustomAttrNotInHash',
      inHash: 'aCustomAttrInHash'
    }
  }));

  env.registry.register('model:person', Person);

  Post.reopen({
    content: DS.attr('string'),
    author: DS.belongsTo('person', { async: false }),
    notInHash: DS.attr('string'),
    inHash: DS.attr('string')
  });

  var normalizedPayload = env.container.lookup("serializer:post").normalize(Post, {
    id: '1',
    title: 'Ember rocks',
    author: 1,
    aCustomAttrInHash: 'blah'
  });

  deepEqual(normalizedPayload, {
    "data": {
      "id": "1",
      "type": "post",
      "attributes": {
        "inHash": "blah",
        "title": "Ember rocks"
      },
      "relationships": {
        "author": {
          "data": { "id": "1", "type": "person" }
        }
      }
    }
  });
});
