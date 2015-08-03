var env, store, User, Contact, Email, Phone, Message, Post, Comment;
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
      messages: hasMany('message', { polymorphic: true, async: false }),
      contacts: hasMany('user', { inverse: null, async: false })
    });

    Contact = DS.Model.extend({
      user: belongsTo('user', { async: false })
    });

    Email = Contact.extend({
      email: attr('string')
    });

    Phone = Contact.extend({
      number: attr('string')
    });

    Message = DS.Model.extend({
      user: belongsTo('user', { async: false }),
      created_at: attr('date')
    });
    Message.toString = stringify('Message');

    Post = Message.extend({
      title: attr('string'),
      comments: hasMany('comment', { async: false })
    });
    Post.toString = stringify('Post');

    Comment = Message.extend({
      body: DS.attr('string'),
      message: DS.belongsTo('post', { polymorphic: true, async: true })
    });
    Comment.toString = stringify('Comment');

    Book = DS.Model.extend({
      title: attr(),
      chapters: hasMany('chapter', { async: true })
    });
    Book.toString = stringify('Book');

    Chapter = DS.Model.extend({
      title: attr(),
      pages: hasMany('page', { async: false })
    });
    Chapter.toString = stringify('Chapter');

    Page = DS.Model.extend({
      number: attr('number'),
      chapter: belongsTo('chapter', { async: false })
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

    store = env.store;
  },

  teardown: function() {
    run(env.container, 'destroy');
  }
});

test("When a hasMany relationship is accessed, the adapter's findMany method should not be called if all the records in the relationship are already loaded", function() {
  expect(0);

  env.adapter.findMany = function(store, type, ids, snapshots) {
    ok(false, "The adapter's find method should not be called");
  };

  env.adapter.findRecord = function(store, type, ids, snapshots) {
    return { id: 1, comments: [1] };
  };

  run(function() {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' }
            ]
          }
        }
      },
      included: [{
        type: 'comment',
        id: '1'
      }]
    });
    env.store.findRecord('post', 1).then(function(post) {
      return post.get('comments');
    });
  });
});

test("adapter.findMany only gets unique IDs even if duplicate IDs are present in the hasMany relationship", function() {
  expect(2);

  env.adapter.findMany = function(store, type, ids, snapshots) {
    equal(type, Chapter, 'type passed to adapter.findMany is correct');
    deepEqual(ids, ['2', '3'], 'ids passed to adapter.findMany are unique');

    return Ember.RSVP.resolve([
      { id: 2, title: 'Chapter One' },
      { id: 3, title: 'Chapter Two' }
    ]);
  };

  env.adapter.findRecord = function(store, type, ids, snapshots) {
    return { id: 1, chapters: [2, 3, 3] };
  };

  run(function() {
    env.store.push({
      data: {
        type: 'book',
        id: '1',
        relationships: {
          chapters: {
            data: [
              { type: 'chapter', id: '2' },
              { type: 'chapter', id: '3' },
              { type: 'chapter', id: '3' }
            ]
          }
        }
      }
    });
    env.store.findRecord('book', 1).then(function(book) {
      return book.get('chapters');
    });
  });
});

