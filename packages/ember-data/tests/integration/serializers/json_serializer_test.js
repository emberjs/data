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
