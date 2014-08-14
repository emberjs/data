var get = Ember.get, set = Ember.set;
var Post, post, Comment, comment, env;

module("integration/serializer/json - JSONSerializer", {
  setup: function() {
    Post = DS.Model.extend({
      title: DS.attr('string'),
      comments: DS.hasMany('comment', {inverse:null})
    });
    Comment = DS.Model.extend({
      body: DS.attr('string'),
      post: DS.belongsTo('post')
    });
    env = setupStore({
      post:     Post,
      comment:  Comment
    });
    env.store.modelFor('post');
    env.store.modelFor('comment');
  },

  teardown: function() {
    env.store.destroy();
  }
});

test("serializeAttribute", function() {
  post = env.store.createRecord("post", { title: "Rails is omakase"});
  var json = {};

  env.serializer.serializeAttribute(post, json, "title", {type: "string"});

  deepEqual(json, {
    title: "Rails is omakase"
  });
});

test("serializeAttribute respects keyForAttribute", function() {
  env.container.register('serializer:post', DS.JSONSerializer.extend({
    keyForAttribute: function(key) {
      return key.toUpperCase();
    }
  }));

  post = env.store.createRecord("post", { title: "Rails is omakase"});
  var json = {};

  env.container.lookup("serializer:post").serializeAttribute(post, json, "title", {type: "string"});


  deepEqual(json, {
    TITLE: "Rails is omakase"
  });
});

test("serializeBelongsTo", function() {
  post = env.store.createRecord(Post, { title: "Rails is omakase", id: "1"});
  comment = env.store.createRecord(Comment, { body: "Omakase is delicious", post: post});
  var json = {};

  env.serializer.serializeBelongsTo(comment, json, {key: "post", options: {}});

  deepEqual(json, {
    post: "1"
  });
});

test("serializeBelongsTo with null", function() {
  comment = env.store.createRecord(Comment, { body: "Omakase is delicious", post: null});
  var json = {};

  env.serializer.serializeBelongsTo(comment, json, {key: "post", options: {}});

  deepEqual(json, {
    post: null
  }, "Can set a belongsTo to a null value");
});

test("serializeBelongsTo respects keyForRelationship", function() {
  env.container.register('serializer:post', DS.JSONSerializer.extend({
    keyForRelationship: function(key, type) {
      return key.toUpperCase();
    }
  }));
  post = env.store.createRecord(Post, { title: "Rails is omakase", id: "1"});
  comment = env.store.createRecord(Comment, { body: "Omakase is delicious", post: post});
  var json = {};

  env.container.lookup("serializer:post").serializeBelongsTo(comment, json, {key: "post", options: {}});

  deepEqual(json, {
    POST: "1"
  });
});

test("serializeHasMany respects keyForRelationship", function() {
  env.container.register('serializer:post', DS.JSONSerializer.extend({
    keyForRelationship: function(key, type) {
      return key.toUpperCase();
    }
  }));
  post = env.store.createRecord(Post, { title: "Rails is omakase", id: "1"});
  comment = env.store.createRecord(Comment, { body: "Omakase is delicious", post: post, id: "1"});
  var json = {};

  env.container.lookup("serializer:post").serializeHasMany(post, json, {key: "comments", options: {}});

  deepEqual(json, {
    COMMENTS: ["1"]
  });
});

test("serializeIntoHash", function() {
  post = env.store.createRecord("post", { title: "Rails is omakase"});
  var json = {};

  env.serializer.serializeIntoHash(json, Post, post);

  deepEqual(json, {
    title: "Rails is omakase",
    comments: []
  });
});

test("serializePolymorphicType", function() {
  env.container.register('serializer:comment', DS.JSONSerializer.extend({
    serializePolymorphicType: function(record, json, relationship) {
      var key = relationship.key,
          belongsTo = get(record, key);
      json[relationship.key + "TYPE"] = belongsTo.constructor.typeKey;
    }
  }));

  post = env.store.createRecord(Post, { title: "Rails is omakase", id: "1"});
  comment = env.store.createRecord(Comment, { body: "Omakase is delicious", post: post});
  var json = {};

  env.container.lookup("serializer:comment").serializeBelongsTo(comment, json, {key: "post", options: { polymorphic: true}});

  deepEqual(json, {
    post: "1",
    postTYPE: "post"
  });
});

test("extractArray normalizes each record in the array", function() {
  var postNormalizeCount = 0;
  var posts = [
    { title: "Rails is omakase"},
    { title: "Another Post"}
  ];

  env.container.register('serializer:post', DS.JSONSerializer.extend({
    normalize: function () {
      postNormalizeCount++;
      return this._super.apply(this, arguments);
    }
  }));

  env.container.lookup("serializer:post").extractArray(env.store, Post, posts);
  equal(postNormalizeCount, 2, "two posts are normalized");
});

