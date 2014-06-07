var env, User, Contact, Email, Phone, Message, Post, Comment;
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
      contacts: hasMany()
    });

    Contact = DS.Model.extend({
      user: belongsTo('user')
    });

    Email = Contact.extend({
      email: attr('string')
    });

    Phone = Contact.extend({
      number: attr('string')
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
      contact: Contact,
      email: Email,
      phone: Phone,
      post: Post,
      comment: Comment,
      message: Message
    });
  },

  teardown: function() {
    env.container.destroy();
  }
});

test("When a hasMany relationship is accessed, the adapter's findMany method should not be called if all the records in the relationship are already loaded", function() {
  expect(0);

  env.adapter.findMany = function() {
    ok(false, "The adapter's find method should not be called");
  };

  env.store.push('post', { id: 1, comments: [ 1 ] });
  env.store.push('comment', { id: 1 });

  env.store.find('post', 1).then(async(function(post) {
    post.get('comments');
  }));
});

// This tests the case where a serializer materializes a has-many
// relationship as a reference that it can fetch lazily. The most
// common use case of this is to provide a URL to a collection that
// is loaded later.
test("A serializer can materialize a hasMany as an opaque token that can be lazily fetched via the adapter's findHasMany hook", function() {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  // When the store asks the adapter for the record with ID 1,
  // provide some fake data.
  env.adapter.find = function(store, type, id) {
    equal(type, Post, "find type was Post");
    equal(id, "1", "find id was 1");

    return Ember.RSVP.resolve({ id: 1, links: { comments: "/posts/1/comments" } });
  };

  env.adapter.findMany = function() {
    throw new Error("Adapter's findMany should not be called");
  };

  env.adapter.findHasMany = function(store, record, link, relationship) {
    equal(relationship.type, Comment, "findHasMany relationship type was Comment");
    equal(relationship.key, 'comments', "findHasMany relationship key was comments");
    equal(link, "/posts/1/comments", "findHasMany link was /posts/1/comments");

    return Ember.RSVP.resolve([
      { id: 1, body: "First" },
      { id: 2, body: "Second" }
    ]);
  };

  env.store.find('post', 1).then(async(function(post) {
    return post.get('comments');
  })).then(async(function(comments) {
    equal(comments.get('isLoaded'), true, "comments are loaded");
    equal(comments.get('length'), 2, "comments have 2 length");
  }));
});

test("An updated `links` value should invalidate a relationship cache", function() {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.createRecord = function(store, type, record) {
    var data = record.serialize();
    return Ember.RSVP.resolve({ id: 1, links: { comments: "/posts/1/comments" } });
  };

  env.adapter.findHasMany = function(store, record, link, relationship) {
    equal(relationship.type, Comment, "findHasMany relationship type was Comment");
    equal(relationship.key, 'comments', "findHasMany relationship key was comments");
    equal(link, "/posts/1/comments", "findHasMany link was /posts/1/comments");

    return Ember.RSVP.resolve([
      { id: 1, body: "First" },
      { id: 2, body: "Second" }
    ]);
  };

  env.store.createRecord('post', {}).save().then(async(function(post) {
    return post.get('comments');
  })).then(async(function(comments) {
    equal(comments.get('isLoaded'), true, "comments are loaded");
    equal(comments.get('length'), 2, "comments have 2 length");
  }));
});

test("When a polymorphic hasMany relationship is accessed, the adapter's findMany method should not be called if all the records in the relationship are already loaded", function() {
  expect(1);

  env.adapter.findMany = function() {
    ok(false, "The adapter's find method should not be called");
  };

  env.store.push('user', { id: 1, messages: [ {id: 1, type: 'post'}, {id: 3, type: 'comment'} ] });
  env.store.push('post', { id: 1 });
  env.store.push('comment', { id: 3 });

  env.store.find('user', 1).then(async(function(user) {
    var messages = user.get('messages');
    equal(messages.get('length'), 2, "The messages are correctly loaded");
  }));
});

test("When a polymorphic hasMany relationship is accessed, the store can call multiple adapters' findMany or find methods if the records are not loaded", function() {
  User.reopen({
    messages: hasMany('message', { polymorphic: true, async: true })
  });

  env.adapter.find = function(store, type) {
    if (type === Post) {
      return Ember.RSVP.resolve({ id: 1 });
    } else if (type === Comment) {
      return Ember.RSVP.resolve({ id: 3 });
    }
  };

  env.store.push('user', { id: 1, messages: [ {id: 1, type: 'post'}, {id: 3, type: 'comment'} ] });

  env.store.find('user', 1).then(async(function(user) {
    return user.get('messages');
  })).then(async(function(messages) {
    equal(messages.get('length'), 2, "The messages are correctly loaded");
  }));
});

test("Type can be inferred from the key of a hasMany relationship", function() {
  expect(1);
  env.store.push('user', { id: 1, contacts: [ 1 ] });
  env.store.push('contact', { id: 1 });
  env.store.find('user', 1).then(async(function(user) {
    return user.get('contacts');
  })).then(async(function(contacts) {
    equal(contacts.get('length'), 1, "The contacts relationship is correctly set up");
  }));
});

test("Type can be inferred from the key of an async hasMany relationship", function() {
  User.reopen({
    contacts: DS.hasMany({ async: true })
  });

  expect(1);
  env.store.push('user', { id: 1, contacts: [ 1 ] });
  env.store.push('contact', { id: 1 });
  env.store.find('user', 1).then(async(function(user) {
    return user.get('contacts');
  })).then(async(function(contacts) {
    equal(contacts.get('length'), 1, "The contacts relationship is correctly set up");
  }));
});

