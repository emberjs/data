var Post, post, Comment, comment, Favorite, favorite, env;
var run = Ember.run;

module("integration/serializer/json - JSONSerializer", {
  setup: function() {
    Post = DS.Model.extend({
      title: DS.attr('string'),
      comments: DS.hasMany('comment', { inverse: null })
    });
    Comment = DS.Model.extend({
      body: DS.attr('string'),
      post: DS.belongsTo('post')
    });
    Favorite = DS.Model.extend({
      post: DS.belongsTo('post', { async: true, polymorphic: true })
    });
    env = setupStore({
      post:     Post,
      comment:  Comment,
      favorite: Favorite
    });
    env.store.modelFor('post');
    env.store.modelFor('comment');
    env.store.modelFor('favorite');
  },

  teardown: function() {
    run(env.store, 'destroy');
  }
});

test("serializeAttribute", function() {
  run(function() {
    post = env.store.createRecord("post", { title: "Rails is omakase" });
  });
  var json = {};

  env.serializer.serializeAttribute(post._createSnapshot(), json, "title", { type: "string" });

  deepEqual(json, {
    title: "Rails is omakase"
  });
});

test("serializeAttribute respects keyForAttribute", function() {
  env.registry.register('serializer:post', DS.JSONSerializer.extend({
    keyForAttribute: function(key) {
      return key.toUpperCase();
    }
  }));

  run(function() {
    post = env.store.createRecord("post", { title: "Rails is omakase" });
  });
  var json = {};

  env.container.lookup("serializer:post").serializeAttribute(post._createSnapshot(), json, "title", { type: "string" });

  deepEqual(json, { TITLE: "Rails is omakase" });
});

test("serializeBelongsTo", function() {
  run(function() {
    post = env.store.createRecord(Post, { title: "Rails is omakase", id: "1" });
    comment = env.store.createRecord(Comment, { body: "Omakase is delicious", post: post });
  });

  var json = {};

  env.serializer.serializeBelongsTo(comment._createSnapshot(), json, { key: "post", options: {} });

  deepEqual(json, { post: "1" });
});

test("serializeBelongsTo with null", function() {
  run(function() {
    comment = env.store.createRecord(Comment, { body: "Omakase is delicious", post: null });
  });
  var json = {};

  env.serializer.serializeBelongsTo(comment._createSnapshot(), json, { key: "post", options: {} });

  deepEqual(json, {
    post: null
  }, "Can set a belongsTo to a null value");
});

test("async serializeBelongsTo with null", function() {
  Comment.reopen({
    post: DS.belongsTo('post', { async: true })
  });
  run(function() {
    comment = env.store.createRecord(Comment, { body: "Omakase is delicious", post: null });
  });
  var json = {};

  env.serializer.serializeBelongsTo(comment._createSnapshot(), json, { key: "post", options: {} });

  deepEqual(json, {
    post: null
  }, "Can set a belongsTo to a null value");
});

test("serializeBelongsTo respects keyForRelationship", function() {
  env.registry.register('serializer:post', DS.JSONSerializer.extend({
    keyForRelationship: function(key, type) {
      return key.toUpperCase();
    }
  }));
  run(function() {
    post = env.store.createRecord(Post, { title: "Rails is omakase", id: "1" });
    comment = env.store.createRecord(Comment, { body: "Omakase is delicious", post: post });
  });
  var json = {};

  env.container.lookup("serializer:post").serializeBelongsTo(comment._createSnapshot(), json, { key: "post", options: {} });

  deepEqual(json, {
    POST: "1"
  });
});

test("serializeHasMany respects keyForRelationship", function() {
  env.registry.register('serializer:post', DS.JSONSerializer.extend({
    keyForRelationship: function(key, type) {
      return key.toUpperCase();
    }
  }));

  run(function() {
    post = env.store.createRecord(Post, { title: "Rails is omakase", id: "1" });
    comment = env.store.createRecord(Comment, { body: "Omakase is delicious", post: post, id: "1" });
  });

  var json = {};

  env.container.lookup("serializer:post").serializeHasMany(post._createSnapshot(), json, { key: "comments", options: {} });

  deepEqual(json, {
    COMMENTS: ["1"]
  });
});

test("serializeIntoHash", function() {
  run(function() {
    post = env.store.createRecord("post", { title: "Rails is omakase" });
  });

  var json = {};

  env.serializer.serializeIntoHash(json, Post, post._createSnapshot());

  deepEqual(json, {
    title: "Rails is omakase",
    comments: []
  });
});

