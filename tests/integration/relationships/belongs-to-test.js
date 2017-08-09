import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {module, test} from 'qunit';

import DS from 'ember-data';

var env, store, User, Message, Post, Comment, Book, Chapter, Author, NewMessage;
var get = Ember.get;
var run = Ember.run;

var attr = DS.attr;
var hasMany = DS.hasMany;
var belongsTo = DS.belongsTo;
var hash = Ember.RSVP.hash;

module("integration/relationship/belongs_to Belongs-To Relationships", {
  beforeEach() {
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

    env.registry.register('serializer:user', DS.JSONAPISerializer.extend({
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

  afterEach() {
    run(env.container, 'destroy');
  }
});

test("The store can materialize a non loaded monomorphic belongsTo association", function(assert) {
  assert.expect(1);

  env.store.modelFor('post').reopen({
    user: DS.belongsTo('user', {
      async: true,
      inverse: 'messages'
    })
  });
  env.adapter.shouldBackgroundReloadRecord = () => false;
  env.adapter.findRecord = function(store, type, id, snapshot) {
    assert.ok(true, "The adapter's find method should be called");
    return Ember.RSVP.resolve({
      data: {
        id,
        type: snapshot.modelName
      }
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

testInDebug("Only a record of the same modelClass can be used with a monomorphic belongsTo relationship", function(assert) {
  assert.expect(1);
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
      assert.expectAssertion(function() {
        records.post.set('user', records.comment);
      }, /You cannot add a record of modelClass 'comment' to the 'post.user' relationship/);
    });
  });
});

testInDebug("Only a record of the same base modelClass can be used with a polymorphic belongsTo relationship", function(assert) {
  env.adapter.shouldBackgroundReloadRecord = () => false;
  assert.expect(1);
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

      assert.expectAssertion(function() {
        comment.set('message', records.user);
      }, /You cannot add a record of modelClass 'user' to the 'comment.message' relationship \(only 'message' allowed\)/);
    });
  });
});

test("The store can load a polymorphic belongsTo association", function(assert) {
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
      assert.equal(records.comment.get('message'), records.message);
    });
  });
});

test("The store can serialize a polymorphic belongsTo association", function(assert) {
  env.adapter.shouldBackgroundReloadRecord = () => false;
  var serializerInstance = store.serializerFor('comment');

  serializerInstance.serializePolymorphicType = function(record, json, relationship) {
    assert.ok(true, "The serializer's serializePolymorphicType method should be called");
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
      var serialized = comment.serialize({ includeId: true });
      assert.equal(serialized.data.relationships.message.data.id, 1);
      assert.equal(serialized.data.relationships.message.data.type, 'posts');
    });
  });
});

test("A serializer can materialize a belongsTo as a link that gets sent back to findBelongsTo", function(assert) {
  let done = assert.async();
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

  env.adapter.findBelongsTo = assert.wait(function(store, snapshot, link, relationship) {
    assert.equal(relationship.type, 'group');
    assert.equal(relationship.key, 'group');
    assert.equal(link, "/people/1/group");

    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'group',
        relationships: {
          people: {
            data: [{ id: 1, type: 'person' }]
          }
        }
      }
    });
  });

  run(function() {
    env.store.findRecord('person', 1).then(function(person) {
      return person.get('group');
    }).then(function(group) {
      assert.ok(group instanceof Group, "A group object is loaded");
      assert.ok(group.get('id') === '1', 'It is the group we are expecting');
      done();
    });
  });
});

test('A record with an async belongsTo relationship always returns a promise for that relationship', function(assert) {
  let done = assert.async();
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

  env.adapter.findBelongsTo = assert.wait(function(store, snapshot, link, relationship) {
    return Ember.RSVP.resolve({ data: { id: 1, type: 'seat' } });
  });

  run(function() {
    env.store.findRecord('person', 1).then(function(person) {
      person.get('seat').then(function(seat) {
        // this assertion fails too
        // ok(seat.get('person') === person, 'parent relationship should be populated');
        seat.set('person', person);
        assert.ok(person.get('seat').then, 'seat should be a PromiseObject');
        done();
      });
    });
  });
});