test("Polymorphic relationships work with a hasMany whose type is inferred", function() {
  User.reopen({
    contacts: DS.hasMany({ polymorphic: true })
  });

  expect(1);
  env.store.push('user', { id: 1, contacts: [ { id: 1, type: 'email' }, { id: 2, type: 'phone' } ] });
  env.store.push('email', { id: 1 });
  env.store.push('phone', { id: 2 });
  env.store.find('user', 1).then(async(function(user) {
    return user.get('contacts');
  })).then(async(function(contacts) {
    equal(contacts.get('length'), 2, "The contacts relationship is correctly set up");
  }));
});

test("A record can't be created from a polymorphic hasMany relationship", function() {
  env.store.push('user', { id: 1, messages: [] });

  env.store.find('user', 1).then(async(function(user) {
    return user.get('messages');
  })).then(async(function(messages) {
    expectAssertion(function() {
      messages.createRecord();
    }, /You cannot add 'message' records to this polymorphic relationship/);
  }));
});

test("Only records of the same type can be added to a monomorphic hasMany relationship", function() {
  expect(1);
  env.store.push('post', { id: 1, comments: [] });
  env.store.push('post', { id: 2 });

  Ember.RSVP.all([ env.store.find('post', 1), env.store.find('post', 2) ]).then(async(function(records) {
    expectAssertion(function() {
      records[0].get('comments').pushObject(records[1]);
    }, /You cannot add 'post' records to this relationship/);
  }));

});

test("Only records of the same base type can be added to a polymorphic hasMany relationship", function() {
  expect(2);
  env.store.push('user', { id: 1, messages: [] });
  env.store.push('user', { id: 2, messages: [] });
  env.store.push('post', { id: 1, comments: [] });
  env.store.push('comment', { id: 3 });

  var asyncRecords = Ember.RSVP.hash({
    user: env.store.find('user', 1),
    anotherUser: env.store.find('user', 2),
    post: env.store.find('post', 1),
    comment: env.store.find('comment', 3)
  });

  asyncRecords.then(async(function(records) {
    records.messages = records.user.get('messages');
    return Ember.RSVP.hash(records);
  })).then(async(function(records) {
    records.messages.pushObject(records.post);
    records.messages.pushObject(records.comment);
    equal(records.messages.get('length'), 2, "The messages are correctly added");

    expectAssertion(function() {
      records.messages.pushObject(records.anotherUser);
    }, /You cannot add 'user' records to this relationship/);
  }));
});

test("A record can be removed from a polymorphic association", function() {
  expect(3);

  env.store.push('user', { id: 1 , messages: [{id: 3, type: 'comment'}]});
  env.store.push('comment', { id: 3 });

  var asyncRecords = Ember.RSVP.hash({
    user: env.store.find('user', 1),
    comment: env.store.find('comment', 3)
  });

  asyncRecords.then(async(function(records) {
    records.messages = records.user.get('messages');
    return Ember.RSVP.hash(records);
  })).then(async(function(records) {
    equal(records.messages.get('length'), 1, "The user has 1 message");

    var removedObject = records.messages.popObject();

    equal(removedObject, records.comment, "The message is correctly removed");
    equal(records.messages.get('length'), 0, "The user does not have any messages");
  }));
});

test("When a record is created on the client, its hasMany arrays should be in a loaded state", function() {
  expect(3);

  var post;

  Ember.run(function() {
    post = env.store.createRecord('post');
  });

  ok(get(post, 'isLoaded'), "The post should have isLoaded flag");

  var comments = get(post, 'comments');

  equal(get(comments, 'length'), 0, "The comments should be an empty array");

  ok(get(comments, 'isLoaded'), "The comments should have isLoaded flag");

});

test("When a record is created on the client, its async hasMany arrays should be in a loaded state", function() {
  expect(4);

  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  var post = Ember.run(function() {
    return env.store.createRecord('post');
  });

  ok(get(post, 'isLoaded'), "The post should have isLoaded flag");

  get(post, 'comments').then(function(comments) {
    ok(true, "Comments array successfully resolves");
    equal(get(comments, 'length'), 0, "The comments should be an empty array");
    ok(get(comments, 'isLoaded'), "The comments should have isLoaded flag");
  });

});

test("a records SYNC HM relationship property is readOnly", function(){
  expect(1);
  var post = Ember.run(function() {
    return env.store.createRecord('post');
  });

  raises(function(){
    post.set('comments');
  }, 'Cannot Set: comments on: ' + Ember.inspect(post));
});


test("a records ASYNC HM relationship property is readOnly", function(){
  expect(1);
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  var post = Ember.run(function() {
    return env.store.createRecord('post');
  });

  raises(function(){
    post.set('comments');
  }, 'Cannot Set: comments on: ' + Ember.inspect(post));
});

test("When a record is saved, its unsaved hasMany records should be kept", function () {
  expect(1);

  var post, comment;

  env.adapter.createRecord = function(store, type, record) {
    return Ember.RSVP.resolve({ id: 1 });
  };

  Ember.run(function () {
    post = env.store.createRecord('post');
    comment = env.store.createRecord('comment');
    post.get('comments').pushObject(comment);
    post.save();
  });

  equal(get(post, 'comments.length'), 1, "The unsaved comment should be in the post's comments array");
});