// This tests the case where a serializer materializes a has-many
// relationship as a internalModel that it can fetch lazily. The most
// common use case of this is to provide a URL to a collection that
// is loaded later.
test("A serializer can materialize a hasMany as an opaque token that can be lazily fetched via the adapter's findHasMany hook", function() {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  // When the store asks the adapter for the record with ID 1,
  // provide some fake data.
  env.adapter.findRecord = function(store, type, id, snapshot) {
    equal(type, Post, "find type was Post");
    equal(id, "1", "find id was 1");

    return Ember.RSVP.resolve({ id: 1, links: { comments: "/posts/1/comments" } });
  };

  env.adapter.findMany = function(store, type, ids, snapshots) {
    throw new Error("Adapter's findMany should not be called");
  };

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    equal(link, "/posts/1/comments", "findHasMany link was /posts/1/comments");
    equal(relationship.type, "comment", "relationship was passed correctly");

    return Ember.RSVP.resolve([
      { id: 1, body: "First" },
      { id: 2, body: "Second" }
    ]);
  };

  run(function() {
    env.store.findRecord('post', 1).then(async(function(post) {
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
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            links: {
              related: '/posts/1/comments'
            }
          }
        }
      }
    });
    post = env.store.peekRecord('post', 1);
  });

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
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
    env.store.push({
      data: {
        type: 'comment',
        id: '1',
        relationships: {
          message: {
            data: { type: 'post', id: '1' }
          }
        }
      }
    });
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

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    return Ember.RSVP.resolve([
      { id: 1, body: "First" },
      { id: 2, body: "Second" }
    ]);
  };
  var post;
  run(function() {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            links: {
              related: '/posts/1/comments'
            }
          }
        }
      }
    });
    post = env.store.peekRecord('post', 1);
  });

  run(function() {
    post.get('comments').then(function() {
      env.store.push({
        data: {
          type: 'comment',
          id: '3',
          relationships: {
            message: {
              data: { type: 'post', id: '1' }
            }
          }
        }
      });
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

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    return Ember.RSVP.resolve([]);
  };

  env.adapter.createRecord = function(store, snapshot, link, relationship) {
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

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    return Ember.RSVP.resolve([{ id: 5, body: 'hello' }]);
  };

  env.adapter.createRecord = function(store, snapshot, link, relationship) {
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

  env.adapter.findRecord = function(store, type, id, snapshot) {
    equal(type, Post, "find type was Post");
    equal(id, "1", "find id was 1");

    return Ember.RSVP.resolve({ id: 1, links: { comments: "/posts/1/comments" } });
  };

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    equal(relationship.type, 'comment', "findHasMany relationship type was Comment");
    equal(relationship.key, 'comments', "findHasMany relationship key was comments");
    equal(link, "/posts/1/comments", "findHasMany link was /posts/1/comments");

    return Ember.RSVP.resolve([
      { id: 1, body: "First" },
      { id: 2, body: "Second" }
    ]);
  };

  run(function() {
    run(env.store, 'findRecord', 'post', 1).then(function(post) {
      return post.get('comments');
    }).then(function(comments) {
      equal(comments.get('isLoaded'), true, "comments are loaded");
      equal(comments.get('length'), 2, "comments have 2 length");

      env.adapter.findHasMany = function(store, snapshot, link, relationship) {
        equal(relationship.type, 'comment', "findHasMany relationship type was Comment");
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
    comments: DS.hasMany('comment', { async: false })
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    equal(type, Post, "find type was Post");
    equal(id, "1", "find id was 1");

    return Ember.RSVP.resolve({ id: 1, comments: [1, 2] });
  };

  run(function() {
    env.store.push({
      data: [{
        type: 'comment',
        id: '1',
        attributes: {
          body: 'First'
        }
      }, {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'Second'
        }
      }]
    });

    env.store.findRecord('post', '1').then(function(post) {
      var comments = post.get('comments');
      equal(comments.get('isLoaded'), true, "comments are loaded");
      equal(comments.get('length'), 2, "comments have a length of 2");

      env.adapter.findMany = function(store, type, ids, snapshots) {
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

  env.adapter.findRecord = function(store, type, id, snapshot) {
    equal(type, Post, "find type was Post");
    equal(id, "1", "find id was 1");

    return Ember.RSVP.resolve({ id: 1, comments: [1,2] });
  };

  env.adapter.findMany = function(store, type, ids, snapshots) {
    return Ember.RSVP.resolve([
      { id: 1, body: "First" },
      { id: 2, body: "Second" }
    ]);
  };

  run(function() {
    env.store.findRecord('post', 1).then(function(post) {
      return post.get('comments');
    }).then(function(comments) {
      equal(comments.get('isLoaded'), true, "comments are loaded");
      equal(comments.get('length'), 2, "comments have 2 length");

      env.adapter.findMany = function(store, type, ids, snapshots) {
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

  env.adapter.findRecord = function(store, type, id, snapshot) {
    equal(type, Post, "find type was Post");
    equal(id, "1", "find id was 1");

    return Ember.RSVP.resolve({ id: 1, comments: [1,2] });
  };

  env.adapter.findMany = function(store, type, ids, snapshots) {
    return Ember.RSVP.resolve([
      { id: 1, body: "FirstUpdated" },
      { id: 2, body: "Second" }
    ]);
  };

  run(function() {
    env.store.findRecord('post', 1).then(function(post) {
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

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    return Ember.RSVP.resolve([
      { id: 1, body: "First" },
      { id: 2, body: "Second" }
    ]);
  };
  var post;

  run(function() {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            links: {
              related: 'someLink'
            }
          }
        }
      }
    });
    post = env.store.peekRecord('post', 1);
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

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    return Ember.RSVP.resolve([
      { id: 1, body: "First" },
      { id: 2, body: "Second" }
    ]);
  };
  var post, comments;

  run(function() {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            links: {
              related: 'someLink'
            }
          }
        }
      }
    });
    post = env.store.peekRecord('post', 1);
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

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    equal(relationship.type, "comment", "relationship was passed correctly");

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
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            links: {
              related: '/first'
            }
          }
        }
      }
    });
    post = env.store.peekRecord('post', 1);
  });

  run(function() {
    post.get('comments').then(function(comments) {
      equal(comments.get('isLoaded'), true, "comments are loaded");
      equal(comments.get('length'), 2, "comments have 2 length");
      equal(comments.objectAt(0).get('body'), 'First', "comment 1 successfully loaded");
      env.store.push({
        data: {
          type: 'post',
          id: '1',
          relationships: {
            comments: {
              links: {
                related: '/second'
              }
            }
          }
        }
      });
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

  env.adapter.findMany = function(store, type, ids, snapshots) {
    ok(false, "The adapter's find method should not be called");
  };

  env.adapter.findRecord = function(store, type, ids, snapshots) {
    return { id: 1, messages: [{ id: 1, type: 'post' }, { id: 3, type: 'comment' }] };
  };

  run(function() {
    env.store.push({
      data: {
        type: 'user',
        id: '1',
        relationships: {
          messages: {
            data: [
              { type: 'post', id: '1' },
              { type: 'comment', id: '3' }
            ]
          }
        }
      },
      included: [{
        type: 'post',
        id: '1'
      }, {
        type: 'comment',
        id: '3'
      }]
    });
  });

  run(function() {
    env.store.findRecord('user', 1).then(function(user) {
      var messages = user.get('messages');
      equal(messages.get('length'), 2, "The messages are correctly loaded");
    });
  });
});

test("When a polymorphic hasMany relationship is accessed, the store can call multiple adapters' findMany or find methods if the records are not loaded", function() {
  User.reopen({
    messages: hasMany('message', { polymorphic: true, async: true })
  });
  env.adapter.shouldBackgroundReloadRecord = () => false;
  env.adapter.findRecord = function(store, type, id, snapshot) {
    if (type === Post) {
      return Ember.RSVP.resolve({ id: 1 });
    } else if (type === Comment) {
      return Ember.RSVP.resolve({ id: 3 });
    }
  };

  run(function() {
    env.store.push({
      data: {
        type: 'user',
        id: '1',
        relationships: {
          messages: {
            data: [
              { type: 'post', id: '1' },
              { type: 'comment', id: '3' }
            ]
          }
        }
      }
    });
  });

  run(function() {
    env.store.findRecord('user', 1).then(function(user) {
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

  env.adapter.findRecord = function(store, type, ids, snapshots) {
    return { id: 1, contacts: [1] };
  };

  run(function() {
    env.store.push({
      data: {
        type: 'user',
        id: '1',
        relationships: {
          contacts: {
            data: [
              { type: 'contact', id: '1' }
            ]
          }
        }
      },
      included: [{
        type: 'contact',
        id: '1'
      }]
    });
  });
  run(function() {
    env.store.findRecord('user', 1).then(function(user) {
      return user.get('contacts');
    }).then(function(contacts) {
      equal(contacts.get('length'), 1, "The contacts relationship is correctly set up");
    });
  });
});

test("Type can be inferred from the key of an async hasMany relationship", function() {
  expect(1);

  User.reopen({
    contacts: DS.hasMany({ async: true })
  });

  env.adapter.findRecord = function(store, type, ids, snapshots) {
    return { id: 1, contacts: [1] };
  };

  run(function() {
    env.store.push({
      data: {
        type: 'user',
        id: '1',
        relationships: {
          contacts: {
            data: [
              { type: 'contact', id: '1' }
            ]
          }
        }
      },
      included: [{
        type: 'contact',
        id: '1'
      }]
    });
  });
  run(function() {
    env.store.findRecord('user', 1).then(function(user) {
      return user.get('contacts');
    }).then(function(contacts) {
      equal(contacts.get('length'), 1, "The contacts relationship is correctly set up");
    });
  });
});

test("Polymorphic relationships work with a hasMany whose type is inferred", function() {
  User.reopen({
    contacts: DS.hasMany({ polymorphic: true, async: false })
  });

  env.adapter.findRecord = function(store, type, ids, snapshots) {
    return { id: 1 };
  };

  expect(1);
  run(function() {
    env.store.push({
      data: {
        type: 'user',
        id: '1',
        relationships: {
          contacts: {
            data: [
              { type: 'email', id: '1' },
              { type: 'phone', id: '2' }
            ]
          }
        }
      },
      included: [{
        type: 'email',
        id: '1'
      }, {
        type: 'phone',
        id: '2'
      }]
    });
  });
  run(function() {
    env.store.findRecord('user', 1).then(function(user) {
      return user.get('contacts');
    }).then(function(contacts) {
      equal(contacts.get('length'), 2, "The contacts relationship is correctly set up");
    });
  });
});

test("Polymorphic relationships with a hasMany is set up correctly on both sides", function() {
  expect(2);

  Contact.reopen({
    posts: DS.hasMany('post', { async: false })
  });

  Post.reopen({
    contact: DS.belongsTo('contact', { polymorphic: true, async: false })
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
  env.adapter.shouldBackgroundReloadRecord = () => false;
  run(function() {
    env.store.push({
      data: {
        type: 'user',
        id: '1',
        relationships: {
          messages: {
            data: []
          }
        }
      }
    });
  });

  run(function() {
    env.store.findRecord('user', 1).then(function(user) {
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
  env.adapter.shouldBackgroundReloadRecord = () => false;
  run(function() {
    env.store.push({
      data: [{
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: []
          }
        }
      }, {
        type: 'post',
        id: '2'
      }]
    });
  });

  run(function() {
    Ember.RSVP.all([
      env.store.findRecord('post', 1),
      env.store.findRecord('post', 2)
    ]).then(function(records) {
      expectAssertion(function() {
        records[0].get('comments').pushObject(records[1]);
      }, /You cannot add a record of type 'post' to the 'post.comments' relationship \(only 'comment' allowed\)/);
    });
  });
});

test("Only records of the same base type can be added to a polymorphic hasMany relationship", function() {
  expect(2);
  env.adapter.shouldBackgroundReloadRecord = () => false;
  run(function() {
    env.store.push({
      data: [{
        type: 'user',
        id: '1',
        relationships: {
          messages: {
            data: []
          }
        }
      }, {
        type: 'user',
        id: '2',
        relationships: {
          messages: {
            data: []
          }
        }
      }],
      included: [{
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: []
          }
        }
      }, {
        type: 'comment',
        id: '3'
      }]
    });
  });
  var asyncRecords;

  run(function() {
    asyncRecords = Ember.RSVP.hash({
      user: env.store.findRecord('user', 1),
      anotherUser: env.store.findRecord('user', 2),
      post: env.store.findRecord('post', 1),
      comment: env.store.findRecord('comment', 3)
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
      }, /You cannot add a record of type 'user' to the 'user.messages' relationship \(only 'message' allowed\)/);
    });
  });
});

test("A record can be removed from a polymorphic association", function() {
  expect(4);
  env.adapter.shouldBackgroundReloadRecord = () => false;
  run(function() {
    env.store.push({
      data: {
        type: 'user',
        id: '1',
        relationships: {
          messages: {
            data: [
              { type: 'comment', id: '3' }
            ]
          }
        }
      },
      included: [{
        type: 'comment',
        id: '3'
      }]
    });
  });
  var asyncRecords;

  run(function() {
    asyncRecords = Ember.RSVP.hash({
      user: env.store.findRecord('user', 1),
      comment: env.store.findRecord('comment', 3)
    });

    asyncRecords.then(function(records) {
      records.messages = records.user.get('messages');
      return Ember.RSVP.hash(records);
    }).then(function(records) {
      equal(records.messages.get('length'), 1, "The user has 1 message");

      var removedObject = records.messages.popObject();

      equal(removedObject, records.comment, "The message is correctly removed");
      equal(records.messages.get('length'), 0, "The user does not have any messages");
      equal(records.messages.objectAt(0), null, "No messages can't be fetched");
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

test("we can set records SYNC HM relationship", function() {
  expect(1);
  var post = run(function() {
    return env.store.createRecord('post');
  });
  run(function() {
    env.store.push({
      data: [{
        type: 'comment',
        id: '1',
        attributes: {
          body: 'First'
        }
      }, {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'Second'
        }
      }]
    });
    post.set('comments', env.store.peekAll('comment'));
  });
  equal(get(post, 'comments.length'), 2, "we can set HM relationship");
});


test("We can set records ASYNC HM relationship", function() {
  expect(1);
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  var post = run(function() {
    return env.store.createRecord('post');
  });
  run(function() {
    env.store.push({
      data: [{
        type: 'comment',
        id: '1',
        attributes: {
          body: 'First'
        }
      }, {
        type: 'comment',
        id: '2',
        attributes: {
          body: 'Second'
        }
      }]
    });
    post.set('comments', env.store.peekAll('comment'));
  });

  post.get('comments').then(async(function(comments) {
    equal(comments.get('length')  , 2, "we can set async HM relationship");
  }));
});

test("When a record is saved, its unsaved hasMany records should be kept", function () {
  expect(1);

  var post, comment;

  env.adapter.createRecord = function(store, type, snapshot) {
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
    comments: DS.hasMany('comment', { inverse: 'post', async: false })
  });

  Comment.reopen({
    post: DS.belongsTo('post', { async: false })
  });

  env.adapter.createRecord = function(store, type, snapshot) {
    var data = snapshot.record.serialize();
    data.id = 2;
    return Ember.RSVP.resolve(data);
  };
  var post, firstComment;

  run(function() {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' }
            ]
          }
        }
      }
    });
    env.store.push({
      data: {
        type: 'comment',
        id: '1',
        relationships: {
          comments: {
            post: { type: 'post', id: '1' }
          }
        }
      }
    });
    post = env.store.peekRecord('post', 1);
    firstComment = env.store.peekRecord('comment', 1);

    env.store.createRecord('comment', {
      post: post
    }).save().then(function(comment) {
      var commentPost = comment.get('post');
      var postComments = comment.get('post.comments');
      var postCommentsLength = comment.get('post.comments.length');

      deepEqual(post, commentPost, 'expect the new comments post, to be the correct post');
      ok(postComments, "comments should exist");
      equal(postCommentsLength, 2, "comment's post should have a internalModel back to comment");
      ok(postComments && postComments.indexOf(firstComment) !== -1, 'expect to contain first comment');
      ok(postComments && postComments.indexOf(comment) !== -1, 'expected to contain the new comment');
    });
  });
});

test("When an unloaded record is added to the hasMany, it gets fetched once the hasMany is accessed even if the hasMany has been already fetched", function() {
  Post.reopen({
    comments: DS.hasMany('comment', { async: true })
  });

  env.adapter.findMany = function(store, type, ids, snapshots) {
    return resolve([{ id: 1, body: 'first' }, { id: 2, body: 'second' }]);
  };

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return resolve({ id: 3, body: 'third' });
  };
  var post;

  run(function() {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' }
            ]
          }
        }
      }
    });
    post = env.store.peekRecord('post', 1);
  });

  run(function() {
    post.get('comments').then(async(function(fetchedComments) {
      equal(fetchedComments.get('length'), 2, 'comments fetched successfully');
      equal(fetchedComments.objectAt(0).get('body'), 'first', 'first comment loaded successfully');
      env.store.push({
        data: {
          type: 'post',
          id: '1',
          relationships: {
            comments: {
              data: [
                { type: 'comment', id: '1' },
                { type: 'comment', id: '2' },
                { type: 'comment', id: '3' }
              ]
            }
          }
        }
      });
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
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' }
            ]
          }
        }
      }
    });
    post = env.store.peekRecord('post', 1);
  });

  expectAssertion(function() {
    run(post, 'get', 'comments');
  }, /You looked up the 'comments' relationship on a 'post' with id 1 but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async \(`DS.hasMany\({ async: true }\)`\)/);
});