test('Serializer should respect the attrs hash when extracting records', function(){
  env.container.register("serializer:post", DS.JSONSerializer.extend({
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

test('Serializer should respect the attrs hash when serializing records', function(){
  Post.reopen({
    parentPost: DS.belongsTo('post')
  });
  env.container.register("serializer:post", DS.JSONSerializer.extend({
    attrs: {
      title: "title_payload_key",
      parentPost: {key: 'my_parent'}
    }
  }));

  var parentPost = env.store.push("post", { id:2, title: "Rails is omakase"});
  post = env.store.createRecord("post", { title: "Rails is omakase", parentPost: parentPost});

  var payload = env.container.lookup("serializer:post").serialize(post);

  equal(payload.title_payload_key, "Rails is omakase");
  equal(payload.my_parent, '2');
});

test('Serializer respects `serialize: false` on the attrs hash', function(){
  expect(2);
  env.container.register("serializer:post", DS.JSONSerializer.extend({
    attrs: {
      title: {serialize: false}
    }
  }));

  post = env.store.createRecord("post", { title: "Rails is omakase"});

  var payload = env.container.lookup("serializer:post").serialize(post);

  ok(!payload.hasOwnProperty('title'), "Does not add the key to instance");
  ok(!payload.hasOwnProperty('[object Object]'),"Does not add some random key like [object Object]");
});

test('Serializer respects `serialize: false` on the attrs hash for a `hasMany` property', function(){
  expect(1);
  env.container.register("serializer:post", DS.JSONSerializer.extend({
    attrs: {
      comments: {serialize: false}
    }
  }));

  post = env.store.createRecord("post", { title: "Rails is omakase"});
  comment = env.store.createRecord(Comment, { body: "Omakase is delicious", post: post});

  var serializer = env.container.lookup("serializer:post");
  var serializedProperty = serializer.keyForRelationship('comments', 'hasMany');

  var payload = serializer.serialize(post);
  ok(!payload.hasOwnProperty(serializedProperty), "Does not add the key to instance");
});

test('Serializer respects `serialize: false` on the attrs hash for a `belongsTo` property', function(){
  expect(1);
  env.container.register("serializer:comment", DS.JSONSerializer.extend({
    attrs: {
      post: {serialize: false}
    }
  }));

  post = env.store.createRecord("post", { title: "Rails is omakase"});
  comment = env.store.createRecord(Comment, { body: "Omakase is delicious", post: post});

  var serializer = env.container.lookup("serializer:comment");
  var serializedProperty = serializer.keyForRelationship('post', 'belongsTo');

  var payload = serializer.serialize(comment);
  ok(!payload.hasOwnProperty(serializedProperty), "Does not add the key to instance");
});

test("Serializer should respect the primaryKey attribute when extracting records", function() {
  env.container.register('serializer:post', DS.JSONSerializer.extend({
    primaryKey: '_ID_'
  }));

  var jsonHash = { "_ID_": 1, title: "Rails is omakase"};

  post = env.container.lookup("serializer:post").extractSingle(env.store, Post, jsonHash);

  equal(post.id, "1");
  equal(post.title, "Rails is omakase");
});

test("Serializer should respect the primaryKey attribute when serializing records", function() {
  env.container.register('serializer:post', DS.JSONSerializer.extend({
    primaryKey: '_ID_'
  }));

  post = env.store.createRecord("post", { id: "1", title: "Rails is omakase"});

  var payload = env.container.lookup("serializer:post").serialize(post, {includeId: true});

  equal(payload._ID_, "1");
});

test("Serializer should respect keyForAttribute when extracting records", function() {
  env.container.register('serializer:post', DS.JSONSerializer.extend({
    keyForAttribute: function(key) {
      return key.toUpperCase();
    }
  }));

  var jsonHash = {id: 1, TITLE: 'Rails is omakase'};

  post = env.container.lookup("serializer:post").normalize(Post, jsonHash);

  equal(post.id, "1");
  equal(post.title, "Rails is omakase");
});

test("Serializer should respect keyForRelationship when extracting records", function() {
  env.container.register('serializer:post', DS.JSONSerializer.extend({
    keyForRelationship: function(key, type) {
      return key.toUpperCase();
    }
  }));

  var jsonHash = {id: 1, title: 'Rails is omakase', COMMENTS: ['1']};

  post = env.container.lookup("serializer:post").normalize(Post, jsonHash);

  deepEqual(post.comments, ['1']);
});

test("normalizePayload is called during extractSingle", function() {
  env.container.register('serializer:post', DS.JSONSerializer.extend({
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

  post = env.container.lookup("serializer:post").extractSingle(env.store, Post, jsonHash);

  equal(post.id, "1");
  equal(post.title, "Rails is omakase");
});

test("Calling normalize should normalize the payload (only the passed keys)", function () {
  expect(1);
  var Person = DS.Model.extend({
    posts: DS.hasMany('post')
  });
  env.container.register('serializer:post', DS.JSONSerializer.extend({
    attrs: {
      notInHash: 'aCustomAttrNotInHash',
      inHash: 'aCustomAttrInHash'
    }
  }));

  env.container.register('model:person', Person);

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