test("A record with an async belongsTo relationship returning null should resolve null", function(assert) {
  assert.expect(1);

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

  env.adapter.findBelongsTo = assert.wait(function(store, snapshot, link, relationship) {
    return Ember.RSVP.resolve({ data: null });
  });

  env.store.findRecord('person', '1').then(assert.wait(function(person) {
    return person.get('group');
  })).then(assert.wait(function(group) {
    assert.ok(group === null, "group should be null");
  }));
});

test("A record can be created with a resolved belongsTo promise", function(assert) {
  assert.expect(1);

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
        id: 1,
        type: 'group'
      }
    });
  });

  var groupPromise = store.findRecord('group', 1);
  groupPromise.then(assert.wait(function(group) {
    var person = env.store.createRecord('person', {
      group: groupPromise
    });
    assert.equal(person.get('group.content'), group);
  }));
});

test("polymorphic belongsTo class-checks check the superclass when MODEL_FACTORY_INJECTIONS is enabled", function(assert) {
  assert.expect(1);

  var injectionValue = Ember.MODEL_FACTORY_INJECTIONS;
  Ember.MODEL_FACTORY_INJECTIONS = true;

  try {
    run(function () {
      var igor = env.store.createRecord('user', { name: 'Igor' });
      var post = env.store.createRecord('post', { title: "Igor's unimaginative blog post" });

      igor.set('favouriteMessage', post);

      assert.equal(igor.get('favouriteMessage.title'), "Igor's unimaginative blog post");
    });
  } finally {
    Ember.MODEL_FACTORY_INJECTIONS = injectionValue;
  }
});

test("the subclass in a polymorphic belongsTo relationship is an instanceof its superclass", function(assert) {
  assert.expect(1);

  var injectionValue = Ember.MODEL_FACTORY_INJECTIONS;
  Ember.MODEL_FACTORY_INJECTIONS = true;

  try {
    run(function () {
      var message = env.store.createRecord('message', { id: 1 });
      var comment = env.store.createRecord('comment', { id: 2, message: message });
      assert.ok(comment instanceof Message, 'a comment is an instance of a message');
    });

  } finally {
    Ember.MODEL_FACTORY_INJECTIONS = injectionValue;
  }
});

test("relationshipsByName does not cache a factory", function(assert) {

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

  assert.equal(messageModelFromRelationType, messageModelFromStore,
        "model factory based on relationship type matches the model based on store.modelFor");
});

test("relationshipsByName is cached in production", function(assert) {
  var model = store.modelFor('user');
  var oldTesting = Ember.testing;
  //We set the cacheable to true because that is the default state for any CP and then assert that it
  //did not get dynamically changed when accessed
  var relationshipsByName = model.relationshipsByName;
  var oldCacheable = relationshipsByName._cacheable;
  relationshipsByName._cacheable = true;
  Ember.testing = false;
  try {
    assert.equal(get(model, 'relationshipsByName'), get(model, 'relationshipsByName'), 'relationshipsByName are cached');
    assert.equal(get(model, 'relationshipsByName'), get(model, 'relationshipsByName'), 'relationshipsByName are cached');
  } finally {
    Ember.testing = oldTesting;
    relationshipsByName._cacheable = oldCacheable;
  }
});

test("relatedTypes is cached in production", function(assert) {
  var model = store.modelFor('user');
  var oldTesting = Ember.testing;
  //We set the cacheable to true because that is the default state for any CP and then assert that it
  //did not get dynamically changed when accessed
  var relatedTypes = model.relatedTypes;
  var oldCacheable = relatedTypes._cacheable;
  relatedTypes._cacheable = true;
  Ember.testing = false;
  try {
    assert.equal(get(model, 'relatedTypes'), get(model, 'relatedTypes'), 'relatedTypes are cached');
    assert.equal(get(model, 'relatedTypes'), get(model, 'relatedTypes'), 'relatedTypes are cached');
  } finally {
    Ember.testing = oldTesting;
    relatedTypes._cacheable = oldCacheable;
  }
});

