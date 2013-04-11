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

    serializer = DS.JSONSerializer.create();

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

test("calling serialize with a record with relationships invokes addRelationships", function() {
  expect(1);

  serializer.addRelationships = function(hash, record) {
    equal(record, post);
  };

  serializer.serialize(post);
});

test("the default addRelationships calls addBelongsTo", function() {
  serializer.addBelongsTo = function(hash, record, key, relationship) {
    equal(relationship.kind, "belongsTo");
    equal(key, 'post');
    equal(record, comment);
  };

  serializer.serialize(comment);
});

test("the default addRelationships calls addHasMany", function() {
  serializer.addHasMany = function(hash, record, key, relationship) {
    equal(relationship.kind, "hasMany");
    equal(key, 'comments');
    equal(record, post);
  };

  serializer.serialize(post);
});

test("loadValue should be called once per sideloaded type", function() {
  var payload, loader, K = Ember.K, loadedTypes = [], App = Ember.Namespace.create({
    toString: function() { return "App"; }
  });

  App.Fan = DS.Model.extend({
    name: DS.attr('string')
  });

  App.Player = DS.Model.extend({
    name: DS.attr('string'),
    fans: DS.hasMany(App.Fan)
  });

  App.Coach = DS.Model.extend({
    name: DS.attr('string'),
    fans: DS.hasMany(App.Fan),
    players: DS.hasMany(App.Player)
  });

  serializer.configure(App.Coach, {
    sideloadAs: 'coaches'
  });

  App.Team = DS.Model.extend({
    name: DS.attr('string'),
    mascots: DS.hasMany(App.Coach),
    fans: DS.hasMany(App.Fan),
    players: DS.hasMany(App.Player)
  });

  payload = {
    coaches: [{
      id: 1, name: "Peter Wagenet", fan_ids: [ 1 ], player_ids: [ 1 ]
    }],
    fans: [{
      id: 1, name: "Yehuda Katz"
    }],
    players: [{
      id: 1, name: "Tom Dale", fan_ids: [ 1 ]
    }],
    team: {
      id: 1, name: "49ers", fan_ids: [ 1 ], player_ids: [ 1 ], coach_ids: [ 1 ]
    }
  };

  loader = { load: K, loadMany: K, prematerialize: K, metaForType: K };

  serializer.loadValue = function(store, type, value) {
    loadedTypes.push(type);
  };

  serializer.extract(loader, payload, App.Team);

  equal(loadedTypes.length, 3, "Loaded: " + loadedTypes.join(", "));
});

module("Adapter serialization with metadata", {
  setup: function() {
    store = DS.Store.create();
    serializer = DS.JSONSerializer.create();
  },

  teardown: function() {
    serializer.destroy();
    store.destroy();
  }
});

test("metadata that has been configured is passed to the store", function() {
  var payload, typeMap, loader = DS.loaderFor(store), K = Ember.K, App = Ember.Namespace.create({
    toString: function() { return "App"; }
  });

  payload = {
      meta: {
        pages: { total_pages: '2', per_page: '1' },  since: '123'
      },
      posts: [
        { id: 1, name: "My First Post" },
        { id: 2, name: "The Second Post" }
      ]
    };

  App.Post = DS.Model.extend({
    name: DS.attr('string', {defaultValue: 'A Post'})
  });

  serializer.configure({
    meta: 'meta',
    since: 'since',
    pagination: 'pages'
  });

  loader = { load: K, loadMany: K, prematerialize: K, populateArray: K, metaForType: loader.metaForType };
  typeMap = store.typeMapFor(App.Post);

  serializer.extractMany(loader, payload, App.Post);

  equal(typeMap.metadata.pagination, payload.meta[serializer.configOption(App.Post, 'pagination')], "Loaded meta property: pagination");
  equal(typeMap.metadata.since, payload.meta[serializer.configOption(App.Post, 'since')], "Loaded meta property: since");
});

test("metadata that has not been configured is not passed to the store", function() {
  var payload, typeMap, loader = DS.loaderFor(store), K = Ember.K, App = Ember.Namespace.create({
    toString: function() { return "App"; }
  });

  payload = {
      meta: {
        pages: { total_pages: '2', per_page: '1' },  since: '123'
      },
      posts: [
        { id: 1, name: "My First Post" },
        { id: 2, name: "The Second Post" }
      ]
    };

  App.Post = DS.Model.extend({
    name: DS.attr('string', {defaultValue: 'A Post'})
  });

  loader = { load: K, loadMany: K, prematerialize: K, populateArray: K, metaForType: loader.metaForType };
  typeMap = store.typeMapFor(App.Post);

  serializer.extractMany(loader, payload, App.Post);

  equal(typeMap.metadata.pagination, null, "Did not load meta property: pagination");
  equal(typeMap.metadata.since, payload.meta[serializer.configOption(App.Post, 'since')], "Loaded meta property: since");
});

test("metadata that is not nested under 'meta' is passed to store", function() {
  var payload, typeMap, loader = DS.loaderFor(store), K = Ember.K, App = Ember.Namespace.create({
    toString: function() { return "App"; }
  });

  payload = {
      total_pages: '2',
      per_page: '1',
      since: '123',
      posts: [
        { id: 1, name: "My First Post" },
        { id: 2, name: "The Second Post" }
      ]
    };

  App.Post = DS.Model.extend({
    name: DS.attr('string', {defaultValue: 'A Post'})
  });

  serializer.configure({
    since: 'since',
    pages: 'total_pages',
    pageLimit: 'per_page'
  });

  loader = { load: K, loadMany: K, prematerialize: K, populateArray: K, metaForType: loader.metaForType };
  typeMap = store.typeMapFor(App.Post);

  serializer.extractMany(loader, payload, App.Post);

  equal(typeMap.metadata.pages, payload[serializer.configOption(App.Post, 'pages')], "Loaded meta property: pages");
  equal(typeMap.metadata.pageLimit, payload[serializer.configOption(App.Post, 'pageLimit')], "Loaded meta property: pageLimit");
  equal(typeMap.metadata.since, payload[serializer.configOption(App.Post, 'since')], "Loaded meta property: since");
});
