var env, store, User, Message, Post, Contact, Comment, Book, Chapter, Author, NewMessage;
var get = Ember.get;
var run = Ember.run;

var attr = DS.attr;
var hasMany = DS.hasMany;
var belongsTo = DS.belongsTo;
var hash = Ember.RSVP.hash;

// Before https://github.com/emberjs/ember.js/pull/10323 the computed
// property descriptor was stored on the ember meta object. After that
// pr it was moved to the ember object. This code normalized that
// lookup because the Ember Data ci tests run against diferent version
// of Ember. Once that code reaches the release branch this code can
// be removed.
function getComputedPropertyDesc(model, key) {
  if (Ember.meta(model).descs) {
    return Ember.meta(model).descs[key];
  }
  var possibleDesc = model[key];
  var desc = (possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor) ? possibleDesc : undefined;
  return desc;
}

module("integration/relationship/belongs_to Belongs-To Relationships", {
  setup: function() {
    User = DS.Model.extend({
      name: attr('string'),
      messages: hasMany('message', { polymorphic: true, async: false }),
      favouriteMessage: belongsTo('message', { polymorphic: true, inverse: null, async: false })
    });

    Message = DS.Model.extend({
      user: belongsTo('user', { inverse: 'messages', async: false }),
      created_at: attr('date')
    });

    Post = Message.extend({
      title: attr('string'),
      comments: hasMany('comment', { async: false })
    });

    Comment = Message.extend({
      body: DS.attr('string'),
      message: DS.belongsTo('message', { polymorphic: true, async: false })
    });

    Book = DS.Model.extend({
      name: attr('string'),
      author: belongsTo('author', { async: false }),
      chapters: hasMany('chapters', { async: false })
    });

    Chapter = DS.Model.extend({
      title: attr('string'),
      book: belongsTo('book', { async: false })
    });

    Author = DS.Model.extend({
      name: attr('string'),
      books: hasMany('books', { async: false })
    });

    env = setupStore({
      user: User,
      post: Post,
      comment: Comment,
      message: Message,
      book: Book,
      chapter: Chapter,
      author: Author
    });

    env.registry.optionsForType('serializer', { singleton: false });
    env.registry.optionsForType('adapter', { singleton: false });

    env.registry.register('serializer:user', DS.JSONSerializer.extend({
      attrs: {
        favouriteMessage: { embedded: 'always' }
      }
    }));

    store = env.store;

    User    = store.modelFor('user');
    Post    = store.modelFor('post');
    Comment = store.modelFor('comment');
    Message = store.modelFor('message');
    Book    = store.modelFor('book');
    Chapter = store.modelFor('chapter');
    Author  = store.modelFor('author');
  },

  teardown: function() {
    run(env.container, 'destroy');
  }
});

test("The store can materialize a non loaded monomorphic belongsTo association", function() {
  expect(1);

  env.store.modelFor('post').reopen({
    user: DS.belongsTo('user', {
      async: true,
      inverse: 'messages'
    })
  });
  env.adapter.shouldBackgroundReloadRecord = () => false;
  env.adapter.findRecord = function(store, type, id, snapshot) {
    ok(true, "The adapter's find method should be called");
    return Ember.RSVP.resolve({
      id: 1
    });
  };

  run(function() {
    env.store.push({
      data: {
        id: '1',
        type: 'post',
        relationships: {
          user: {
            data: {
              id: '2',
              type: 'user'
            }
          }
        }
      }
    });
  });

  run(function() {
    env.store.findRecord('post', 1).then(function(post) {
      post.get('user');
    });
  });
});

test("Only a record of the same type can be used with a monomorphic belongsTo relationship", function() {
  expect(1);
  env.adapter.shouldBackgroundReloadRecord = () => false;
  run(function() {
    store.push({
      data: {
        id: '1',
        type: 'post'
      }
    });
    store.push({
      data: {
        id: '2',
        type: 'comment'
      }
    });
  });


  run(function() {
    hash({
      post: store.findRecord('post', 1),
      comment: store.findRecord('comment', 2)
    }).then(function(records) {
      expectAssertion(function() {
        records.post.set('user', records.comment);
      }, /You cannot add a record of type 'comment' to the 'post.user' relationship/);
    });
  });
});