test("If reordered hasMany data has been pushed to the store, the many array reflects the ordering change - sync", function() {
  var comment1, comment2, comment3, comment4;
  var post;
  run(function() {
    env.store.push({
      data: [{
        type: 'comment',
        id: '1'
      }, {
        type: 'comment',
        id: '2'
      }, {
        type: 'comment',
        id: '3'
      }, {
        type: 'comment',
        id: '4'
      }]
    });

    comment1 = env.store.peekRecord('comment', 1);
    comment2 = env.store.peekRecord('comment', 2);
    comment3 = env.store.peekRecord('comment', 3);
    comment4 = env.store.peekRecord('comment', 4);
  });

  run(function() {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' }
            ]
          }
        }
      }
    });
    post = env.store.peekRecord('post', 1);
  });
  deepEqual(post.get('comments').toArray(), [comment1, comment2], 'Initial ordering is correct');

  run(function() {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '2' },
              { type: 'comment', id: '1' }
            ]
          }
        }
      }
    });
  });
  deepEqual(post.get('comments').toArray(), [comment2, comment1], 'Updated ordering is correct');

  run(function() {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '2' }
            ]
          }
        }
      }
    });
  });
  deepEqual(post.get('comments').toArray(), [comment2], 'Updated ordering is correct');

  run(function() {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' },
              { type: 'comment', id: '4' }
            ]
          }
        }
      }
    });
  });
  deepEqual(post.get('comments').toArray(), [comment1, comment2, comment3, comment4], 'Updated ordering is correct');

  run(function() {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '4' },
              { type: 'comment', id: '3' }
            ]
          }
        }
      }
    });
  });
  deepEqual(post.get('comments').toArray(), [comment4, comment3], 'Updated ordering is correct');

  run(function() {
    env.store.push({
      data: {
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '4' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' },
              { type: 'comment', id: '1' }
            ]
          }
        }
      }
    });
  });
  deepEqual(post.get('comments').toArray(), [comment4, comment2, comment3, comment1], 'Updated ordering is correct');
});