test("relationships is cached in production", function(assert) {
  var model = store.modelFor('user');
  var oldTesting = Ember.testing;
  //We set the cacheable to true because that is the default state for any CP and then assert that it
  //did not get dynamically changed when accessed
  var relationships = model.relationships;
  var oldCacheable = relationships._cacheable;
  relationships._cacheable = true;
  Ember.testing = false;
  try {
    assert.equal(get(model, 'relationships'), get(model, 'relationships'), 'relationships are cached');
    assert.equal(get(model, 'relationships'), get(model, 'relationships'), 'relationships are cached');
  } finally {
    Ember.testing = oldTesting;
    relationships._cacheable = oldCacheable;
  }
});

test("relationship changes shouldn’t cause async fetches", function(assert) {
  assert.expect(2);

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
  var comment;
  run(function() {
    env.store.push({
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
    assert.ok(snapshot.record instanceof type);
    assert.equal(snapshot.id, 1, 'should first comment');
    return snapshot.record.toJSON({ includeId: true });
  };

  env.adapter.findMany = function(store, type, ids, snapshots) {
    assert.ok(false, 'should not need to findMay more comments, but attempted to anyways');
  };

  run(comment, 'destroyRecord');
});

test("Destroying a record with an unloaded aync belongsTo association does not fetch the record", function(assert) {
  assert.expect(2);
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
    assert.ok(snapshot.record instanceof type);
    assert.equal(snapshot.id, 1, 'should first post');
    return {
      data: {
        id: '1',
        type: 'post',
        attributes: {
          title: null,
          'created-at': null
        },
        relationships: {
          user: {
            data: {
              id: '2',
              type: 'user'
            }
          }
        }
      }
    };
  };

  run(post, 'destroyRecord');
});

testInDebug("A sync belongsTo errors out if the record is unlaoded", function(assert) {
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

  assert.expectAssertion(function() {
    message.get('user');
  }, /You looked up the 'user' relationship on a 'message' with id 1 but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async \(`DS.belongsTo\({ async: true }\)`\)/);
});

test("Rollbacking attributes for a deleted record restores implicit relationship - async", function(assert) {
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
      assert.equal(fetchedAuthor, author, 'Book has an author after rollback attributes');
    });
  });
});

test("Rollbacking attributes for a deleted record restores implicit relationship - sync", function(assert) {
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
  assert.equal(book.get('author'), author, 'Book has an author after rollback attributes');
});

testInDebug("Passing a model as type to belongsTo should not work", function(assert) {
  assert.expect(1);

  assert.expectAssertion(function() {
    User = DS.Model.extend();

    DS.Model.extend({
      user: belongsTo(User, { async: false })
    });
  }, /The first argument to DS.belongsTo must be a string/);
});

test("belongsTo hasData async loaded", function(assert) {
  assert.expect(1);

  Book.reopen({
    author: belongsTo('author', { async: true })
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'book',
        attributes: { name: 'The Greatest Book' },
        relationships: {
          author: { data: { id: 2, type: 'author'} }
        }
      }
    });
  };

  run(function() {
    store.findRecord('book', 1).then(function(book) {
      var relationship = book._internalModel._relationships.get('author');
      assert.equal(relationship.hasData, true, 'relationship has data');
    });
  });
});

test("belongsTo hasData sync loaded", function(assert) {
  assert.expect(1);

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'book',
        attributes: { name: 'The Greatest Book' },
        relationships: {
          author: { data: { id: 2, type: 'author'} }
        }
      }
    });
  };

  run(function() {
    store.findRecord('book', 1).then(function(book) {
      var relationship = book._internalModel._relationships.get('author');
      assert.equal(relationship.hasData, true, 'relationship has data');
    });
  });
});

test("belongsTo hasData async not loaded", function(assert) {
  assert.expect(1);

  Book.reopen({
    author: belongsTo('author', { async: true })
  });

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'book',
        attributes: { name: 'The Greatest Book' },
        relationships: {
          author: { links: { related: 'author'} }
        }
      }
    });
  };

  run(function() {
    store.findRecord('book', 1).then(function(book) {
      var relationship = book._internalModel._relationships.get('author');
      assert.equal(relationship.hasData, false, 'relationship does not have data');
    });
  });
});