test("Only a record of the same base type can be used with a polymorphic belongsTo relationship", function() {
  env.adapter.shouldBackgroundReloadRecord = () => false;
  expect(1);
  run(function() {
    store.push({
      data: [{
        id: '1',
        type: 'comment'
      },
      {
        id: '2',
        type: 'comment'
      }]
    });
    store.push({
      data: {
        id: '1',
        type: 'post'
      }
    });
    store.push({
      data: {
        id: '3',
        type: 'user'
      }
    });

  });

  run(function() {
    var asyncRecords = hash({
      user: store.findRecord('user', 3),
      post: store.findRecord('post', 1),
      comment: store.findRecord('comment', 1),
      anotherComment: store.findRecord('comment', 2)
    });

    asyncRecords.then(function(records) {
      var comment = records.comment;

      comment.set('message', records.anotherComment);
      comment.set('message', records.post);
      comment.set('message', null);

      expectAssertion(function() {
        comment.set('message', records.user);
      }, /You cannot add a record of type 'user' to the 'comment.message' relationship \(only 'message' allowed\)/);
    });
  });
});

test("The store can load a polymorphic belongsTo association", function() {
  env.adapter.shouldBackgroundReloadRecord = () => false;
  run(function() {
    env.store.push({
      data: {
        id: '1',
        type: 'post'
      }
    });

    env.store.push({
      data: {
        id: '2',
        type: 'comment',
        relationships: {
          message: {
            data: {
              id: '1',
              type: 'post'
            }
          }
        }
      }
    });
  });

  run(function() {
    hash({
      message: store.findRecord('post', 1),
      comment: store.findRecord('comment', 2)
    }).then(function(records) {
      equal(records.comment.get('message'), records.message);
    });
  });
});

test("The store can serialize a polymorphic belongsTo association", function() {
  env.adapter.shouldBackgroundReloadRecord = () => false;
  var serializerInstance = store.serializerFor('comment');

  serializerInstance.serializePolymorphicType = function(record, json, relationship) {
    ok(true, "The serializer's serializePolymorphicType method should be called");
    json["message_type"] = "post";
  };
  run(function() {
    env.store.push({
      data: {
        id: '1',
        type: 'post'
      }
    });
    env.store.push({
      data: {
        id: '2',
        type: 'comment',
        relationships: {
          message: {
            data: {
              id: '1',
              type: 'post'
            }
          }
        }
      }
    });

    store.findRecord('comment', 2).then(function(comment) {
      var serialized = store.serialize(comment, { includeId: true });
      equal(serialized['message'], 1);
      equal(serialized['message_type'], 'post');
    });
  });
});

