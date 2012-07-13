var store, serializer, Post, post;

module("Adapter serialization with attributes only", {
  setup: function() {
    store = DS.Store.create();

    Post = DS.Model.extend({
      title: DS.attr('string')
    });

    serializer = DS.Serializer.create();
  },
  teardown: function() {
    post.destroy();
    serializer.destroy();
    store.destroy();
  }
});

test("calling toJSON with a record invokes addAttributes", function() {
  post = store.createRecord(Post, { title: "Ohai" });

  serializer.addAttributes = function(hash, record) {
    record.eachAttribute(function(attribute) {
      hash[attribute] = record.get(attribute);
    });
  };

  var json = serializer.toJSON(post);

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

  serializer.toJSON(post);
});

test("the default addAttributes uses a specified defaultValue", function() {
  Post.reopen({
    body: DS.attr('string', { defaultValue: 'FIRST' })
  });

  post = store.createRecord(Post, { title: "Ohai" });

  var json = serializer.toJSON(post);

  deepEqual(json, { title: "Ohai", body: "FIRST" });
});

test("the default addAttributes calls transform", function() {
  serializer.transformValueToJSON = function(value, attributeType) {
    return value.toUpperCase();
  };

  post = store.createRecord(Post, { title: "Ohai" });

  var json = serializer.toJSON(post);

  deepEqual(json, { title: "OHAI" });
});

module("Adapter serialization with an ID", {
  setup: function() {
    store = DS.Store.create();

    Post = DS.Model.extend();

    serializer = DS.Serializer.create();
  },
  teardown: function() {
    serializer.destroy();
    store.destroy();
  }
});

test("calling toJSON with a record and includeId: true invokes addId", function() {
  serializer.addId = function(hash, type, id) {
    hash.__id__ = id;
  };

  var post = store.createRecord(Post, { id: "EWOT" });
  var json = serializer.toJSON(post, { includeId: true });

  deepEqual(json, { __id__: "EWOT" });
});

test("by default, addId calls primaryKey", function() {
  expect(2);

  serializer.primaryKey = function(type) {
    equal(type, Post);
    return "__key__";
  };

  var post = store.createRecord(Post, { id: "EWOT" });
  var json = serializer.toJSON(post, { includeId: true });

  deepEqual(json, { __key__: "EWOT" });
});

var Comment, comment;

module("Adapter serialization with relationships", {
  setup: function() {
    store = DS.Store.create();

    Post = DS.Model.extend();

    Comment = DS.Model.extend({
      post: DS.belongsTo(Post)
    });

    Post.reopen({
      comments: DS.hasMany(Comment)
    });

    serializer = DS.Serializer.create();

    post = store.createRecord(Post);
    comment = store.createRecord(Comment);

    post.get('comments').pushObject(comment);
  },

  teardown: function() {
    post.destroy();
    comment.destroy();
    serializer.destroy();
    store.destroy();
  }
});

test("calling toJSON with a record with relationships invokes addRelationships", function() {
  expect(1);

  serializer.addRelationships = function(hash, record) {
    equal(record, post);
  };

  serializer.toJSON(post);
});

test("the default addRelationships calls addBelongsTo", function() {
  serializer.addBelongsTo = function(hash, record, relationship) {
    equal(relationship.kind, "belongsTo");
    equal(record, comment);
  };

  serializer.toJSON(comment);
});

test("the default addRelationships calls addHasMany", function() {
  serializer.addHasMany = function(hash, record, relationship) {
    equal(relationship.kind, "hasMany");
    equal(record, post);
  };

  serializer.toJSON(post);
});