test("Rollbacking attributes for deleted record restores implicit relationship correctly when the hasMany side has been deleted - async", function () {
  var book, chapter;
  run(function() {
    env.store.push({
      data: {
        type: 'book',
        id: '1',
        attributes: {
          title: "Stanley's Amazing Adventures"
        },
        relationships: {
          chapters: {
            data: [
              { type: 'chapter', id: '2' }
            ]
          }
        }
      },
      included: [{
        type: 'chapter',
        id: '2',
        attributes: {
          title: 'Sailing the Seven Seas'
        }
      }]
    });
    book = env.store.peekRecord('book', 1);
    chapter = env.store.peekRecord('chapter', 2);
  });
  run(function() {
    chapter.deleteRecord();
    chapter.rollbackAttributes();
  });
  run(function() {
    book.get('chapters').then(function(fetchedChapters) {
      equal(fetchedChapters.objectAt(0), chapter, 'Book has a chapter after rollback attributes');
    });
  });
});

test("Rollbacking attributes for deleted record restores implicit relationship correctly when the hasMany side has been deleted - sync", function () {
  var book, chapter;
  run(function() {
    env.store.push({
      data: {
        type: 'book',
        id: '1',
        attributes: {
          title: "Stanley's Amazing Adventures"
        },
        relationships: {
          chapters: {
            data: [
              { type: 'chapter', id: '2' }
            ]
          }
        }
      },
      included: [{
        type: 'chapter',
        id: '2',
        attributes: {
          title: 'Sailing the Seven Seas'
        }
      }]
    });
    book = env.store.peekRecord('book', 1);
    chapter = env.store.peekRecord('chapter', 2);
  });
  run(function() {
    chapter.deleteRecord();
    chapter.rollbackAttributes();
  });
  run(function() {
    equal(book.get('chapters.firstObject'), chapter, "Book has a chapter after rollback attributes");
  });
});

