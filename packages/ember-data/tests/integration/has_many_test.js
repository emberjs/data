var get = Ember.get, set = Ember.set;
var adapter, serializer, store, App;

module("Has-Many Relationships", {
  setup: function() {
    adapter = DS.Adapter.create();
    store = DS.Store.create({
      adapter: adapter
    });

    serializer = get(adapter, 'serializer');

    App = Ember.Namespace.create({
      name: 'App'
    });

    App.Post = DS.Model.extend({
      title: DS.attr('string')
    });

    App.Comment = DS.Model.extend({
      body: DS.attr('string'),
      post: DS.belongsTo(App.Post)
    });

    App.Post.reopen({
      comments: DS.hasMany(App.Comment)
    });
  },

  teardown: function() {
    adapter.destroy();
    store.destroy();
  }
});

test("A hasMany relationship has an isLoaded flag that indicates whether the ManyArray has finished loaded", function() {
  expect(10);

  var array, hasLoaded;

  adapter.find = function(store, type, id) {
    setTimeout(async(function() {
      equal(array.get('isLoaded'), false, "Before loading, the array isn't isLoaded");
      store.load(type, { id: id });

      // The isLoaded flag change is deferred, so this should be `false`
      // even after all of the records have been loaded.
      // This becoming `true` is tested below in the on('didLoad') event listener.
      equal(array.get('isLoaded'), false, "After loading some records, the array isn't isLoaded");
    }), 1);
  };

  array = store.findMany(App.Comment, [ 1, 2, 3 ]);

  array.on('didLoad', function() {
    equal(array.get('isLoaded'), true, "After loading all records, the array isLoaded");
    ok(true, "didLoad was triggered");
  });

  array.then(function(resolvedValue) {
    equal(resolvedValue, array, "the promise was resolved with itself");
  });

  equal(get(array, 'isLoaded'), false, "isLoaded should not be true when first created");
});

test("When a hasMany relationship is accessed, the adapter's findMany method should not be called if all the records in the relationship are already loaded", function() {
  expect(0);

  adapter.findMany = function() {
    ok(false, "The adapter's find method should not be called");
  };

  store.load(App.Post, { id: 1, comments: [ 1 ] });
  store.load(App.Comment, { id: 1 });

  var post = store.find(App.Post, 1);

  post.get('comments');

  store.load(App.Post, { id: 1, comments: [ 1 ] });
});

// This tests the case where a serializer materializes a has-many
// relationship as a reference that it can fetch lazily. The most
// common use case of this is to provide a URL to a collection that
// is loaded later.
asyncTest("An serializer can materialize a hasMany as an opaque token that can be lazily fetched via the adapter's findHasMany hook", function() {
  expect(8);

  // When a payload comes in from the server, replace the string
  // with an object. This can technically be anything; we just need
  // something that the adapter will understand when its findHasMany
  // hook is invoked.
  serializer.extractHasMany = function(record, hash, relationship) {
    return { url: hash.comments };
  };

  // When the store asks the adapter for the record with ID 1,
  // provide some fake data.
  adapter.find = function(store, type, id) {
    equal(type, App.Post);
    equal(id, 1);

    setTimeout(function() {
      store.load(App.Post, { id: 1, comments: "/posts/1/comments" });
      next();
    }, 1);
  };

  adapter.findMany = function() {
    start();
    throw new Error("Adapter's findMany should not be called");
  };

  adapter.findHasMany = function(store, record, relationship, details) {
    equal(relationship.type, App.Comment);
    equal(relationship.key, 'comments');
    equal(details.url, "/posts/1/comments");

    setTimeout(function() {
      // Load in some fake comments
      store.loadMany(App.Comment, [
        { id: 1, body: "First" },
        { id: 2, body: "Second" }
      ]);

      // Now load those comments into the ManyArray that was provided.
      store.loadHasMany(record, relationship.key, [ 1, 2 ]);

      setTimeout(function() {
        done();
      }, 1);
    }, 1);
  };

  var post = store.find(App.Post, 1), comments;

  function next() {
    // Kick off the materialization of the comments
    // hasMany by getting it from the Post object.
    // The isLoaded property should not be true
    // because no data has yet been provided.
    comments = post.get('comments');
    equal(comments.get('isLoaded'), false);
  }

  function done() {
    start();
    equal(comments.get('isLoaded'), true);
    equal(comments.get('length'), 2);
  }
});
