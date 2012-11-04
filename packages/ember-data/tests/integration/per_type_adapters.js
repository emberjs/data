var oldLookup, lookup;

module("Per-Type Adapters", {
  setup: function() {
    oldLookup = Ember.lookup;
    lookup = Ember.lookup = {};
  },

  teardown: function() {
    Ember.lookup = oldLookup;
  }
});

test("Adapters can be registered on a per-type basis", function() {
  expect(2);

  var Store = DS.Store.extend(),
      Post = DS.Model.extend(),
      Comment = DS.Model.extend();

  Store.registerAdapter(Post, DS.Adapter.extend({
    find: function(store, type, id) {
      strictEqual(type, Post, "Post adapter was used to find Post record");
    }
  }));

  var store = Store.create({
    adapter: DS.Adapter.extend({
      find: function(store, type, id) {
        strictEqual(type, Comment, "default adapter is used to find Comment");
      }
    })
  });

  store.find(Post, 1);
  store.find(Comment, 1);
});

test("Mapped adapters are inherited from their parents", function() {
  expect(2);

  var ParentStore = DS.Store.extend(),
      ChildStore = ParentStore.extend(),
      Post = DS.Model.extend(),
      Comment = DS.Model.extend();

  ParentStore.registerAdapter(Post, DS.Adapter.extend({
    find: function(store, type, id) {
      strictEqual(type, Post, "Post adapter was used to find Post record");
    }
  }));

  ChildStore.registerAdapter(Comment, DS.Adapter.extend({
    find: function(store, type, id) {
      strictEqual(type, Comment, "Comment adapter is used to find Comment");
    }
  }));

  var store = ChildStore.create();

  store.find(Post, 1);
  store.find(Comment, 1);
});

test("Types can be specified as strings", function() {
  expect(1);

  var Store = DS.Store.extend(),
      Post = DS.Model.extend();

  lookup.Post = Post;

  Store.registerAdapter('Post', DS.Adapter.extend({
    find: function(store, type, id) {
      strictEqual(type, Post, "Post adapter was used to find Post record");
    }
  }));

  var store = Store.create();
  store.find(Post, 1);
});

test("Child classes can override the mappings of parent classes", function() {
  expect(1);

  var ParentStore = DS.Store.extend(),
      ChildStore = ParentStore.extend(),
      Post = DS.Model.extend();

  ParentStore.registerAdapter(Post, DS.Adapter.extend({
    find: function(store, type, id) {
      ok(false, "parent adapter mapping should not have been reached");
    }
  }));

  ChildStore.registerAdapter(Post, DS.Adapter.extend({
    find: function(store, type, id) {
      strictEqual(type, Post, "Child adapter is used to find Post");
    }
  }));

  var store = ChildStore.create();

  store.find(Post, 1);
});

test("Child classes can override the mappings of parent classes when types are provided as strings", function() {
  expect(1);

  var ParentStore = DS.Store.extend(),
      ChildStore = ParentStore.extend(),
      Post = DS.Model.extend();

  lookup.Post = Post;

  ParentStore.registerAdapter('Post', DS.Adapter.extend({
    find: function(store, type, id) {
      ok(false, "parent adapter mapping should not have been reached");
    }
  }));

  ChildStore.registerAdapter(Post, DS.Adapter.extend({
    find: function(store, type, id) {
      strictEqual(type, Post, "Child adapter is used to find Post");
    }
  }));

  var store = ChildStore.create();

  store.find(Post, 1);
});

test("Child classes can override the mappings of parent classes when types are provided as strings", function() {
  expect(1);

  var ParentStore = DS.Store.extend(),
      ChildStore = ParentStore.extend(),
      Post = DS.Model.extend();

  lookup.Post = Post;

  ParentStore.registerAdapter(Post, DS.Adapter.extend({
    find: function(store, type, id) {
      ok(false, "parent adapter mapping should not have been reached");
    }
  }));

  ChildStore.registerAdapter('Post', DS.Adapter.extend({
    find: function(store, type, id) {
      strictEqual(type, Post, "Child adapter is used to find Post");
    }
  }));

  var store = ChildStore.create();

  store.find(Post, 1);
});