test("Rollbacking attributes for deleted record restores implicit relationship correctly when the belongsTo side has been deleted - async", function () {
  Page.reopen({
    chapter: DS.belongsTo('chapter', { async: true })
  });
  var chapter, page;
  run(function() {
    env.store.push({
      data: {
        type: 'chapter',
        id: '2',
        attributes: {
          title: 'Sailing the Seven Seas'
        }
      },
      included: [{
        type: 'page',
        id: '3',
        attributes: {
          number: 1
        },
        relationships: {
          chapter: {
            data: { type: 'chapter', id: '2' }
          }
        }
      }]
    });
    chapter = env.store.peekRecord('chapter', 2);
    page = env.store.peekRecord('page', 3);
  });
  run(function() {
    chapter.deleteRecord();
    chapter.rollbackAttributes();
  });
  run(function() {
    page.get('chapter').then(function(fetchedChapter) {
      equal(fetchedChapter, chapter, 'Page has a chapter after rollback attributes');
    });
  });
});

test("Rollbacking attributes for deleted record restores implicit relationship correctly when the belongsTo side has been deleted - sync", function () {
  var chapter, page;
  run(function() {
    env.store.push({
      data: {
        type: 'chapter',
        id: '2',
        attributes: {
          title: 'Sailing the Seven Seas'
        }
      },
      included: [{
        type: 'page',
        id: '3',
        attributes: {
          number: 1
        },
        relationships: {
          chapter: {
            data: { type: 'chapter', id: '2' }
          }
        }
      }]
    });
    chapter = env.store.peekRecord('chapter', 2);
    page = env.store.peekRecord('page', 3);
  });
  run(function() {
    chapter.deleteRecord();
    chapter.rollbackAttributes();
  });
  run(function() {
    equal(page.get('chapter'), chapter, "Page has a chapter after rollback attributes");
  });
});

