var env, User, Message, Post, Comment;
var get = Ember.get, set = Ember.set;

var attr = DS.attr, hasMany = DS.hasMany, belongsTo = DS.belongsTo;

function stringify(string) {
  return function() { return string; };
}

module("integration/relationships/has_many - Has-Many Relationships", {
  setup: function() {
    User = DS.Model.extend({
      name: attr('string'),
      messages: hasMany('message', { polymorphic: true }),
    });

    Message = DS.Model.extend({
      user: belongsTo('user'),
      created_at: attr('date')
    });
    Message.toString = stringify('Message');

    Post = Message.extend({
      title: attr('string'),
      comments: hasMany('comment')
    });
    Post.toString = stringify('Post');

    Comment = Message.extend({
      body: DS.attr('string'),
      message: DS.belongsTo('post', { polymorphic: true })
    });
    Comment.toString = stringify('Comment');

    env = setupStore({
      user: User,
      post: Post,
      comment: Comment,
      message: Message
    });
  },

  teardown: function() {
    env.container.destroy();
  }
});

test("A hasMany relationship has an isLoaded flag that indicates whether the ManyArray has finished loaded", function() {
  expect(10);

  var array, hasLoaded;

  env.adapter.find = function(store, type, id) {
    setTimeout(async(function() {
      equal(get(array, 'isLoaded'), false, "Before loading, the array isn't isLoaded");
      store.push(type, { id: id });

      // The isLoaded flag change is deferred, so this should be `false`
      // even after all of the records have been loaded.
      // This becoming `true` is tested below in the on('didLoad') event listener.
      equal(array.get('isLoaded'), false, "After loading some records, the array isn't isLoaded");
    }), 1);
  };

  var comments = [
    env.store.getById('comment', "1"),
    env.store.getById('comment', "2"),
    env.store.getById('comment', "3")
  ];

  array = env.store.findMany('comment', comments);

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

  env.adapter.findMany = function() {
    ok(false, "The adapter's find method should not be called");
  };

  env.store.push('post', { id: 1, comments: [ 1 ] });
  env.store.push('comment', { id: 1 });

  var post = env.store.find('post', 1);

  post.get('comments');
});

// This tests the case where a serializer materializes a has-many
// relationship as a reference that it can fetch lazily. The most
// common use case of this is to provide a URL to a collection that
// is loaded later.
asyncTest("A serializer can materialize a hasMany as an opaque token that can be lazily fetched via the adapter's findHasMany hook", function() {
  expect(8);

  // When the store asks the adapter for the record with ID 1,
  // provide some fake data.
  env.adapter.find = function(store, type, id) {
    equal(type, Post);
    equal(id, 1);

    setTimeout(function() {
      Ember.run(function(){
        store.push('post', { id: 1, comments: "/posts/1/comments" });
      });

      next();
    }, 1);
  };

  env.adapter.findMany = function() {
    start();
    throw new Error("Adapter's findMany should not be called");
  };

  env.adapter.findHasMany = function(store, record, relationship, url) {
    equal(relationship.type, Comment);
    equal(relationship.key, 'comments');
    equal(url, "/posts/1/comments");

    setTimeout(function() {
      // Load in some fake comments
      Ember.run(function(){
        var records = env.store.pushMany('comment', [
          { id: 1, body: "First" },
          { id: 2, body: "Second" }
        ]);

        // Now load those comments into the ManyArray that was provided.
        record.updateHasMany(relationship.key, records);
      });

      setTimeout(function() {
        done();
      }, 1);
    }, 1);
  };

  var post = env.store.find('post', 1), comments;

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

  env.adapter.findMany = function() {
    ok(false, "The adapter's find method should not be called");
  };

  env.store.push('user', { id: 1, messages: [ {id: 1, type: 'post'}, {id: 3, type: 'comment'} ] });
  env.store.push('post', { id: 1 });
  env.store.push('comment', { id: 3 });

  var user = env.store.find('user', 1),
      messages = user.get('messages');

  equal(messages.get('length'), 2, "The messages are correctly loaded");
});

test("When a polymorphic hasMany relationship is accessed, the store can call multiple adapters' findMany method if the records are not loaded", function() {
  expect(3);

  env.adapter.findMany = function() {
    ok(true, "The adapter's find method should be called");
  };

  env.store.push('user', { id: 1, messages: [ {id: 1, type: 'post'}, {id: 3, type: 'comment'} ] });

  var user = env.store.find('user', 1);
  var messages = user.get('messages');

  equal(messages.get('length'), 2, "The messages are correctly loaded");
});

test("A record can't be created from a polymorphic hasMany relationship", function() {
  expect(1);
  env.store.push('user', { id: 1, messages: [] });
  var user = env.store.find('user', 1),
      messages = user.get('messages');

  expectAssertion(function() {
    messages.createRecord();
  }, /You cannot add 'message' records to this polymorphic relationship/);
});

test("Only records of the same type can be added to a monomorphic hasMany relationship", function() {
  expect(1);
  env.store.push('post', { id: 1, comments: [] });
  env.store.push('post', { id: 2 });
  var post = env.store.find('post', 1),
      message = env.store.find('post', 2);

  expectAssertion(function() {
    post.get('comments').pushObject(message);
  }, /You cannot add 'post' records to this relationship/);
});

test("Only records of the same base type can be added to a polymorphic hasMany relationship", function() {
  expect(2);
  env.store.push('user', { id: 1, messages: [] });
  env.store.push('user', { id: 2, messages: [] });
  env.store.push('post', { id: 1, comments: [] });
  env.store.push('comment', { id: 3 });

  var user = env.store.find('user', 1),
      anotherUser = env.store.find('user', 2),
      messages = user.get('messages'),
      post = env.store.find('post', 1),
      comment = env.store.find('comment', 3);

  messages.pushObject(post);
  messages.pushObject(comment);

  equal(messages.get('length'), 2, "The messages are correctly added");

  expectAssertion(function() {
    messages.pushObject(anotherUser);
  }, /You cannot add 'user' records to this relationship/);
});

test("A record can be removed from a polymorphic association", function() {
  expect(3);

  env.store.push('user', { id: 1 , messages: [{id: 3, type: 'comment'}]});
  env.store.push('comment', { id: 3 });

  var user = env.store.find('user', 1),
      comment = env.store.find('comment', 3),
      messages = user.get('messages');

  equal(messages.get('length'), 1, "The user has 1 message");

  var removedObject = messages.popObject();

  equal(removedObject, comment, "The message is correctly removed");
  equal(messages.get('length'), 0, "The user does not have any messages");
});

test("A record can be found after loading its id through a hasMany relationship", function() {
  expect(1);
  env.store.push('post', { id: 1, comments: [1, 2, 3] });

  env.adapter.find = function(store, type, id) {
    ok(true, "The adapter's find method should be called");
  };

  var post = env.store.find('post', 1);
  var comment = env.store.find('comment', 2);
});
