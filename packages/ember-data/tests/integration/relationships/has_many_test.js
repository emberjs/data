var env, User, Contact, Email, Phone, Message, Post, Comment;
var Book, Chapter, Page;
var get = Ember.get;
var resolve = Ember.RSVP.resolve;
var run = Ember.run;

var attr = DS.attr;
var hasMany = DS.hasMany;
var belongsTo = DS.belongsTo;

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

    Book = DS.Model.extend({
      title: attr(),
      chapters: hasMany('chapter', { async: true })
    });
    Book.toString = stringify('Book');

    Chapter = DS.Model.extend({
      title: attr(),
      pages: hasMany('page')
    });
    Chapter.toString = stringify('Chapter');

    Page = DS.Model.extend({
      number: attr('number'),
      chapter: belongsTo('chapter')
    });
    Page.toString = stringify('Page');

    env = setupStore({
      user: User,
      contact: Contact,
      email: Email,
      phone: Phone,
      post: Post,
      comment: Comment,
      message: Message,
      book: Book,
      chapter: Chapter,
      page: Page
    });
  },

  teardown: function() {
    run(env.container, 'destroy');
  }
});

test("When a hasMany relationship is accessed, the adapter's findMany method should not be called if all the records in the relationship are already loaded", function() {
  expect(0);

  env.adapter.findMany = function() {
    ok(false, "The adapter's find method should not be called");
  };

  run(function() {
    env.store.push('post', { id: 1, comments: [1] });
    env.store.push('comment', { id: 1 });
    env.store.find('post', 1).then(function(post) {
      return post.get('comments');
    });
  });
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
    equal(link, "/posts/1/comments", "findHasMany link was /posts/1/comments");
    equal(relationship.type.typeKey, "comment", "relationship was passed correctly");

    return Ember.RSVP.resolve([
      { id: 1, body: "First" },
      { id: 2, body: "Second" }
    ]);
  };

  run(function() {
    env.store.find('post', 1).then(async(function(post) {
      return post.get('comments');
    })).then(async(function(comments) {
      equal(comments.get('isLoaded'), true, "comments are loaded");
      equal(comments.get('length'), 2, "comments have 2 length");
      equal(comments.objectAt(0).get('body'), 'First', "comment loaded successfully");
    }));
  });
});

test("Accessing a hasMany backed by a link multiple times triggers only one request", function() {
  expect(2);
  var count = 0;
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  Comment.reopen({
    message: DS.belongsTo('post', { async: true })
  });
  var post;

  run(function() {
    post = env.store.push('post', { id: 1, links: { comments: '/posts/1/comments' } });
  });

  env.adapter.findHasMany = function(store, record, link, relationship) {
    start();
    count++;
    equal(count, 1, "findHasMany has only been called once");
    stop();
    return new Ember.RSVP.Promise(function(resolve, reject) {
      setTimeout(function() {
        var value = [
          { id: 1, body: "First" },
          { id: 2, body: "Second" }
        ];
        resolve(value);
      }, 100);
    });
  };

  stop();
  var promise1, promise2;
  run(function() {
    promise1 = post.get('comments');
    //Invalidate the post.comments CP
    env.store.push('comment', { id: 1, message: 1 });
    promise2 = post.get('comments');
  });
  Ember.RSVP.all([promise1, promise2]).then(function() {
    start();
  });
  equal(promise1.promise, promise2.promise, "Same promise is returned both times");
});

test("A hasMany backed by a link remains a promise after a record has been added to it", function() {
  expect(1);
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  Comment.reopen({
    message: DS.belongsTo('post', { async: true })
  });

  env.adapter.findHasMany = function(store, record, link, relationship) {
    return Ember.RSVP.resolve([
      { id: 1, body: "First" },
      { id: 2, body: "Second" }
    ]);
  };
  var post;
  run(function() {
    post = env.store.push('post', { id: 1, links: { comments: '/posts/1/comments' } });
  });

  run(function() {
    post.get('comments').then(function() {
      env.store.push('comment', { id: 3, message: 1 });
      post.get('comments').then(function() {
        ok(true, 'Promise was called');
      });
    });
  });
});