test("ManyArray notifies the array observers and flushes bindings when removing", function () {
  expect(2);
  var chapter, page, page2;
  var observe = false;

  run(function() {
    env.store.push({
      data: [{
        type: 'page',
        id: '1',
        attributes: {
          number: 1
        }
      }, {
        type: 'page',
        id: '2',
        attributes: {
          number: 2
        }
      }, {
        type: 'chapter',
        id: '1',
        attributes: {
          title: 'Sailing the Seven Seas'
        },
        relationships: {
          pages: {
            data: [
              { type: 'page', id: '1' },
              { type: 'page', id: '2' }
            ]
          }
        }
      }]
    });
    page = env.store.peekRecord('page', 1);
    page2 = env.store.peekRecord('page', 2);
    chapter = env.store.peekRecord('chapter', 1);

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
    env.store.push({
      data: [{
        type: 'page',
        id: '1',
        attributes: {
          number: 1
        }
      }, {
        type: 'page',
        id: '2',
        attributes: {
          number: 2
        }
      }, {
        type: 'chapter',
        id: '1',
        attributes: {
          title: 'Sailing the Seven Seas'
        },
        relationships: {
          pages: {
            data: [
              { type: 'page', id: '1' }
            ]
          }
        }
      }]
    });
    page = env.store.peekRecord('page', 1);
    page2 = env.store.peekRecord('page', 2);
    chapter = env.store.peekRecord('chapter', 1);

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
      users: hasMany(User, { async: false })
    });
  }, /The first argument to DS.hasMany must be a string/);
});

