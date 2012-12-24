var store, serializer, Post, post;

module("Adapter serialization with attributes only", {
  setup: function() {
    store = DS.Store.create();

    Post = DS.Model.extend({
      title: DS.attr('string')
    });

    serializer = DS.JSONSerializer.create();
  },
  teardown: function() {
    post.destroy();
    serializer.destroy();
    store.destroy();
  }
});

test("calling serialize with a record invokes addAttributes", function() {
  post = store.createRecord(Post, { title: "Ohai" });

  serializer.addAttributes = function(hash, record) {
    record.eachAttribute(function(attribute) {
      hash[attribute] = record.get(attribute);
    });
  };

  var json = serializer.serialize(post);

  deepEqual(json, { title: "Ohai" });
});

test("by default, addAttributes calls keyForAttributeName", function() {
  expect(2);

  post = store.createRecord(Post, { title: "Ohai" });

  serializer.keyForAttributeName = function(type, name) {
    equal(type, Post, "keyForAttributeName should receive type as first parameter");
    equal(name, "title", "keyForAttributeName should receive name as second parameter");

    return "__" + name + "__";
  };

  serializer.serialize(post);
});

test("the default addAttributes uses a specified defaultValue", function() {
  Post.reopen({
    body: DS.attr('string', { defaultValue: 'FIRST' })
  });

  post = store.createRecord(Post, { title: "Ohai" });

  var json = serializer.serialize(post);

  deepEqual(json, { title: "Ohai", body: "FIRST" });
});

test("the default addAttributes calls transform", function() {
  serializer.serializeValue = function(value, attributeType) {
    return value.toUpperCase();
  };

  post = store.createRecord(Post, { title: "Ohai" });

  var json = serializer.serialize(post);

  deepEqual(json, { title: "OHAI" });
});

module("Adapter serialization with an ID", {
  setup: function() {
    store = DS.Store.create();

    Post = DS.Model.extend();

    serializer = DS.JSONSerializer.create();
  },
  teardown: function() {
    serializer.destroy();
    store.destroy();
  }
});

test("calling serialize with a record and includeId: true invokes addId", function() {
  serializer.addId = function(hash, type, id) {
    hash.__id__ = id;
  };

  var post = store.createRecord(Post, { id: "EWOT" });
  var json = serializer.serialize(post, { includeId: true });

  deepEqual(json, { __id__: "EWOT" });
});

test("by default, addId calls primaryKey", function() {
  expect(2);

  serializer.primaryKey = function(type) {
    equal(type, Post);
    return "__key__";
  };

  var post = store.createRecord(Post, { id: "EWOT" });
  var json = serializer.serialize(post, { includeId: true });

  deepEqual(json, { __key__: "EWOT" });
});

var Attachment, Comment, attachment, comment;

module("Adapter serialization with relationships", {
  setup: function() {
    store = DS.Store.create();

    Post = DS.Model.extend();

    Attachment = DS.Model.extend({
      post: DS.belongsTo(Post)
    });

    Comment = DS.Model.extend({
      post: DS.belongsTo(Post)
    });

    Post.reopen({
      comments: DS.hasMany(Comment),
      attachment: DS.hasOne(Attachment)
    });

    serializer = DS.JSONSerializer.create();

    post = store.createRecord(Post);
    comment = store.createRecord(Comment);
    attachment = store.createRecord(Attachment);

    post.get('comments').pushObject(comment);
    post.set('attachment', attachment);
  },

  teardown: function() {
    post.destroy();
    comment.destroy();
    serializer.destroy();
    store.destroy();
  }
});

test("calling serialize with a record with relationships invokes addRelationships", function() {
  expect(1);

  serializer.addRelationships = function(hash, record) {
    equal(record, post);
  };

  serializer.serialize(post);
});

test("the default addRelationships calls addBelongsTo", function() {
  expect(3);

  serializer.addBelongsTo = function(hash, record, key, relationship) {
    equal(relationship.kind, "belongsTo");
    equal(key, 'post');
    equal(record, comment);
  };

  serializer.serialize(comment);
});

test("the default addRelationships calls addHasMany", function() {
  expect(3);

  serializer.addHasMany = function(hash, record, key, relationship) {
    equal(relationship.kind, "hasMany");
    equal(key, 'comments');
    equal(record, post);
  };

  serializer.serialize(post);
});

test("the default addRelationships calls addHasOne", function() {
  expect(3);

  serializer.addHasOne = function(hash, record, key, relationship) {
    equal(relationship.kind, "hasOne");
    equal(key, 'attachment');
    equal(record, post);
  };

  serializer.serialize(post);
});