test("A hasMany updated link should not remove new children", function() {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  Comment.reopen({
    message: DS.belongsTo('post', { async: true })
  });

  env.adapter.findHasMany = function(store, record, link, relationship) {
    return Ember.RSVP.resolve([]);
  };

  env.adapter.createRecord = function(store, record, link, relationship) {
    return Ember.RSVP.resolve({
      links: {
        comments: '/some/link'
      }
    });
  };

  run(function() {
    var post = env.store.createRecord('post', {});
    env.store.createRecord('comment', { message: post });

    post.get('comments')
      .then(function(comments) {
        equal(comments.get('length'), 1);

        return post.save();
      })
      .then(function() {
        return post.get('comments');
      })
      .then(function(comments) {
        equal(comments.get('length'), 1);
      });
  });
});

test("A hasMany updated link should not remove new children when the parent record has children already", function() {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  Comment.reopen({
    message: DS.belongsTo('post', { async: true })
  });

  env.adapter.findHasMany = function(store, record, link, relationship) {
    return Ember.RSVP.resolve([{ id: 5, body: 'hello' }]);
  };

  env.adapter.createRecord = function(store, record, link, relationship) {
    return Ember.RSVP.resolve({
      links: {
        comments: '/some/link'
      }
    });
  };

  run(function() {
    var post = env.store.createRecord('post', {});
    env.store.createRecord('comment', { message: post });

    post.get('comments')
      .then(function(comments) {
        equal(comments.get('length'), 1);

        return post.save();
      })
      .then(function() {
        return post.get('comments');
      })
      .then(function(comments) {
        equal(comments.get('length'), 2);
      });
  });
});