test("belongsTo hasData sync not loaded", function(assert) {
  assert.expect(1);

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'book',
        attributes: { name: 'The Greatest Book' }
      }
    });
  }

  run(function() {
    store.findRecord('book', 1).then(function(book) {
      var relationship = book._internalModel._relationships.get('author');
      assert.equal(relationship.hasData, false, 'relationship does not have data');
    });
  });
});

test("belongsTo hasData NOT created", function(assert) {
  assert.expect(2);

  Book.reopen({
    author: belongsTo('author', { async: true })
  });

  run(() => {
    let author = store.createRecord('author');
    let book = store.createRecord('book', { name: 'The Greatest Book' });
    let relationship = book._internalModel._relationships.get('author');

    assert.equal(relationship.hasData, false, 'relationship does not have data');

    book = store.createRecord('book', {
      name: 'The Greatest Book',
      author
    });

    relationship = book._internalModel._relationships.get('author');

    assert.equal(relationship.hasData, true, 'relationship has data');
  });
});

test("belongsTo hasData sync created", function(assert) {
  assert.expect(2);

  run(() => {
    let author = store.createRecord('author');
    let book = store.createRecord('book', {
      name: 'The Greatest Book'
    });

    let relationship = book._internalModel._relationships.get('author');
    assert.equal(relationship.hasData, false, 'relationship does not have data');

    book = store.createRecord('book', {
      name: 'The Greatest Book',
      author
    });

    relationship = book._internalModel._relationships.get('author');
    assert.equal(relationship.hasData, true, 'relationship has data');
  });
});

test("Model's belongsTo relationship should not be created during model creation", function(assert) {
  var user;
  run(function () {
    user = env.store.push({
      data: {
        id: '1',
        type: 'user'
      }
    });

    assert.ok(!user._internalModel._relationships.has('favouriteMessage'), 'Newly created record should not have relationships');
  });
});

test("Model's belongsTo relationship should be created during model creation if relationship passed in constructor", function(assert) {
  var user, message;
  run(function () {
    message = env.store.createRecord('message');
    user = env.store.createRecord('user', {
      name: 'John Doe',
      favouriteMessage: message
    });
    assert.ok(user._internalModel._relationships.has('favouriteMessage'), "Newly created record with relationships in params passed in its constructor should have relationships");
  });
});

test("Model's belongsTo relationship should be created during 'set' method", function(assert) {
  var user, message;
  run(function () {
    message = env.store.createRecord('message');
    user = env.store.createRecord('user');
    user.set('favouriteMessage', message);
    assert.ok(user._internalModel._relationships.has('favouriteMessage'), "Newly created record with relationships in params passed in its constructor should have relationships");
  });
});

test("Model's belongsTo relationship should be created during 'get' method", function(assert) {
  var user;
  run(function () {
    user = env.store.createRecord('user');
    user.get('favouriteMessage');
    assert.ok(user._internalModel._relationships.has('favouriteMessage'), "Newly created record with relationships in params passed in its constructor should have relationships");
  });
});

test("Related link should be fetched when no local data is present", function(assert) {
  assert.expect(3);

  Book.reopen({
    author: DS.belongsTo('author', { async: true })
  });

  env.adapter.findBelongsTo = function(store, snapshot, url, relationship) {
    assert.equal(url, 'author', 'url is correct');
    assert.ok(true, "The adapter's findBelongsTo method should be called");
    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'author',
        attributes: { name: 'This is author' }
      }
    });
  };

  run(function() {
    let book = env.store.push({
      data: {
        type: 'book',
        id: '1',
        relationships: {
          author: {
            links: {
              related: 'author'
            }
          }
        }
      }
    });
    book.get('author').then((author) => {
      assert.equal(author.get('name'), 'This is author', 'author name is correct');
    });
  });
});

test("Local data should take precedence over related link", function(assert) {
  assert.expect(1);

  Book.reopen({
    author: DS.belongsTo('author', { async: true })
  });

  env.adapter.findBelongsTo = function(store, snapshot, url, relationship) {
    assert.ok(false, "The adapter's findBelongsTo method should not be called");
  };

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'author',
        attributes: { name: 'This is author' }
      }
    });
  };

  run(function() {
    let book = env.store.push({
      data: {
        type: 'book',
        id: '1',
        relationships: {
          author: {
            links: {
              related: 'author'
            },
            data: { type: 'author', id: '1' }
          }
        }
      }
    });
    book.get('author').then((author) => {
      assert.equal(author.get('name'), 'This is author', 'author name is correct');
    });
  });
});