test("Relationship.clear removes all records correctly", function() {
  var post;

  Comment.reopen({
    post: DS.belongsTo('post', { async: false })
  });

  Post.reopen({
    comments: DS.hasMany('comment', { inverse: 'post', async: false })
  });

  run(function() {
    env.store.push({
      data: [{
        type: 'post',
        id: '2',
        attributes: {
          title: 'Sailing the Seven Seas'
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' }
            ]
          }
        }
      }, {
        type: 'comment',
        id: '1',
        relationships: {
          post: {
            data: { type: 'post', id: '2' }
          }
        }
      }, {
        type: 'comment',
        id: '2',
        relationships: {
          post: {
            data: { type: 'post', id: '2' }
          }
        }
      }, {
        type: 'comment',
        id: '3',
        relationships: {
          post: {
            data: { type: 'post', id: '2' }
          }
        }
      }]
    });
    post = env.store.peekRecord('post', 2);
  });

  run(function() {
    post._internalModel._relationships.get('comments').clear();
    var comments = Ember.A(env.store.peekAll('comment'));
    deepEqual(comments.mapBy('post'), [null, null, null]);
  });

});


test('unloading a record with associated records does not prevent the store from tearing down', function() {
  var post;

  Comment.reopen({
    post: DS.belongsTo('post', { async: false })
  });

  Post.reopen({
    comments: DS.hasMany('comment', { inverse: 'post', async: false })
  });

  run(function() {
    env.store.push({
      data: [{
        type: 'post',
        id: '2',
        attributes: {
          title: 'Sailing the Seven Seas'
        },
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' }
            ]
          }
        }
      }, {
        type: 'comment',
        id: '1',
        relationships: {
          post: {
            data: { type: 'post', id: '2' }
          }
        }
      }, {
        type: 'comment',
        id: '2',
        relationships: {
          post: {
            data: { type: 'post', id: '2' }
          }
        }
      }]
    });
    post = env.store.peekRecord('post', 2);

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

test("adding and removing records from hasMany relationship #2666", function() {
  expect(4);

  var Post = DS.Model.extend({
    comments: DS.hasMany('comment', { async: true })
  });

  var Comment = DS.Model.extend({
    post: DS.belongsTo('post', { async: false })
  });

  env = setupStore({
    post: Post,
    comment: Comment,
    adapter: DS.RESTAdapter.extend({
      shouldBackgroundReloadRecord: () => false
    })
  });

  env.registry.register('adapter:comment', DS.RESTAdapter.extend({
    deleteRecord: function(record) {
      return Ember.RSVP.resolve();
    },
    updateRecord: function(record) {
      return Ember.RSVP.resolve();
    },
    createRecord: function() {
      return Ember.RSVP.resolve();
    }
  }));

  run(function() {
    env.store.push({
      data: [{
        type: 'post',
        id: '1',
        relationships: {
          comments: {
            data: [
              { type: 'comment', id: '1' },
              { type: 'comment', id: '2' },
              { type: 'comment', id: '3' }
            ]
          }
        }
      }, {
        type: 'comment',
        id: '1'
      }, {
        type: 'comment',
        id: '2'
      }, {
        type: 'comment',
        id: '3'
      }]
    });
  });

  run(function() {
    stop();
    env.store.findRecord('post', 1).then(function (post) {
      var comments = post.get('comments');
      equal(comments.get('length'), 3, "Initial comments count");

      // Add comment #4
      var comment = env.store.createRecord('comment');
      comments.addObject(comment);
      return comment.save().then(function() {
        var comments = post.get('comments');
        equal(comments.get('length'), 4, "Comments count after first add");

        // Delete comment #4
        return comments.get('lastObject').destroyRecord();
      }).then(function() {
        var comments = post.get('comments');
        equal(comments.get('length'), 3, "Comments count after destroy");

        // Add another comment #4
        var comment = env.store.createRecord('comment');
        comments.addObject(comment);
        return comment.save();
      }).then(function() {
        var comments = post.get('comments');
        equal(comments.get('length'), 4, "Comments count after second add");
        start();
      });
    });
  });
});

test("hasMany hasData async loaded", function () {
  expect(1);

  Chapter.reopen({
    pages: hasMany('pages', { async: true })
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return Ember.RSVP.resolve({ id: 1, title: 'The Story Begins', pages: [2, 3] });
  };

  run(function() {
    store.findRecord('chapter', 1).then(function(chapter) {
      var relationship = chapter._internalModel._relationships.get('pages');
      equal(relationship.hasData, true, 'relationship has data');
    });
  });
});

test("hasMany hasData sync loaded", function () {
  expect(1);

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return Ember.RSVP.resolve({ id: 1, title: 'The Story Begins', pages: [2, 3] });
  };

  run(function() {
    store.findRecord('chapter', 1).then(function(chapter) {
      var relationship = chapter._internalModel._relationships.get('pages');
      equal(relationship.hasData, true, 'relationship has data');
    });
  });
});

test("hasMany hasData async not loaded", function () {
  expect(1);

  Chapter.reopen({
    pages: hasMany('pages', { async: true })
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return Ember.RSVP.resolve({ id: 1, title: 'The Story Begins', links: { pages: 'pages' } });
  };

  run(function() {
    store.findRecord('chapter', 1).then(function(chapter) {
      var relationship = chapter._internalModel._relationships.get('pages');
      equal(relationship.hasData, false, 'relationship does not have data');
    });
  });
});

test("hasMany hasData sync not loaded", function () {
  expect(1);

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return Ember.RSVP.resolve({ id: 1, title: 'The Story Begins' });
  };

  run(function() {
    store.findRecord('chapter', 1).then(function(chapter) {
      var relationship = chapter._internalModel._relationships.get('pages');
      equal(relationship.hasData, false, 'relationship does not have data');
    });
  });
});

test("hasMany hasData async created", function () {
  expect(1);

  Chapter.reopen({
    pages: hasMany('pages', { async: true })
  });

  run(function() {
    var chapter = store.createRecord('chapter', { title: 'The Story Begins' });
    var relationship = chapter._internalModel._relationships.get('pages');
    equal(relationship.hasData, true, 'relationship has data');
  });
});

test("hasMany hasData sync created", function () {
  expect(1);

  run(function() {
    var chapter = store.createRecord('chapter', { title: 'The Story Begins' });
    var relationship = chapter._internalModel._relationships.get('pages');
    equal(relationship.hasData, true, 'relationship has data');
  });
});

test("Model's hasMany relationship should not be created during model creation", function () {
  var user;
  run(function () {
    env.store.push({
      data: {
        type: 'user',
        id: '1'
      }
    });
    user = env.store.peekRecord('user', 1);
    ok(!user._internalModel._relationships.has('messages'), 'Newly created record should not have relationships');
  });
});

test("Model's belongsTo relationship should be created during 'get' method", function () {
  var user;
  run(function () {
    user = env.store.createRecord('user');
    user.get('messages');
    ok(user._internalModel._relationships.has('messages'), "Newly created record with relationships in params passed in its constructor should have relationships");
  });
});

test("metadata is accessible when pushed as a meta property for a relationship", function() {
  expect(1);
  var book;
  env.adapter.findHasMany = function() {
    return resolve({});
  };

  run(function() {
    env.store.push({
      data: {
        type: 'book',
        id: '1',
        attributes: {
          title: 'Sailing the Seven Seas'
        },
        relationships: {
          chapters: {
            meta: {
              where: 'the lefkada sea'
            },
            links: {
              related: '/chapters'
            }
          }
        }
      }
    });
    book = env.store.peekRecord('book', 1);
  });

  run(function() {
    equal(book._internalModel._relationships.get('chapters').meta.where, 'the lefkada sea', 'meta is there');
  });
});

test("metadata is accessible when return from a fetchLink", function() {
  expect(1);
  env.registry.register('serializer:application', DS.RESTSerializer);

  env.adapter.findHasMany = function() {
    return resolve({
      meta: {
        foo: 'bar'
      },
      chapters: [
        { id: '2' },
        { id: '3' }
      ]
    });
  };

  var book;

  run(function() {
    env.store.push({
      data: {
        type: 'book',
        id: '1',
        attributes: {
          title: 'Sailing the Seven Seas'
        },
        relationships: {
          chapters: {
            links: {
              related: '/chapters'
            }
          }
        }
      }
    });
    book = env.store.peekRecord('book', 1);
  });

  run(function() {
    book.get('chapters').then(function(chapters) {
      var meta = chapters.get('meta');
      equal(get(meta, 'foo'), 'bar', 'metadata is available');
    });
  });
});

test("metadata should be reset between requests", function() {
  var counter = 0;
  env.registry.register('serializer:application', DS.RESTSerializer);

  env.adapter.findHasMany = function() {
    var data = {
      meta: {
        foo: 'bar'
      },
      chapters: [
        { id: '2' },
        { id: '3' }
      ]
    };

    ok(true, 'findHasMany should be called twice');

    if (counter === 1) {
      delete data.meta;
    }

    counter++;

    return resolve(data);
  };

  var book1, book2;

  run(function() {
    env.store.push({
      data: [{
        type: 'book',
        id: '1',
        attributes: {
          title: 'Sailing the Seven Seas'
        },
        relationships: {
          chapters: {
            links: {
              related: 'chapters'
            }
          }
        }
      }, {
        type: 'book',
        id: '2',
        attributes: {
          title: 'Another book title'
        },
        relationships: {
          chapters: {
            links: {
              related: 'chapters'
            }
          }
        }
      }]
    });
    book1 = env.store.peekRecord('book', 1);
    book2 = env.store.peekRecord('book', 2);
  });

  run(function() {
    book1.get('chapters').then(function(chapters) {
      var meta = chapters.get('meta');
      equal(get(meta, 'foo'), 'bar', 'metadata should available');

      book2.get('chapters').then(function(chapters) {
        var meta = chapters.get('meta');
        equal(meta, undefined, 'metadata should not be available');
      });
    });
  });
});
