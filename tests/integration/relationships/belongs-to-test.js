import { get } from '@ember/object';
import { run } from '@ember/runloop';
import RSVP, { resolve } from 'rsvp';
import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {
  setup as setupModelFactoryInjections,
  reset as resetModelFactoryInjection
} from 'dummy/tests/helpers/model-factory-injection';
import { module, test } from 'qunit';

import DS from 'ember-data';

const { attr, hasMany, belongsTo } = DS;
const { hash } = RSVP;

let env, store, User, Message, Post, Comment, Book, Chapter, Author, NewMessage;

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
    resetModelFactoryInjection();
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
    return resolve({
      data: {
        id,
        type: snapshot.modelName
      }
    });
  };

  run(() => {
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

  return run(() => {
    return env.store.findRecord('post', 1).then(post => {
      post.get('user');
    });
  });
});

testInDebug("Only a record of the same modelClass can be used with a monomorphic belongsTo relationship", function(assert) {
  assert.expect(1);
  env.adapter.shouldBackgroundReloadRecord = () => false;
  run(() => {
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


  return run(() => {
    return hash({
      post: store.findRecord('post', 1),
      comment: store.findRecord('comment', 2)
    }).then(records => {
      assert.expectAssertion(() => {
        records.post.set('user', records.comment);
      }, /You cannot add a record of modelClass 'comment' to the 'post.user' relationship/);
    });
  });
});

testInDebug("Only a record of the same base modelClass can be used with a polymorphic belongsTo relationship", function(assert) {
  env.adapter.shouldBackgroundReloadRecord = () => false;
  assert.expect(1);
  run(() => {
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

  return run(() => {
    let asyncRecords = hash({
      user: store.findRecord('user', 3),
      post: store.findRecord('post', 1),
      comment: store.findRecord('comment', 1),
      anotherComment: store.findRecord('comment', 2)
    });

    return asyncRecords.then(records =>  {
      let comment = records.comment;

      comment.set('message', records.anotherComment);
      comment.set('message', records.post);
      comment.set('message', null);

      assert.expectAssertion(() => {
        comment.set('message', records.user);
      }, /You cannot add a record of modelClass 'user' to the 'comment.message' relationship \(only 'message' allowed\)/);
    });
  });
});

test("The store can load a polymorphic belongsTo association", function(assert) {
  env.adapter.shouldBackgroundReloadRecord = () => false;
  run(() => {
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

  return run(() => {
    return hash({
      message: store.findRecord('post', 1),
      comment: store.findRecord('comment', 2)
    }).then(records => {
      assert.equal(records.comment.get('message'), records.message);
    });
  });
});

test("The store can serialize a polymorphic belongsTo association", function(assert) {
  env.adapter.shouldBackgroundReloadRecord = () => false;
  let serializerInstance = store.serializerFor('comment');

  serializerInstance.serializePolymorphicType = function(record, json, relationship) {
    assert.ok(true, "The serializer's serializePolymorphicType method should be called");
    json["message_type"] = "post";
  };

  return run(() => {
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

    return store.findRecord('comment', 2).then(comment => {
      let serialized = comment.serialize({ includeId: true });
      assert.equal(serialized.data.relationships.message.data.id, 1);
      assert.equal(serialized.data.relationships.message.data.type, 'posts');
    });
  });
});

test("A serializer can materialize a belongsTo as a link that gets sent back to findBelongsTo", function(assert) {
  env.adapter.shouldBackgroundReloadRecord = () => false;
  let Group = DS.Model.extend({
    people: DS.hasMany('person', { async: false })
  });

  let Person = DS.Model.extend({
    group: DS.belongsTo({ async: true })
  });

  env.registry.register('model:group', Group);
  env.registry.register('model:person', Person);

  run(() => {
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

  env.adapter.findBelongsTo = function(store, snapshot, link, relationship) {
    assert.equal(relationship.type, 'group');
    assert.equal(relationship.key, 'group');
    assert.equal(link, "/people/1/group");

    return resolve({
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
  };

  return run(() => {
    return env.store.findRecord('person', 1).then(person => {
      return person.get('group');
    }).then(group => {
      assert.ok(group instanceof Group, "A group object is loaded");
      assert.ok(group.get('id') === '1', 'It is the group we are expecting');
    });
  });
});

test('A record with an async belongsTo relationship always returns a promise for that relationship', function(assert) {
  env.adapter.shouldBackgroundReloadRecord = () => false;
  let Seat = DS.Model.extend({
    person: DS.belongsTo('person', { async: false })
  });

  let Person = DS.Model.extend({
    seat: DS.belongsTo('seat', { async: true })
  });

  env.registry.register('model:seat', Seat);
  env.registry.register('model:person', Person);

  run(() => {
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

  env.adapter.findBelongsTo = function(store, snapshot, link, relationship) {
    return resolve({ data: { id: 1, type: 'seat' } });
  };

  return run(() => {
    return env.store.findRecord('person', 1).then(person => {
      return person.get('seat').then(seat => {
        // this assertion fails too
        // ok(seat.get('person') === person, 'parent relationship should be populated');
        seat.set('person', person);
        assert.ok(person.get('seat').then, 'seat should be a PromiseObject');
      });
    });
  });
});

test("A record with an async belongsTo relationship returning null should resolve null", function(assert) {
  assert.expect(1);

  env.adapter.shouldBackgroundReloadRecord = () => false;
  let Group = DS.Model.extend({
    people: DS.hasMany('person', { async: false })
  });

  let Person = DS.Model.extend({
    group: DS.belongsTo({ async: true })
  });

  env.registry.register('model:group', Group);
  env.registry.register('model:person', Person);

  run(() => {
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

  env.adapter.findBelongsTo = function(store, snapshot, link, relationship) {
    return resolve({ data: null });
  };

  return env.store.findRecord('person', '1').then(person => {
    return person.get('group');
  }).then(group => {
    assert.ok(group === null, "group should be null");
  });
});

test("A record can be created with a resolved belongsTo promise", function(assert) {
  assert.expect(1);

  env.adapter.shouldBackgroundReloadRecord = () => false;
  let Group = DS.Model.extend({
    people: DS.hasMany('person', { async: false })
  });

  let Person = DS.Model.extend({
    group: DS.belongsTo({ async: true })
  });

  env.registry.register('model:group', Group);
  env.registry.register('model:person', Person);

  run(() => {
    store.push({
      data: {
        id: 1,
        type: 'group'
      }
    });
  });

  let groupPromise = store.findRecord('group', 1);
  return groupPromise.then(group => {
    let person = env.store.createRecord('person', {
      group: groupPromise
    });
    assert.equal(person.get('group.content'), group);
  });
});

test("polymorphic belongsTo class-checks check the superclass when MODEL_FACTORY_INJECTIONS is enabled", function(assert) {
  assert.expect(1);

  run(() => {
    let igor = env.store.createRecord('user', { name: 'Igor' });
    let post = env.store.createRecord('post', { title: "Igor's unimaginative blog post" });

    igor.set('favouriteMessage', post);

    assert.equal(igor.get('favouriteMessage.title'), "Igor's unimaginative blog post");
  });
});

test("the subclass in a polymorphic belongsTo relationship is an instanceof its superclass", function(assert) {
  setupModelFactoryInjections(false);
  assert.expect(1);
  run(() => {
    let message = env.store.createRecord('message', { id: 1 });
    let comment = env.store.createRecord('comment', { id: 2, message: message });
    assert.ok(comment instanceof Message, 'a comment is an instance of a message');
  });
});

test("relationshipsByName does not cache a factory", function(assert) {

  // The model is loaded up via a container. It has relationshipsByName
  // called on it.
  let modelViaFirstFactory = store.modelFor('user');
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
  let modelViaSecondFactory = store.modelFor('user');
  let relationshipsByName   = get(modelViaSecondFactory, 'relationshipsByName');
  let messageType           = relationshipsByName.get('messages').type;

  // A model is looked up in the store based on a string, via user input
  let messageModelFromStore        = store.modelFor('message');
  // And the model is lookup up internally via the relationship type
  let messageModelFromRelationType = store.modelFor(messageType);

  assert.equal(messageModelFromRelationType, messageModelFromStore,
        "model factory based on relationship type matches the model based on store.modelFor");
});

test("relationshipsByName is cached in production", function(assert) {
  let model = store.modelFor('user');
  let oldTesting = Ember.testing;
  //We set the cacheable to true because that is the default state for any CP and then assert that it
  //did not get dynamically changed when accessed
  let relationshipsByName = model.relationshipsByName;
  let oldCacheable = relationshipsByName._cacheable;
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
  let model = store.modelFor('user');
  let oldTesting = Ember.testing;
  //We set the cacheable to true because that is the default state for any CP and then assert that it
  //did not get dynamically changed when accessed
  let relatedTypes = model.relatedTypes;
  let oldCacheable = relatedTypes._cacheable;
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
  let model = store.modelFor('user');
  let oldTesting = Ember.testing;
  //We set the cacheable to true because that is the default state for any CP and then assert that it
  //did not get dynamically changed when accessed
  let relationships = model.relationships;
  let oldCacheable = relationships._cacheable;
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
  let comment;
  run(() => {
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
  let post;

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

  run(() => {
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
  let message;
  run(() => {
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

  assert.expectAssertion(() => {
    message.get('user');
  }, /You looked up the 'user' relationship on a 'message' with id 1 but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async \(`DS.belongsTo\({ async: true }\)`\)/);
});

test("Rollbacking attributes for a deleted record restores implicit relationship - async", function(assert) {
  Book.reopen({
    author: DS.belongsTo('author', { async: true })
  });
  let book, author;
  run(() => {
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
  return run(() => {
    author.deleteRecord();
    author.rollbackAttributes();

    return book.get('author').then(fetchedAuthor => {
      assert.equal(fetchedAuthor, author, 'Book has an author after rollback attributes');
    });
  });
});

test("Rollbacking attributes for a deleted record restores implicit relationship - sync", function(assert) {
  let book, author;

  run(() => {
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

  run(() =>{
    author.deleteRecord();
    author.rollbackAttributes();
  });

  assert.equal(book.get('author'), author, 'Book has an author after rollback attributes');
});

testInDebug("Passing a model as type to belongsTo should not work", function(assert) {
  assert.expect(1);

  assert.expectAssertion(() => {
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
    return resolve({
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

  return run(() => {
    return store.findRecord('book', 1).then(book => {
      let relationship = book._internalModel._relationships.get('author');
      assert.equal(relationship.hasData, true, 'relationship has data');
    });
  });
});

test("belongsTo hasData sync loaded", function(assert) {
  assert.expect(1);

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return resolve({
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

  return run(() => {
    return store.findRecord('book', 1).then(book => {
      let relationship = book._internalModel._relationships.get('author');
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
    return resolve({
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

  return run(() => {
    return store.findRecord('book', 1).then(book => {
      let relationship = book._internalModel._relationships.get('author');
      assert.equal(relationship.hasData, false, 'relationship does not have data');
    });
  });
});

test("belongsTo hasData sync not loaded", function(assert) {
  assert.expect(1);

  env.adapter.findRecord = function(store, type, id, snapshot) {
    return resolve({
      data: {
        id: 1,
        type: 'book',
        attributes: { name: 'The Greatest Book' }
      }
    });
  }

  return run(() => {
    return store.findRecord('book', 1).then(book => {
      let relationship = book._internalModel._relationships.get('author');
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
  let user;

  run(() => {
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
  let user, message;

  run(() => {
    message = env.store.createRecord('message');
    user = env.store.createRecord('user', {
      name: 'John Doe',
      favouriteMessage: message
    });
    assert.ok(user._internalModel._relationships.has('favouriteMessage'), "Newly created record with relationships in params passed in its constructor should have relationships");
  });
});

test("Model's belongsTo relationship should be created during 'set' method", function(assert) {
  let user, message;

  run(() => {
    message = env.store.createRecord('message');
    user = env.store.createRecord('user');
    user.set('favouriteMessage', message);
    assert.ok(user._internalModel._relationships.has('favouriteMessage'), "Newly created record with relationships in params passed in its constructor should have relationships");
  });
});

test("Model's belongsTo relationship should be created during 'get' method", function(assert) {
  let user;

  run(() => {
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
    return resolve({
      data: {
        id: 1,
        type: 'author',
        attributes: { name: 'This is author' }
      }
    });
  };

  return run(() => {
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

    return book.get('author').then(author => {
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
    return resolve({
      data: {
        id: 1,
        type: 'author',
        attributes: { name: 'This is author' }
      }
    });
  };

  return run(() => {
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

    return book.get('author').then(author => {
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
    return resolve({
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

  return run(() => {
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
    return resolve({
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

  return run(() => {
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

    return book.get('author').then((author) => {
      assert.equal(author.get('name'), 'This is author', 'author name is correct');
    }).then(() => {
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

      return book.get('author').then((author) => {
        assert.equal(author.get('name'), 'This is updated author', 'author name is correct');
      });
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

  return run(() => {
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

    return book.get('author').then((author) => {
      assert.equal(author.get('name'), 'This is author', 'author name is correct');
    }).then(() => {

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

      return book.get('author').then((author) => {
        assert.equal(author.get('name'), 'This is author', 'author name is correct');
      });
    });
  });
});

test("A belongsTo relationship can be reloaded using the reference if it was fetched via link", function(assert) {
  Chapter.reopen({
    book: DS.belongsTo({ async: true })
  });

  env.adapter.findRecord = function() {
    return resolve({
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
    return resolve({
      data: {
        id: 1,
        type: 'book',
        attributes: { name: "book title" }
      }
    });
  };

  return run(() => {
    let chapter;

    return store.findRecord('chapter', 1).then(_chapter => {
      chapter = _chapter;

      return chapter.get('book');
    }).then(book =>  {
      assert.equal(book.get('name'), "book title");

      env.adapter.findBelongsTo = function() {
        return resolve({
          data: {
            id: 1,
            type: 'book',
            attributes: { name: "updated book title" }
          }
        });
      };

      return chapter.belongsTo('book').reload();
    }).then(book => {
      assert.equal(book.get('name'), "updated book title");
    });
  });
});

test("A sync belongsTo relationship can be reloaded using a reference if it was fetched via id", function(assert) {
  Chapter.reopen({
    book: DS.belongsTo()
  });

  let chapter;
  run(() => {
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
    return resolve({
      data: {
        id: 1,
        type: 'book',
        attributes: { name: 'updated book title' }
      }
    });
  };

  return run(() => {
    let book = chapter.get('book');
    assert.equal(book.get('name'), "book title");

    return chapter.belongsTo('book').reload().then(function(book) {
      assert.equal(book.get('name'), "updated book title");
    });
  });
});

test("A belongsTo relationship can be reloaded using a reference if it was fetched via id", function(assert) {
  Chapter.reopen({
    book: DS.belongsTo({ async: true })
  });

  let chapter;
  run(() => {
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
    return resolve({
      data: {
        id: 1,
        type: 'book',
        attributes: { name: "book title" }
      }
    });
  };

  return run(() => {
    return chapter.get('book').then(book => {
      assert.equal(book.get('name'), "book title");

      env.adapter.findRecord = function() {
        return resolve({
          data: {
            id: 1,
            type: 'book',
            attributes: { name: "updated book title" }
          }
        });
      };

      return chapter.belongsTo('book').reload();
    }).then(book => {
      assert.equal(book.get('name'), "updated book title");
    });
  });
});

testInDebug("A belongsTo relationship warns if malformatted data is pushed into the store", function(assert) {
  assert.expectAssertion(() => {
    run(() => {
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