test("New related link should take precedence over local data", function(assert) {
  assert.expect(3);

  Book.reopen({
    author: DS.belongsTo('author', { async: true })
  });

  env.adapter.findBelongsTo = function(store, snapshot, url, relationship) {
    assert.equal(url, 'author-new-link', 'url is correct');
    assert.ok(true, "The adapter's findBelongsTo method should be called");
    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'author',
        attributes: { name: 'This is author' }
      }
    });
  };

  env.adapter.findRecord = function(store, type, id, snapshot) {
    assert.ok(false, "The adapter's findRecord method should not be called");
  };

  run(function() {
    let book = env.store.push({
      data: {
        type: 'book',
        id: '1',
        relationships: {
          author: {
            data: {
              type: 'author',
              id: '1'
            }
          }
        }
      }
    });

    env.store.push({
      data: {
        type: 'book',
        id: '1',
        relationships: {
          author: {
            links: {
              related: 'author-new-link'
            }
          }
        }
      }
    });

    book.get('author').then((author) => {
      assert.equal(author.get('name'), 'This is author', 'author name is correct');
    });
  });
});

test("Updated related link should take precedence over local data", function(assert) {
  assert.expect(4);

  Book.reopen({
    author: DS.belongsTo('author', { async: true })
  });

  env.adapter.findBelongsTo = function(store, snapshot, url, relationship) {
    assert.equal(url, 'author-updated-link', 'url is correct');
    assert.ok(true, "The adapter's findBelongsTo method should be called");
    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'author',
        attributes: { name: 'This is updated author' }
      }
    });
  };

  env.adapter.findRecord = function(store, type, id, snapshot) {
    assert.ok(false, "The adapter's findRecord method should not be called");
  };

  run(function() {
    let book = env.store.push({
      data: {
        type: 'book',
        id: '1',
        relationships: {
          author: {
            links: {
              related: 'author'
            },
            data: { type: 'author', id: '1' }
          }
        }
      },
      included: [{
        type: 'author',
        id: '1',
        attributes: {
          name: 'This is author'
        }
      }]
    });

    book.get('author').then((author) => {
      assert.equal(author.get('name'), 'This is author', 'author name is correct');
    });

    env.store.push({
      data: {
        type: 'book',
        id: '1',
        relationships: {
          author: {
            links: {
              related: 'author-updated-link'
            }
          }
        }
      }
    });

    book.get('author').then((author) => {
      assert.equal(author.get('name'), 'This is updated author', 'author name is correct');
    });
  });
});

test("Updated identical related link should not take precedence over local data", function(assert) {
  assert.expect(2);

  Book.reopen({
    author: DS.belongsTo('author', { async: true })
  });

  env.adapter.findBelongsTo = function() {
    assert.ok(false, "The adapter's findBelongsTo method should not be called");
  };

  env.adapter.findRecord = function() {
    assert.ok(false, "The adapter's findRecord method should not be called");
  };

  run(function() {
    let book = env.store.push({
      data: {
        type: 'book',
        id: '1',
        relationships: {
          author: {
            links: {
              related: 'author'
            },
            data: { type: 'author', id: '1' }
          }
        }
      },
      included: [{
        type: 'author',
        id: '1',
        attributes: {
          name: 'This is author'
        }
      }]
    });

    book.get('author').then((author) => {
      assert.equal(author.get('name'), 'This is author', 'author name is correct');
    });

    env.store.push({
      data: {
        type: 'book',
        id: '1',
        relationships: {
          author: {
            links: {
              related: 'author'
            }
          }
        }
      }
    });

    book.get('author').then((author) => {
      assert.equal(author.get('name'), 'This is author', 'author name is correct');
    });
  });
});