test("A serializer can materialize a belongsTo as a link that gets sent back to findBelongsTo", function() {
  env.adapter.shouldBackgroundReloadRecord = () => false;
  var Group = DS.Model.extend({
    people: DS.hasMany('person', { async: false })
  });

  var Person = DS.Model.extend({
    group: DS.belongsTo({ async: true })
  });

  env.registry.register('model:group', Group);
  env.registry.register('model:person', Person);

  run(function() {
    store.push({
      data: {
        id: '1',
        type: 'person',
        relationships: {
          group: {
            links: {
              related: '/people/1/group'
            }
          }
        }
      }
    });
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    throw new Error("Adapter's find method should not be called");
  };

  env.adapter.findBelongsTo = async(function(store, snapshot, link, relationship) {
    equal(relationship.type, 'group');
    equal(relationship.key, 'group');
    equal(link, "/people/1/group");

    return Ember.RSVP.resolve({ id: 1, people: [1] });
  });

  run(function() {
    env.store.findRecord('person', 1).then(function(person) {
      return person.get('group');
    }).then(function(group) {
      ok(group instanceof Group, "A group object is loaded");
      ok(group.get('id') === '1', 'It is the group we are expecting');
    });
  });
});

test('A record with an async belongsTo relationship always returns a promise for that relationship', function () {
  env.adapter.shouldBackgroundReloadRecord = () => false;
  var Seat = DS.Model.extend({
    person: DS.belongsTo('person', { async: false })
  });

  var Person = DS.Model.extend({
    seat: DS.belongsTo('seat', { async: true })
  });

  env.registry.register('model:seat', Seat);
  env.registry.register('model:person', Person);

  run(function() {
    store.push({
      data: {
        id: '1',
        type: 'person',
        relationships: {
          seat: {
            links: {
              related: '/people/1/seat'
            }
          }
        }
      }
    });
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    throw new Error("Adapter's find method should not be called");
  };

  env.adapter.findBelongsTo = async(function(store, snapshot, link, relationship) {
    return Ember.RSVP.resolve({ id: 1 });
  });

  run(function() {
    env.store.findRecord('person', 1).then(function(person) {
      person.get('seat').then(function(seat) {
        // this assertion fails too
        // ok(seat.get('person') === person, 'parent relationship should be populated');
        seat.set('person', person);
        ok(person.get('seat').then, 'seat should be a PromiseObject');
      });
    });
  });
});

test("A record with an async belongsTo relationship returning null should resolve null", function() {
  expect(1);

  env.adapter.shouldBackgroundReloadRecord = () => false;
  var Group = DS.Model.extend({
    people: DS.hasMany('person', { async: false })
  });

  var Person = DS.Model.extend({
    group: DS.belongsTo({ async: true })
  });

  env.registry.register('model:group', Group);
  env.registry.register('model:person', Person);

  run(function() {
    store.push({
      data: {
        id: '1',
        type: 'person',
        relationships: {
          group: {
            links: {
              related: '/people/1/group'
            }
          }
        }
      }
    });
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    throw new Error("Adapter's find method should not be called");
  };

  env.adapter.findBelongsTo = async(function(store, snapshot, link, relationship) {
    return Ember.RSVP.resolve(null);
  });

  env.store.findRecord('person', '1').then(async(function(person) {
    return person.get('group');
  })).then(async(function(group) {
    ok(group === null, "group should be null");
  }));
});

test("A record can be created with a resolved belongsTo promise", function() {
  expect(1);

  env.adapter.shouldBackgroundReloadRecord = () => false;
  var Group = DS.Model.extend({
    people: DS.hasMany('person', { async: false })
  });

  var Person = DS.Model.extend({
    group: DS.belongsTo({ async: true })
  });

  env.registry.register('model:group', Group);
  env.registry.register('model:person', Person);

  var group;
  run(function() {
    group = store.push({
      data: {
        id: 1,
        type: 'group'
      }
    });
  });

  var groupPromise = store.findRecord('group', 1);
  groupPromise.then(async(function(group) {
    var person = env.store.createRecord('person', {
      group: groupPromise
    });
    equal(person.get('group.content'), group);
  }));
});

test("polymorphic belongsTo type-checks check the superclass when MODEL_FACTORY_INJECTIONS is enabled", function() {
  expect(1);

  var injectionValue = Ember.MODEL_FACTORY_INJECTIONS;
  Ember.MODEL_FACTORY_INJECTIONS = true;

  try {
    run(function () {
      var igor = env.store.createRecord('user', { name: 'Igor' });
      var post = env.store.createRecord('post', { title: "Igor's unimaginative blog post" });

      igor.set('favouriteMessage', post);

      equal(igor.get('favouriteMessage.title'), "Igor's unimaginative blog post");
    });
  } finally {
    Ember.MODEL_FACTORY_INJECTIONS = injectionValue;
  }
});

test("the subclass in a polymorphic belongsTo relationship is an instanceof its superclass", function() {
  expect(1);

  var injectionValue = Ember.MODEL_FACTORY_INJECTIONS;
  Ember.MODEL_FACTORY_INJECTIONS = true;

  try {
    run(function () {
      var message = env.store.createRecord('message', { id: 1 });
      var comment = env.store.createRecord('comment', { id: 2, message: message });
      ok(comment instanceof Message, 'a comment is an instance of a message');
    });

  } finally {
    Ember.MODEL_FACTORY_INJECTIONS = injectionValue;
  }
});

test("relationshipsByName does not cache a factory", function() {

  // The model is loaded up via a container. It has relationshipsByName
  // called on it.
  var modelViaFirstFactory = store.modelFor('user');
  get(modelViaFirstFactory, 'relationshipsByName');

  // An app is reset, or the container otherwise destroyed.
  run(env.container, 'destroy');

  // A new model for a relationship is created. Note that this may happen
  // due to an extend call internal to MODEL_FACTORY_INJECTIONS.
  NewMessage = Message.extend();

  // A new store is created.
  env = setupStore({
    user: User,
    message: NewMessage
  });
  store = env.store;

  // relationshipsByName is called again.
  var modelViaSecondFactory = store.modelFor('user');
  var relationshipsByName   = get(modelViaSecondFactory, 'relationshipsByName');
  var messageType           = relationshipsByName.get('messages').type;

  // A model is looked up in the store based on a string, via user input
  var messageModelFromStore        = store.modelFor('message');
  // And the model is lookup up internally via the relationship type
  var messageModelFromRelationType = store.modelFor(messageType);

  equal(messageModelFromRelationType, messageModelFromStore,
        "model factory based on relationship type matches the model based on store.modelFor");
});

test("relationshipsByName is cached in production", function() {
  var model = store.modelFor('user');
  var oldTesting = Ember.testing;
  //We set the cacheable to true because that is the default state for any CP and then assert that it
  //did not get dynamically changed when accessed
  var relationshipsByName = getComputedPropertyDesc(model, 'relationshipsByName');
  var oldCacheable = relationshipsByName._cacheable;
  relationshipsByName._cacheable = true;
  Ember.testing = false;
  try {
    equal(get(model, 'relationshipsByName'), get(model, 'relationshipsByName'), 'relationshipsByName are cached');
    equal(get(model, 'relationshipsByName'), get(model, 'relationshipsByName'), 'relationshipsByName are cached');
  } finally {
    Ember.testing = oldTesting;
    relationshipsByName._cacheable = oldCacheable;
  }
});

test("relatedTypes is cached in production", function() {
  var model = store.modelFor('user');
  var oldTesting = Ember.testing;
  //We set the cacheable to true because that is the default state for any CP and then assert that it
  //did not get dynamically changed when accessed
  var relatedTypes = getComputedPropertyDesc(model, 'relatedTypes');
  var oldCacheable = relatedTypes._cacheable;
  relatedTypes._cacheable = true;
  Ember.testing = false;
  try {
    equal(get(model, 'relatedTypes'), get(model, 'relatedTypes'), 'relatedTypes are cached');
    equal(get(model, 'relatedTypes'), get(model, 'relatedTypes'), 'relatedTypes are cached');
  } finally {
    Ember.testing = oldTesting;
    relatedTypes._cacheable = oldCacheable;
  }
});

test("relationships is cached in production", function() {
  var model = store.modelFor('user');
  var oldTesting = Ember.testing;
  //We set the cacheable to true because that is the default state for any CP and then assert that it
  //did not get dynamically changed when accessed
  var relationships = getComputedPropertyDesc(model, 'relationships');
  var oldCacheable = relationships._cacheable;
  relationships._cacheable = true;
  Ember.testing = false;
  try {
    equal(get(model, 'relationships'), get(model, 'relationships'), 'relationships are cached');
    equal(get(model, 'relationships'), get(model, 'relationships'), 'relationships are cached');
  } finally {
    Ember.testing = oldTesting;
    relationships._cacheable = oldCacheable;
  }
});

test("relationship changes shouldn’t cause async fetches", function() {
  expect(2);

  /*  Scenario:
   *  ---------
   *
   *    post HM async comments
   *    comments bt sync post
   *
   *    scenario:
   *     - post hm C [1,2,3]
   *     - post has a partially realized comments array comment#1 has been realized
   *     - comment has not yet realized its post relationship
   *     - comment is destroyed
   */

  env.store.modelFor('post').reopen({
    comments: DS.hasMany('comment', {
      async: true,
      inverse: 'post'
    })
  });

  env.store.modelFor('comment').reopen({
    post: DS.belongsTo('post', { async: false })
  });
  var post, comment;
  run(function() {
    post = env.store.push({
      data: {
        id: '1',
        type: 'post',
        relationships: {
          comments: {
            data: [{
              id: '1',
              type: 'comment'
            }, {
              id: '2',
              type: 'comment'
            }, {
              id: '3',
              type: 'comment'
            }]
          }
        }
      }
    });

    comment = env.store.push({
      data: {
        id: '1',
        type: 'comment',
        relationships: {
          post: {
            data: {
              id: '1',
              type: 'post'
            }
          }
        }
      }
    });
  });

  env.adapter.deleteRecord = function(store, type, snapshot) {
    ok(snapshot.record instanceof type);
    equal(snapshot.id, 1, 'should first comment');
    return snapshot.record.toJSON({ includeId: true });
  };

  env.adapter.findMany = function(store, type, ids, snapshots) {
    ok(false, 'should not need to findMay more comments, but attempted to anyways');
  };

  run(comment, 'destroyRecord');
});

test("Destroying a record with an unloaded aync belongsTo association does not fetch the record", function() {
  expect(2);
  var post;

  env.store.modelFor('message').reopen({
    user: DS.hasMany('user', {
      async: true
    })
  });

  env.store.modelFor('post').reopen({
    user: DS.belongsTo('user', {
      async: true,
      inverse: 'messages'
    })
  });

  run(function() {
    post = env.store.push({
      data: {
        id: '1',
        type: 'post',
        relationships: {
          user: {
            data: {
              id: '2',
              type: 'user'
            }
          }
        }
      }
    });
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    throw new Error("Adapter's find method should not be called");
  };

  env.adapter.deleteRecord = function(store, type, snapshot) {
    ok(snapshot.record instanceof type);
    equal(snapshot.id, 1, 'should first post');
    return {
      id: '1',
      title: null,
      created_at: null,
      user: "2"
    };
  };

  run(post, 'destroyRecord');
});

test("A sync belongsTo errors out if the record is unlaoded", function() {
  var message;
  run(function() {
    message = env.store.push({
      data: {
        id: '1',
        type: 'message',
        relationships: {
          user: {
            data: {
              id: '2',
              type: 'user'
            }
          }
        }
      }
    });

  });

  expectAssertion(function() {
    message.get('user');
  }, /You looked up the 'user' relationship on a 'message' with id 1 but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async \(`DS.belongsTo\({ async: true }\)`\)/);
});

test("Rollbacking attributes for a deleted record restores implicit relationship - async", function () {
  Book.reopen({
    author: DS.belongsTo('author', { async: true })
  });
  var book, author;
  run(function() {
    book = env.store.push({
      data: {
        id: '1',
        type: 'book',
        attributes: {
          name: "Stanley's Amazing Adventures"
        },
        relationships: {
          author: {
            data: {
              id: '2',
              type: 'author'
            }
          }
        }
      }
    });
    author = env.store.push({
      data: {
        id: '2',
        type: 'author',
        attributes: {
          name: 'Stanley'
        }
      }
    });

  });
  run(function() {
    author.deleteRecord();
    author.rollbackAttributes();
    book.get('author').then(function(fetchedAuthor) {
      equal(fetchedAuthor, author, 'Book has an author after rollback attributes');
    });
  });
});

test("Rollbacking attributes for a deleted record restores implicit relationship - sync", function () {
  var book, author;
  run(function() {
    book = env.store.push({
      data: {
        id: '1',
        type: 'book',
        attributes: {
          name: "Stanley's Amazing Adventures"
        },
        relationships: {
          author: {
            data: {
              id: '2',
              type: 'author'
            }
          }
        }
      }
    });
    author = env.store.push({
      data: {
        id: '2',
        type: 'author',
        attributes: {
          name: "Stanley"
        }
      }
    });

  });
  run(function() {
    author.deleteRecord();
    author.rollbackAttributes();
  });
  equal(book.get('author'), author, 'Book has an author after rollback attributes');
});

test("Passing a model as type to belongsTo should not work", function () {
  expect(1);

  expectAssertion(function() {
    User = DS.Model.extend();

    Contact = DS.Model.extend({
      user: belongsTo(User, { async: false })
    });
  }, /The first argument to DS.belongsTo must be a string/);
});

test("belongsTo hasData async loaded", function () {
  expect(1);

  Book.reopen({
    author: belongsTo('author', { async: true })
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return Ember.RSVP.resolve({ id: 1, name: 'The Greatest Book', author: 2 });
  };

  run(function() {
    store.findRecord('book', 1).then(function(book) {
      var relationship = book._internalModel._relationships.get('author');
      equal(relationship.hasData, true, 'relationship has data');
    });
  });
});

test("belongsTo hasData sync loaded", function () {
  expect(1);

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return Ember.RSVP.resolve({ id: 1, name: 'The Greatest Book', author: 2 });
  };

  run(function() {
    store.findRecord('book', 1).then(function(book) {
      var relationship = book._internalModel._relationships.get('author');
      equal(relationship.hasData, true, 'relationship has data');
    });
  });
});

test("belongsTo hasData async not loaded", function () {
  expect(1);

  Book.reopen({
    author: belongsTo('author', { async: true })
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return Ember.RSVP.resolve({ id: 1, name: 'The Greatest Book', links: { author: 'author' } });
  };

  run(function() {
    store.findRecord('book', 1).then(function(book) {
      var relationship = book._internalModel._relationships.get('author');
      equal(relationship.hasData, false, 'relationship does not have data');
    });
  });
});

test("belongsTo hasData sync not loaded", function () {
  expect(1);

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return Ember.RSVP.resolve({ id: 1, name: 'The Greatest Book' });
  };

  run(function() {
    store.findRecord('book', 1).then(function(book) {
      var relationship = book._internalModel._relationships.get('author');
      equal(relationship.hasData, false, 'relationship does not have data');
    });
  });
});

test("belongsTo hasData async created", function () {
  expect(1);

  Book.reopen({
    author: belongsTo('author', { async: true })
  });

  run(function() {
    var book = store.createRecord('book', { name: 'The Greatest Book' });
    var relationship = book._internalModel._relationships.get('author');
    equal(relationship.hasData, true, 'relationship has data');
  });
});

test("belongsTo hasData sync created", function () {
  expect(1);

  run(function() {
    var book = store.createRecord('book', { name: 'The Greatest Book' });
    var relationship = book._internalModel._relationships.get('author');
    equal(relationship.hasData, true, 'relationship has data');
  });
});

test("Model's belongsTo relationship should not be created during model creation", function () {
  var user;
  run(function () {
    user = env.store.push({
      data: {
        id: '1',
        type: 'user'
      }
    });

    ok(!user._internalModel._relationships.has('favouriteMessage'), 'Newly created record should not have relationships');
  });
});

test("Model's belongsTo relationship should be created during model creation if relationship passed in constructor", function () {
  var user, message;
  run(function () {
    message = env.store.createRecord('message');
    user = env.store.createRecord('user', {
      name: 'John Doe',
      favouriteMessage: message
    });
    ok(user._internalModel._relationships.has('favouriteMessage'), "Newly created record with relationships in params passed in its constructor should have relationships");
  });
});

test("Model's belongsTo relationship should be created during 'set' method", function () {
  var user, message;
  run(function () {
    message = env.store.createRecord('message');
    user = env.store.createRecord('user');
    user.set('favouriteMessage', message);
    ok(user._internalModel._relationships.has('favouriteMessage'), "Newly created record with relationships in params passed in its constructor should have relationships");
  });
});

test("Model's belongsTo relationship should be created during 'get' method", function () {
  var user;
  run(function () {
    user = env.store.createRecord('user');
    user.get('favouriteMessage');
    ok(user._internalModel._relationships.has('favouriteMessage'), "Newly created record with relationships in params passed in its constructor should have relationships");
  });
});