test("serializePolymorphicType sync", function() {
  expect(1);

  env.registry.register('serializer:comment', DS.JSONSerializer.extend({
    serializePolymorphicType: function(record, json, relationship) {
      var key = relationship.key;
      var belongsTo = record.belongsTo(key);
      json[relationship.key + "TYPE"] = belongsTo.typeKey;

      ok(true, 'serializePolymorphicType is called when serialize a polymorphic belongsTo');
    }
  }));

  run(function() {
    post = env.store.createRecord('post', { title: 'Rails is omakase', id: 1 });
    comment = env.store.createRecord('comment', { body: 'Omakase is delicious', post: post });
  });

  env.container.lookup('serializer:comment').serializeBelongsTo(comment._createSnapshot(), {}, { key: 'post', options: { polymorphic: true } });
});

test("serializePolymorphicType async", function() {
  expect(1);

  Comment.reopen({
    post: DS.belongsTo('post', { async: true })
  });

  env.registry.register('serializer:comment', DS.JSONSerializer.extend({
    serializePolymorphicType: function(record, json, relationship) {
      ok(true, 'serializePolymorphicType is called when serialize a polymorphic belongsTo');
    }
  }));

  run(function() {
    post = env.store.createRecord(Post, { title: 'Rails is omakase', id: 1 });
    comment = env.store.createRecord(Comment, { body: 'Omakase is delicious', post: post });
  });

  env.container.lookup('serializer:comment').serializeBelongsTo(comment._createSnapshot(), {}, { key: 'post', options: { async: true, polymorphic: true } });
});

test("extractArray normalizes each record in the array", function() {
  var postNormalizeCount = 0;
  var posts = [
    { title: "Rails is omakase" },
    { title: "Another Post" }
  ];

  env.registry.register('serializer:post', DS.JSONSerializer.extend({
    normalize: function () {
      postNormalizeCount++;
      return this._super.apply(this, arguments);
    }
  }));

  run(function() {
    env.container.lookup("serializer:post").extractArray(env.store, Post, posts);
  });
  equal(postNormalizeCount, 2, "two posts are normalized");
});

test('Serializer should respect the attrs hash when extracting records', function() {
  env.registry.register("serializer:post", DS.JSONSerializer.extend({
    attrs: {
      title: "title_payload_key",
      comments: { key: 'my_comments' }
    }
  }));

  var jsonHash = {
    title_payload_key: "Rails is omakase",
    my_comments: [1, 2]
  };

  var post = env.container.lookup("serializer:post").extractSingle(env.store, Post, jsonHash);

  equal(post.title, "Rails is omakase");
  deepEqual(post.comments, [1,2]);
});

test('Serializer should respect the attrs hash when serializing records', function() {
  Post.reopen({
    parentPost: DS.belongsTo('post', { inverse: null })
  });
  env.registry.register("serializer:post", DS.JSONSerializer.extend({
    attrs: {
      title: "title_payload_key",
      parentPost: { key: "my_parent" }
    }
  }));
  var parentPost;

  run(function() {
    parentPost = env.store.push("post", { id: 2, title: "Rails is omakase" });
    post = env.store.createRecord("post", { title: "Rails is omakase", parentPost: parentPost });
  });

  var payload = env.container.lookup("serializer:post").serialize(post._createSnapshot());

  equal(payload.title_payload_key, "Rails is omakase");
  equal(payload.my_parent, '2');
});

test('Serializer respects `serialize: false` on the attrs hash', function() {
  expect(2);
  env.registry.register("serializer:post", DS.JSONSerializer.extend({
    attrs: {
      title: { serialize: false }
    }
  }));

  run(function() {
    post = env.store.createRecord("post", { title: "Rails is omakase" });
  });

  var payload = env.container.lookup("serializer:post").serialize(post._createSnapshot());

  ok(!payload.hasOwnProperty('title'), "Does not add the key to instance");
  ok(!payload.hasOwnProperty('[object Object]'), "Does not add some random key like [object Object]");
});

test('Serializer respects `serialize: false` on the attrs hash for a `hasMany` property', function() {
  expect(1);
  env.registry.register("serializer:post", DS.JSONSerializer.extend({
    attrs: {
      comments: { serialize: false }
    }
  }));

  run(function() {
    post = env.store.createRecord("post", { title: "Rails is omakase" });
    comment = env.store.createRecord(Comment, { body: "Omakase is delicious", post: post });
  });

  var serializer = env.container.lookup("serializer:post");
  var serializedProperty = serializer.keyForRelationship('comments', 'hasMany');

  var payload = serializer.serialize(post._createSnapshot());
  ok(!payload.hasOwnProperty(serializedProperty), "Does not add the key to instance");
});