test("A hasMany relationship can be reloaded if it was fetched via a link", function() {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.find = function(store, type, id) {
    equal(type, Post, "find type was Post");
    equal(id, "1", "find id was 1");

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

  run(function() {
    run(env.store, 'find', 'post', 1).then(function(post) {
      return post.get('comments');
    }).then(function(comments) {
      equal(comments.get('isLoaded'), true, "comments are loaded");
      equal(comments.get('length'), 2, "comments have 2 length");

      env.adapter.findHasMany = function(store, record, link, relationship) {
        equal(relationship.type, Comment, "findHasMany relationship type was Comment");
        equal(relationship.key, 'comments', "findHasMany relationship key was comments");
        equal(link, "/posts/1/comments", "findHasMany link was /posts/1/comments");

        return Ember.RSVP.resolve([
          { id: 1, body: "First" },
          { id: 2, body: "Second" },
          { id: 3, body: "Thirds" }
        ]);
      };

      return comments.reload();
    }).then(function(newComments) {
      equal(newComments.get('length'), 3, "reloaded comments have 3 length");
    });
  });
});

test("A sync hasMany relationship can be reloaded if it was fetched via ids", function() {
  Post.reopen({
    comments: DS.hasMany('comment')
  });

  env.adapter.find = function(store, type, id) {
    equal(type, Post, "find type was Post");
    equal(id, "1", "find id was 1");

    return Ember.RSVP.resolve({ id: 1, comments: [1, 2] });
  };

  run(function() {
    env.store.pushMany('comment', [{ id: 1, body: "First" }, { id: 2, body: "Second" }]);

    env.store.find('post', '1').then(function(post) {
      var comments = post.get('comments');
      equal(comments.get('isLoaded'), true, "comments are loaded");
      equal(comments.get('length'), 2, "comments have a length of 2");

      env.adapter.findMany = function(store, type, ids, records) {
        return Ember.RSVP.resolve([
          { id: 1, body: "FirstUpdated" },
          { id: 2, body: "Second" }
        ]);
      };

      return comments.reload();
    }).then(function(newComments) {
      equal(newComments.get('firstObject.body'), 'FirstUpdated', "Record body was correctly updated");
    });
  });
});

test("A hasMany relationship can be reloaded if it was fetched via ids", function() {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.find = function(store, type, id) {
    equal(type, Post, "find type was Post");
    equal(id, "1", "find id was 1");

    return Ember.RSVP.resolve({ id: 1, comments: [1,2] });
  };

  env.adapter.findMany = function(store, type, ids, records) {
    return Ember.RSVP.resolve([
      { id: 1, body: "First" },
      { id: 2, body: "Second" }
    ]);
  };

  run(function() {
    env.store.find('post', 1).then(function(post) {
      return post.get('comments');
    }).then(function(comments) {
      equal(comments.get('isLoaded'), true, "comments are loaded");
      equal(comments.get('length'), 2, "comments have 2 length");

      env.adapter.findMany = function(store, type, ids, records) {
        return Ember.RSVP.resolve([
          { id: 1, body: "FirstUpdated" },
          { id: 2, body: "Second" }
        ]);
      };

      return comments.reload();
    }).then(function(newComments) {
      equal(newComments.get('firstObject.body'), 'FirstUpdated', "Record body was correctly updated");
    });
  });
});

test("A hasMany relationship can be directly reloaded if it was fetched via ids", function() {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.find = function(store, type, id) {
    equal(type, Post, "find type was Post");
    equal(id, "1", "find id was 1");

    return Ember.RSVP.resolve({ id: 1, comments: [1,2] });
  };

  env.adapter.findMany = function(store, type, ids, records) {
    return Ember.RSVP.resolve([
      { id: 1, body: "FirstUpdated" },
      { id: 2, body: "Second" }
    ]);
  };

  run(function() {
    env.store.find('post', 1).then(function(post) {
      return post.get('comments').reload().then(function(comments) {
        equal(comments.get('isLoaded'), true, "comments are loaded");
        equal(comments.get('length'), 2, "comments have 2 length");
        equal(comments.get('firstObject.body'), "FirstUpdated", "Record body was correctly updated");
      });
    });
  });
});

test("PromiseArray proxies createRecord to its ManyArray once the hasMany is loaded", function() {
  expect(4);

  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.findHasMany = function(store, record, link, relationship) {
    return Ember.RSVP.resolve([
      { id: 1, body: "First" },
      { id: 2, body: "Second" }
    ]);
  };
  var post;

  run(function() {
    post = env.store.push('post', { id: 1, links: { comments: 'someLink' } });
  });

  run(function() {
    post.get('comments').then(function(comments) {
      equal(comments.get('isLoaded'), true, "comments are loaded");
      equal(comments.get('length'), 2, "comments have 2 length");

      var newComment = post.get('comments').createRecord({ body: 'Third' });
      equal(newComment.get('body'), 'Third', "new comment is returned");
      equal(comments.get('length'), 3, "comments have 3 length, including new record");
    });
  });
});

test("PromiseArray proxies evented methods to its ManyArray", function() {
  expect(6);

  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.findHasMany = function(store, record, link, relationship) {
    return Ember.RSVP.resolve([
      { id: 1, body: "First" },
      { id: 2, body: "Second" }
    ]);
  };
  var post, comments;

  run(function() {
    post = env.store.push('post', { id: 1, links: { comments: 'someLink' } });
    comments = post.get('comments');
  });


  comments.on('on-event', function() {
    ok(true);
  });

  run(function() {
    comments.trigger('on-event');
  });

  equal(comments.has('on-event'), true);

  comments.on('off-event', function() {
    ok(false);
  });

  comments.off('off-event');

  equal(comments.has('off-event'), false);

  comments.one('one-event', function() {
    ok(true);
  });

  equal(comments.has('one-event'), true);

  run(function() {
    comments.trigger('one-event');
  });

  equal(comments.has('one-event'), false);
});

test("An updated `links` value should invalidate a relationship cache", function() {
  expect(8);
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.findHasMany = function(store, record, link, relationship) {
    equal(relationship.type.typeKey, "comment", "relationship was passed correctly");

    if (link === '/first') {
      return Ember.RSVP.resolve([
        { id: 1, body: "First" },
        { id: 2, body: "Second" }
      ]);
    } else if (link === '/second') {
      return Ember.RSVP.resolve([
        { id: 3, body: "Third" },
        { id: 4, body: "Fourth" },
        { id: 5, body: "Fifth" }
      ]);
    }
  };
  var post;

  run(function() {
    post = env.store.push('post', { id: 1, links: { comments: '/first' } });
  });

  run(function() {
    post.get('comments').then(function(comments) {
      equal(comments.get('isLoaded'), true, "comments are loaded");
      equal(comments.get('length'), 2, "comments have 2 length");
      equal(comments.objectAt(0).get('body'), 'First', "comment 1 successfully loaded");
      env.store.push('post', { id: 1, links: { comments: '/second' } });
      post.get('comments').then(function(newComments) {
        equal(comments, newComments, "hasMany array was kept the same");
        equal(newComments.get('length'), 3, "comments updated successfully");
        equal(newComments.objectAt(0).get('body'), 'Third', "third comment loaded successfully");
      });
    });
  });
});

test("When a polymorphic hasMany relationship is accessed, the adapter's findMany method should not be called if all the records in the relationship are already loaded", function() {
  expect(1);

  env.adapter.findMany = function() {
    ok(false, "The adapter's find method should not be called");
  };

  run(function() {
    env.store.push('user', { id: 1, messages: [{ id: 1, type: 'post' }, { id: 3, type: 'comment' }] });
    env.store.push('post', { id: 1 });
    env.store.push('comment', { id: 3 });
  });

  run(function() {
    env.store.find('user', 1).then(function(user) {
      var messages = user.get('messages');
      equal(messages.get('length'), 2, "The messages are correctly loaded");
    });
  });
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

  run(function() {
    env.store.push('user', { id: 1, messages: [{ id: 1, type: 'post' }, { id: 3, type: 'comment' }] });
  });

  run(function() {
    env.store.find('user', 1).then(function(user) {
      return user.get('messages');
    }).then(function(messages) {
      equal(messages.get('length'), 2, "The messages are correctly loaded");
    });
  });
});

test("polymorphic hasMany type-checks check the superclass when MODEL_FACTORY_INJECTIONS is enabled", function() {
  expect(1);

  var injectionValue = Ember.MODEL_FACTORY_INJECTIONS;
  Ember.MODEL_FACTORY_INJECTIONS = true;

  try {
    run(function () {
      var igor = env.store.createRecord('user', { name: 'Igor' });
      var comment = env.store.createRecord('comment', { body: "Well I thought the title was fine" });

      igor.get('messages').addObject(comment);

      equal(igor.get('messages.firstObject.body'), "Well I thought the title was fine");
    });
  } finally {
    Ember.MODEL_FACTORY_INJECTIONS = injectionValue;
  }
});



test("Type can be inferred from the key of a hasMany relationship", function() {
  expect(1);
  run(function() {
    env.store.push('user', { id: 1, contacts: [1] });
    env.store.push('contact', { id: 1 });
  });
  run(function() {
    env.store.find('user', 1).then(function(user) {
      return user.get('contacts');
    }).then(function(contacts) {
      equal(contacts.get('length'), 1, "The contacts relationship is correctly set up");
    });
  });
});

test("Type can be inferred from the key of an async hasMany relationship", function() {
  User.reopen({
    contacts: DS.hasMany({ async: true })
  });

  expect(1);
  run(function() {
    env.store.push('user', { id: 1, contacts: [1] });
    env.store.push('contact', { id: 1 });
  });
  run(function() {
    env.store.find('user', 1).then(function(user) {
      return user.get('contacts');
    }).then(function(contacts) {
      equal(contacts.get('length'), 1, "The contacts relationship is correctly set up");
    });
  });
});

test("Polymorphic relationships work with a hasMany whose type is inferred", function() {
  User.reopen({
    contacts: DS.hasMany({ polymorphic: true })
  });

  expect(1);
  run(function() {
    env.store.push('user', { id: 1, contacts: [{ id: 1, type: 'email' }, { id: 2, type: 'phone' }] });
    env.store.push('email', { id: 1 });
    env.store.push('phone', { id: 2 });
  });
  run(function() {
    env.store.find('user', 1).then(function(user) {
      return user.get('contacts');
    }).then(function(contacts) {
      equal(contacts.get('length'), 2, "The contacts relationship is correctly set up");
    });
  });
});

test("Polymorphic relationships with a hasMany is set up correctly on both sides", function() {
  expect(2);

  Contact.reopen({
    posts: DS.hasMany('post')
  });

  Post.reopen({
    contact: DS.belongsTo('contact', { polymorphic: true })
  });
  var email, post;

  run(function () {
    email = env.store.createRecord('email');
    post = env.store.createRecord('post', {
      contact: email
    });
  });

  equal(post.get('contact'), email, 'The polymorphic belongsTo is set up correctly');
  equal(get(email, 'posts.length'), 1, "The inverse has many is set up correctly on the email side.");
});

test("A record can't be created from a polymorphic hasMany relationship", function() {
  run(function() {
    env.store.push('user', { id: 1, messages: [] });
  });

  run(function() {
    env.store.find('user', 1).then(function(user) {
      return user.get('messages');
    }).then(function(messages) {
      expectAssertion(function() {
        messages.createRecord();
      }, /You cannot add 'message' records to this polymorphic relationship/);
    });
  });
});

test("Only records of the same type can be added to a monomorphic hasMany relationship", function() {
  expect(1);
  run(function() {
    env.store.push('post', { id: 1, comments: [] });
    env.store.push('post', { id: 2 });
  });

  run(function() {
    Ember.RSVP.all([
      env.store.find('post', 1),
      env.store.find('post', 2)
    ]).then(function(records) {
      expectAssertion(function() {
        records[0].get('comments').pushObject(records[1]);
      }, /You cannot add 'post' records to the post.comments relationship \(only 'comment' allowed\)/);
    });
  });
});

test("Only records of the same base type can be added to a polymorphic hasMany relationship", function() {
  expect(2);
  run(function() {
    env.store.push('user', { id: 1, messages: [] });
    env.store.push('user', { id: 2, messages: [] });
    env.store.push('post', { id: 1, comments: [] });
    env.store.push('comment', { id: 3 });
  });
  var asyncRecords;

  run(function() {
    asyncRecords = Ember.RSVP.hash({
      user: env.store.find('user', 1),
      anotherUser: env.store.find('user', 2),
      post: env.store.find('post', 1),
      comment: env.store.find('comment', 3)
    });

    asyncRecords.then(function(records) {
      records.messages = records.user.get('messages');
      return Ember.RSVP.hash(records);
    }).then(function(records) {
      records.messages.pushObject(records.post);
      records.messages.pushObject(records.comment);
      equal(records.messages.get('length'), 2, "The messages are correctly added");

      expectAssertion(function() {
        records.messages.pushObject(records.anotherUser);
      }, /You cannot add 'user' records to the user.messages relationship \(only 'message' allowed\)/);
    });
  });
});

test("A record can be removed from a polymorphic association", function() {
  expect(3);

  run(function() {
    env.store.push('user', { id: 1 , messages: [{ id: 3, type: 'comment' }] });
    env.store.push('comment', { id: 3 });
  });
  var asyncRecords;

  run(function() {
    asyncRecords = Ember.RSVP.hash({
      user: env.store.find('user', 1),
      comment: env.store.find('comment', 3)
    });

    asyncRecords.then(function(records) {
      records.messages = records.user.get('messages');
      return Ember.RSVP.hash(records);
    }).then(function(records) {
      equal(records.messages.get('length'), 1, "The user has 1 message");

      var removedObject = records.messages.popObject();

      equal(removedObject, records.comment, "The message is correctly removed");
      equal(records.messages.get('length'), 0, "The user does not have any messages");
    });
  });
});

test("When a record is created on the client, its hasMany arrays should be in a loaded state", function() {
  expect(3);

  var post;

  run(function() {
    post = env.store.createRecord('post');
  });

  ok(get(post, 'isLoaded'), "The post should have isLoaded flag");
  var comments;
  run(function() {
    comments = get(post, 'comments');
  });

  equal(get(comments, 'length'), 0, "The comments should be an empty array");

  ok(get(comments, 'isLoaded'), "The comments should have isLoaded flag");
});

test("When a record is created on the client, its async hasMany arrays should be in a loaded state", function() {
  expect(4);

  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  var post = run(function() {
    return env.store.createRecord('post');
  });

  ok(get(post, 'isLoaded'), "The post should have isLoaded flag");

  run(function() {
    get(post, 'comments').then(function(comments) {
      ok(true, "Comments array successfully resolves");
      equal(get(comments, 'length'), 0, "The comments should be an empty array");
      ok(get(comments, 'isLoaded'), "The comments should have isLoaded flag");
    });
  });
});

test("a records SYNC HM relationship property is readOnly", function() {
  expect(1);
  var post = run(function() {
    return env.store.createRecord('post');
  });

  raises(function() {
    post.set('comments');
  }, 'Cannot Set: comments on: ' + Ember.inspect(post));
});


test("a records ASYNC HM relationship property is readOnly", function() {
  expect(1);
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  var post = run(function() {
    return env.store.createRecord('post');
  });

  raises(function() {
    run(post, 'set', 'comments');
  }, 'Cannot Set: comments on: ' + Ember.inspect(post));
});

test("When a record is saved, its unsaved hasMany records should be kept", function () {
  expect(1);

  var post, comment;

  env.adapter.createRecord = function(store, type, record) {
    return Ember.RSVP.resolve({ id: 1 });
  };

  run(function () {
    post = env.store.createRecord('post');
    comment = env.store.createRecord('comment');
    post.get('comments').pushObject(comment);
    post.save();
  });

  equal(get(post, 'comments.length'), 1, "The unsaved comment should be in the post's comments array");
});

test("dual non-async HM <-> BT", function() {
  Post.reopen({
    comments: DS.hasMany('comment', { inverse: 'post' })
  });

  Comment.reopen({
    post: DS.belongsTo('post')
  });

  env.adapter.createRecord = function(store, type, record) {
    var data = record.serialize();
    data.id = 2;
    return Ember.RSVP.resolve(data);
  };
  var post, firstComment;

  run(function() {
    post = env.store.push('post', { id: 1, comments: [1] });
    firstComment = env.store.push('comment', { id: 1, post: 1 });

    env.store.createRecord('comment', {
      post: post
    }).save().then(function(comment) {
      var commentPost = comment.get('post');
      var postComments = comment.get('post.comments');
      var postCommentsLength = comment.get('post.comments.length');

      deepEqual(post, commentPost, 'expect the new comments post, to be the correct post');
      ok(postComments, "comments should exist");
      equal(postCommentsLength, 2, "comment's post should have a reference back to comment");
      ok(postComments && postComments.indexOf(firstComment) !== -1, 'expect to contain first comment');
      ok(postComments && postComments.indexOf(comment) !== -1, 'expected to contain the new comment');
    });
  });
});

test("When an unloaded record is added to the hasMany, it gets fetched once the hasMany is accessed even if the hasMany has been already fetched", function() {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.findMany = function() {
    return resolve([{ id: 1, body: 'first' }, { id: 2, body: 'second' }]);
  };

  env.adapter.find = function() {
    return resolve({ id: 3, body: 'third' });
  };
  var post;

  run(function() {
    post = env.store.push('post', { id: 1, comments: [1, 2] });
  });

  run(function() {
    post.get('comments').then(async(function(fetchedComments) {
      equal(fetchedComments.get('length'), 2, 'comments fetched successfully');
      equal(fetchedComments.objectAt(0).get('body'), 'first', 'first comment loaded successfully');
      env.store.push('post', { id: 1, comments: [1, 2, 3] });
      post.get('comments').then(async(function(newlyFetchedComments) {
        equal(newlyFetchedComments.get('length'), 3, 'all three comments fetched successfully');
        equal(newlyFetchedComments.objectAt(2).get('body'), 'third', 'third comment loaded successfully');
      }));
    }));
  });
});

test("A sync hasMany errors out if there are unlaoded records in it", function() {
  var post;
  run(function() {
    post = env.store.push('post', { id: 1, comments: [1, 2] });
  });

  expectAssertion(function() {
    run(post, 'get', 'comments');
  }, /You looked up the 'comments' relationship on a 'post' with id 1 but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async \(`DS.hasMany\({ async: true }\)`\)/);
});

test("If reordered hasMany data has been pushed to the store, the many array reflects the ordering change - sync", function() {
  var comment1, comment2, comment3, comment4;
  var post;
  run(function() {
    comment1 = env.store.push('comment', { id: 1 });
    comment2 = env.store.push('comment', { id: 2 });
    comment3 = env.store.push('comment', { id: 3 });
    comment4 = env.store.push('comment', { id: 4 });
  });

  run(function() {
    post = env.store.push('post', { id: 1, comments: [1, 2] });
  });
  deepEqual(post.get('comments').toArray(), [comment1, comment2], 'Initial ordering is correct');

  run(function() {
    env.store.push('post', { id: 1, comments: [2, 1] });
  });
  deepEqual(post.get('comments').toArray(), [comment2, comment1], 'Updated ordering is correct');

  run(function() {
    env.store.push('post', { id: 1, comments: [2] });
  });
  deepEqual(post.get('comments').toArray(), [comment2], 'Updated ordering is correct');

  run(function() {
    env.store.push('post', { id: 1, comments: [1,2,3,4] });
  });
  deepEqual(post.get('comments').toArray(), [comment1, comment2, comment3, comment4], 'Updated ordering is correct');

  run(function() {
    env.store.push('post', { id: 1, comments: [4,3] });
  });
  deepEqual(post.get('comments').toArray(), [comment4, comment3], 'Updated ordering is correct');

  run(function() {
    env.store.push('post', { id: 1, comments: [4,2,3,1] });
  });
  deepEqual(post.get('comments').toArray(), [comment4, comment2, comment3, comment1], 'Updated ordering is correct');
});

test("Rollbacking a deleted record restores implicit relationship correctly when the hasMany side has been deleted - async", function () {
  var book, chapter;
  run(function() {
    book = env.store.push('book', { id: 1, title: "Stanley's Amazing Adventures", chapters: [2] });
    chapter = env.store.push('chapter', { id: 2, title: 'Sailing the Seven Seas' });
  });
  run(function() {
    chapter.deleteRecord();
    chapter.rollback();
  });
  run(function() {
    book.get('chapters').then(function(fetchedChapters) {
      equal(fetchedChapters.objectAt(0), chapter, 'Book has a chapter after rollback');
    });
  });
});

test("Rollbacking a deleted record restores implicit relationship correctly when the hasMany side has been deleted - sync", function () {
  var book, chapter;
  run(function() {
    book = env.store.push('book', { id: 1, title: "Stanley's Amazing Adventures", chapters: [2] });
    chapter = env.store.push('chapter', { id: 2, title: 'Sailing the Seven Seas' });
  });
  run(function() {
    chapter.deleteRecord();
    chapter.rollback();
  });
  run(function() {
    equal(book.get('chapters.firstObject'), chapter, "Book has a chapter after rollback");
  });
});

test("Rollbacking a deleted record restores implicit relationship correctly when the belongsTo side has been deleted - async", function () {
  Page.reopen({
    chapter: DS.belongsTo('chapter', { async: true })
  });
  var chapter, page;
  run(function() {
    chapter = env.store.push('chapter', { id: 2, title: 'Sailing the Seven Seas' });
    page = env.store.push('page', { id: 3, number: 1, chapter: 2 });
  });
  run(function() {
    chapter.deleteRecord();
    chapter.rollback();
  });
  run(function() {
    page.get('chapter').then(function(fetchedChapter) {
      equal(fetchedChapter, chapter, 'Page has a chapter after rollback');
    });
  });
});

test("Rollbacking a deleted record restores implicit relationship correctly when the belongsTo side has been deleted - sync", function () {
  var chapter, page;
  run(function() {
    chapter = env.store.push('chapter', { id: 2, title: 'Sailing the Seven Seas' });
    page = env.store.push('page', { id: 3, number: 1, chapter: 2 });
  });
  run(function() {
    chapter.deleteRecord();
    chapter.rollback();
  });
  run(function() {
    equal(page.get('chapter'), chapter, "Page has a chapter after rollback");
  });
});

test("ManyArray notifies the array observers and flushes bindings when removing", function () {
  expect(2);
  var chapter, page, page2;
  var observe = false;

  run(function() {
    page = env.store.push('page', { id: 1, number: 1 });
    page2 = env.store.push('page', { id: 2, number: 2 });
    chapter = env.store.push('chapter', { id: 1, title: 'Sailing the Seven Seas', pages: [1, 2] });
    chapter.get('pages').addEnumerableObserver(this, {
      willChange: function(pages, removing, addCount) {
        if (observe) {
          equal(removing[0], page2, 'page2 is passed to willChange');
        }
      },
      didChange: function(pages, removeCount, adding) {
        if (observe) {
          equal(removeCount, 1, 'removeCount is correct');
        }
      }
    });
  });
  run(function() {
    observe = true;
    page2.set('chapter', null);
    observe = false;
  });
});

test("ManyArray notifies the array observers and flushes bindings when adding", function () {
  expect(2);
  var chapter, page, page2;
  var observe = false;

  run(function() {
    page = env.store.push('page', { id: 1, number: 1 });
    page2 = env.store.push('page', { id: 2, number: 2 });
    chapter = env.store.push('chapter', { id: 1, title: 'Sailing the Seven Seas', pages: [1] });
    chapter.get('pages').addEnumerableObserver(this, {
      willChange: function(pages, removing, addCount) {
        if (observe) {
          equal(addCount, 1, 'addCount is correct');
        }
      },
      didChange: function(pages, removeCount, adding) {
        if (observe) {
          equal(adding[0], page2, 'page2 is passed to didChange');
        }
      }
    });
  });
  run(function() {
    observe = true;
    page2.set('chapter', chapter);
    observe = false;
  });
});

test("Passing a model as type to hasMany should not work", function () {
  expect(1);

  expectAssertion(function() {
    User = DS.Model.extend();

    Contact = DS.Model.extend({
      users: hasMany(User)
    });
  }, /The first argument to DS.hasMany must be a string/);
});

test("Relationship.clear removes all records correctly", function() {
  var post;

  Comment.reopen({
    post: DS.belongsTo('post')
  });

  Post.reopen({
    comments: DS.hasMany('comment', { inverse: 'post' })
  });

  run(function() {
    post = env.store.push('post', { id: 2, title: 'Sailing the Seven Seas', comments: [1, 2] });
    env.store.pushMany('comment', [
      { id: 1, post: 2 },
      { id: 2, post: 2 },
      { id: 3, post: 2 }
    ]);
  });

  run(function() {
    post._relationships['comments'].clear();
    var comments = Ember.A(env.store.all('comment'));
    deepEqual(comments.mapBy('post'), [null, null, null]);
  });

});


test('unloading a record with associated records does not prevent the store from tearing down', function() {
  var post;

  Comment.reopen({
    post: DS.belongsTo('post')
  });

  Post.reopen({
    comments: DS.hasMany('comment', { inverse: 'post' })
  });

  run(function() {
    post = env.store.push('post', { id: 2, title: 'Sailing the Seven Seas', comments: [1,2] });
    env.store.pushMany('comment', [
      { id: 1, post: 2 },
      { id: 2, post: 2 }
    ]);

    // This line triggers the original bug that gets manifested
    // in teardown for apps, e.g. store.destroy that is caused by
    // App.destroy().
    // Relationship#clear uses Ember.Set#forEach, which does incorrect
    // iteration when the set is being mutated (in our case, the index gets off
    // because records are being removed)
    env.store.unloadRecord(post);
  });
  try {
    run(function() {
      env.store.destroy();
    });
    ok(true, "store destroyed correctly");
  } catch (error) {
    ok(false, "store prevented from being destroyed");
  }
});