test("A belongsTo relationship can be reloaded using the reference if it was fetched via link", function(assert) {
  var done = assert.async();

  Chapter.reopen({
    book: DS.belongsTo({ async: true })
  });

  env.adapter.findRecord = function() {
    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'chapter',
        relationships: {
          book: {
            links: { related: '/books/1' }
          }
        }
      }
    });
  };

  env.adapter.findBelongsTo = function() {
    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'book',
        attributes: { name: "book title" }
      }
    });
  };

  run(function() {
    var chapter;
    store.findRecord('chapter', 1).then(function(_chapter) {
      chapter = _chapter;

      return chapter.get('book');
    }).then(function(book) {
      assert.equal(book.get('name'), "book title");

      env.adapter.findBelongsTo = function() {
        return Ember.RSVP.resolve({
          data: {
            id: 1,
            type: 'book',
            attributes: { name: "updated book title" }
          }
        });
      };

      return chapter.belongsTo('book').reload();
    }).then(function(book) {
      assert.equal(book.get('name'), "updated book title");

      done();
    });
  });
});

test("A sync belongsTo relationship can be reloaded using a reference if it was fetched via id", function(assert) {
  var done = assert.async();

  Chapter.reopen({
    book: DS.belongsTo()
  });

  var chapter;
  run(function() {
    chapter = env.store.push({
      data: {
        type: 'chapter',
        id: 1,
        relationships: {
          book: {
            data: { type: 'book', id: 1 }
          }
        }
      }
    });
    env.store.push({
      data: {
        type: 'book',
        id: 1,
        attributes: {
          name: "book title"
        }
      }
    });
  });

  env.adapter.findRecord = function() {
    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'book',
        attributes: { name: 'updated book title' }
      }
    });
  };

  run(function() {
    var book = chapter.get('book');
    assert.equal(book.get('name'), "book title");

    chapter.belongsTo('book').reload().then(function(book) {
      assert.equal(book.get('name'), "updated book title");

      done();
    });
  });
});

test("A belongsTo relationship can be reloaded using a reference if it was fetched via id", function(assert) {
  var done = assert.async();

  Chapter.reopen({
    book: DS.belongsTo({ async: true })
  });

  var chapter;
  run(function() {
    chapter = env.store.push({
      data: {
        type: 'chapter',
        id: 1,
        relationships: {
          book: {
            data: { type: 'book', id: 1 }
          }
        }
      }
    });
  });

  env.adapter.findRecord = function() {
    return Ember.RSVP.resolve({
      data: {
        id: 1,
        type: 'book',
        attributes: { name: "book title" }
      }
    });
  };

  run(function() {
    chapter.get('book').then(function(book) {
      assert.equal(book.get('name'), "book title");

      env.adapter.findRecord = function() {
        return Ember.RSVP.resolve({
          data: {
            id: 1,
            type: 'book',
            attributes: { name: "updated book title" }
          }
        });
      };

      return chapter.belongsTo('book').reload();
    }).then(function(book) {
      assert.equal(book.get('name'), "updated book title");

      done();
    });
  });
});

testInDebug("A belongsTo relationship warns if malformatted data is pushed into the store", function(assert) {
  assert.expectAssertion(function() {
    run(function() {
      let chapter = env.store.push({
        data: {
          type: 'chapter',
          id: 1,
          relationships: {
            book: {
              data: { id: 1, name: 'The Gallic Wars' }
            }
          }
        }
      });
      chapter.get('book');
    });
  }, /expected the data for the book relationship on a <chapter:1> to be in a JSON API format/);
});

test("belongsTo relationship with links doesn't trigger extra change notifications - #4942", function(assert) {
  Chapter.reopen({
    book: DS.belongsTo({ async: true })
  });

  run(() => {
    env.store.push({
      data: {
        type: 'chapter',
        id: '1',
        relationships: {
          book: {
            data: { type: 'book', id: '1' },
            links: { related: '/chapter/1/book' }
          }
        }
      },
      included: [{ type: 'book', id: '1' }]
    });
  });

  let chapter = env.store.peekRecord('chapter', '1');
  let count = 0;

  chapter.addObserver('book', () => {
    count++;
  });

  run(() => {
    chapter.get('book');
  });

  assert.equal(count, 0);
});
