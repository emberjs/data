var get = Ember.get, set = Ember.set;
var originalLookup = Ember.lookup, lookup;
var adapter, serializer, store, App;

module("Has-Many Relationships", {
  setup: function() {
    lookup = Ember.lookup = {};
    adapter = DS.Adapter.create();
    store = DS.Store.create({
      adapter: adapter
    });

    serializer = get(adapter, 'serializer');

    serializer.configure('App.Comment', {
      alias: 'comment'
    });

    serializer.configure('App.Post', {
      alias: 'post'
    });

    App = Ember.Namespace.create({
      name: 'App'
    });

    App.User = DS.Model.extend({
      name: DS.attr('string')
    });

    App.Message = DS.Model.extend({
      user: DS.belongsTo(App.User),
      created_at: DS.attr('date')
    });

    App.Post = App.Message.extend({
      title: DS.attr('string')
    });

    App.Comment = App.Message.extend({
      body: DS.attr('string'),
      post: DS.belongsTo(App.Post)
    });

    App.Post.reopen({
      comments: DS.hasMany(App.Comment)
    });

    App.User.reopen({
      messages: DS.hasMany(App.Message, {polymorphic: true})
    });

    lookup.App = {
      Post: App.Post,
      Comment: App.Comment
    };
  },

  teardown: function() {
    adapter.destroy();
    store.destroy();
    Ember.lookup = originalLookup;
  }
});

test("A hasMany relationship has an isLoaded flag that indicates whether the ManyArray has finished loaded", function() {
  expect(10);

  var array, hasLoaded;

  adapter.find = function(store, type, id) {
    setTimeout(async(function() {
      equal(get(array, 'isLoaded'), false, "Before loading, the array isn't isLoaded");
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
});

// This tests the case where a serializer materializes a has-many
// relationship as a reference that it can fetch lazily. The most
// common use case of this is to provide a URL to a collection that
// is loaded later.
asyncTest("A serializer can materialize a hasMany as an opaque token that can be lazily fetched via the adapter's findHasMany hook", function() {
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

test("When a polymorphic hasMany relationship is accessed, the adapter's findMany method should not be called if all the records in the relationship are already loaded", function() {
  expect(1);

  adapter.findMany = function() {
    ok(false, "The adapter's find method should not be called");
  };

  store.load(App.User, { id: 1, messages: [ {id: 1, type: 'post'}, {id: 3, type: 'comment'} ] });
  store.load(App.Post, { id: 1 });
  store.load(App.Comment, { id: 3 });

  var user = store.find(App.User, 1),
      messages = user.get('messages');

  equal(messages.get('length'), 2, "The messages are correctly loaded");
});

test("When a polymorphic hasMany relationship is accessed, the store can call multiple adapters' findMany method if the records are not loaded", function() {
  expect(3);

  adapter.findMany = function() {
    ok(true, "The adapter's find method should be called");
  };

  store.load(App.User, { id: 1, messages: [ {id: 1, type: 'post'}, {id: 3, type: 'comment'} ] });

  var user = store.find(App.User, 1),
      messages = user.get('messages');

  equal(messages.get('length'), 2, "The messages are correctly loaded");
});

test("A record can't be created from a polymorphic hasMany relationship", function() {
  expect(1);
  store.load(App.User, { id: 1, messages: [] });
  var user = store.find(App.User, 1),
      messages = user.get('messages');

  raises(
    function() { messages.createRecord(); },
    /You can not create records of App.Message on this polymorphic relationship/,
    "Creating records directly on a polymorphic hasMany is disallowed"
  );
});

test("Only records of the same type can be added to a monomorphic hasMany relationship", function() {
  expect(1);
  store.load(App.Post, { id: 1 });
  store.load(App.Post, { id: 2 });
  var post = store.find(App.Post, 1),
      message = store.find(App.Post, 2);

  raises(
    function() { post.get('comments').pushObject(message); },
    /You can only add records of App.Comment to this relationship/,
    "Adding records of a different type on a monomorphic hasMany is disallowed"
  );
});

test("Only records of the same base type can be added to a polymorphic hasMany relationship", function() {
  expect(2);
  store.load(App.User, { id: 1 });
  store.load(App.User, { id: 2 });
  store.load(App.Post, { id: 1 });
  store.load(App.Comment, { id: 3 });

  var user = store.find(App.User, 1),
      anotherUser = store.find(App.User, 2),
      messages = user.get('messages'),
      post = store.find(App.Post, 1),
      comment = store.find(App.Comment, 3);

  messages.pushObject(post);
  messages.pushObject(comment);

  equal(messages.get('length'), 2, "The messages are correctly added");

  raises(
    function() { messages.pushObject(anotherUser); },
    /You can only add records of App.Message to this relationship/,
    "Adding records of a different base type on a polymorphic hasMany is disallowed"
  );
});

test("A record can be removed from a polymorphic association", function() {
  expect(3);

  store.load(App.User, { id: 1 , messages: [{id: 3, type: 'comment'}]});
  store.load(App.Comment, { id: 3 });

  var user = store.find(App.User, 1),
      comment = store.find(App.Comment, 3),
      messages = user.get('messages');

  equal(messages.get('length'), 1, "The user has 1 message");

  var removedObject = messages.popObject();

  equal(removedObject, comment, "The message is correctly removed");
  equal(messages.get('length'), 0, "The user does not have any messages");
});

test("A record can be found after loading its id through a hasMany relationship", function() {
  expect(1);
  store.load(App.Post, { id: 1, comments: [1, 2, 3] });

  adapter.find = function(store, type, id) {
    ok(true, "The adapter's find method should be called");
  };

  var post = store.find(App.Post, 1);
  var comment = store.find(App.Comment, 2);
});