test('Serializer respects `serialize: false` on the attrs hash for a `belongsTo` property', function() {
  expect(1);
  env.registry.register("serializer:comment", DS.JSONSerializer.extend({
    attrs: {
      post: { serialize: false }
    }
  }));

  run(function() {
    post = env.store.createRecord("post", { title: "Rails is omakase" });
    comment = env.store.createRecord(Comment, { body: "Omakase is delicious", post: post });
  });

  var serializer = env.container.lookup("serializer:comment");
  var serializedProperty = serializer.keyForRelationship('post', 'belongsTo');

  var payload = serializer.serialize(comment._createSnapshot());
  ok(!payload.hasOwnProperty(serializedProperty), "Does not add the key to instance");
});

test("Serializer should respect the primaryKey attribute when extracting records", function() {
  env.registry.register('serializer:post', DS.JSONSerializer.extend({
    primaryKey: '_ID_'
  }));

  var jsonHash = { "_ID_": 1, title: "Rails is omakase" };

  run(function() {
    post = env.container.lookup("serializer:post").extractSingle(env.store, Post, jsonHash);
  });

  equal(post.id, "1");
  equal(post.title, "Rails is omakase");
});

test("Serializer should respect the primaryKey attribute when serializing records", function() {
  env.registry.register('serializer:post', DS.JSONSerializer.extend({
    primaryKey: '_ID_'
  }));

  run(function() {
    post = env.store.createRecord("post", { id: "1", title: "Rails is omakase" });
  });

  var payload = env.container.lookup("serializer:post").serialize(post._createSnapshot(), { includeId: true });

  equal(payload._ID_, "1");
});

test("Serializer should respect keyForAttribute when extracting records", function() {
  env.registry.register('serializer:post', DS.JSONSerializer.extend({
    keyForAttribute: function(key) {
      return key.toUpperCase();
    }
  }));

  var jsonHash = { id: 1, TITLE: 'Rails is omakase' };

  post = env.container.lookup("serializer:post").normalize(Post, jsonHash);

  equal(post.id, "1");
  equal(post.title, "Rails is omakase");
});

test("Serializer should respect keyForRelationship when extracting records", function() {
  env.registry.register('serializer:post', DS.JSONSerializer.extend({
    keyForRelationship: function(key, type) {
      return key.toUpperCase();
    }
  }));

  var jsonHash = { id: 1, title: 'Rails is omakase', COMMENTS: ['1'] };

  post = env.container.lookup("serializer:post").normalize(Post, jsonHash);

  deepEqual(post.comments, ['1']);
});

test("normalizePayload is called during extractSingle", function() {
  env.registry.register('serializer:post', DS.JSONSerializer.extend({
    normalizePayload: function(payload) {
      return payload.response;
    }
  }));

  var jsonHash = {
    response: {
      id: 1,
      title: "Rails is omakase"
    }
  };

  run(function() {
    post = env.container.lookup("serializer:post").extractSingle(env.store, Post, jsonHash);
  });

  equal(post.id, "1");
  equal(post.title, "Rails is omakase");
});

test("Calling normalize should normalize the payload (only the passed keys)", function () {
  expect(1);
  var Person = DS.Model.extend({
    posts: DS.hasMany('post')
  });
  env.registry.register('serializer:post', DS.JSONSerializer.extend({
    attrs: {
      notInHash: 'aCustomAttrNotInHash',
      inHash: 'aCustomAttrInHash'
    }
  }));

  env.registry.register('model:person', Person);

  Post.reopen({
    content: DS.attr('string'),
    author: DS.belongsTo('person'),
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
    id: '1',
    title: 'Ember rocks',
    author: 1,
    inHash: 'blah'
  });
});

test('serializeBelongsTo with async polymorphic', function() {
  var json = {};
  var expected = { post: '1', postTYPE: 'post' };

  env.registry.register('serializer:favorite', DS.JSONSerializer.extend({
    serializePolymorphicType: function(snapshot, json, relationship) {
      var key = relationship.key;
      json[key + 'TYPE'] = snapshot.belongsTo(key).typeKey;
    }
  }));

  run(function() {
    post = env.store.createRecord(Post, { title: 'Kitties are omakase', id: '1' });
    favorite = env.store.createRecord(Favorite, { post: post, id: '3' });
  });

  env.container.lookup('serializer:favorite').serializeBelongsTo(favorite._createSnapshot(), json, { key: 'post', options: { polymorphic: true, async: true } });

  deepEqual(json, expected, 'returned JSON is correct');
});
