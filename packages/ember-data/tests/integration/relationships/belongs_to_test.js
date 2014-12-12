var env, store, User, Message, Post, Comment, Book, Author, NewMessage;
var get = Ember.get;
var run = Ember.run;

var attr = DS.attr, hasMany = DS.hasMany, belongsTo = DS.belongsTo;
var hash = Ember.RSVP.hash;

function stringify(string) {
  return function() { return string; };
}

module("integration/relationship/belongs_to Belongs-To Relationships", {
  setup: function() {
    User = DS.Model.extend({
      name: attr('string'),
      messages: hasMany('message', {polymorphic: true}),
      favouriteMessage: belongsTo('message', {polymorphic: true, inverse: null}),
    });
    User.toString = stringify('User');

    Message = DS.Model.extend({
      user: belongsTo('user', { inverse: 'messages' }),
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
      message: DS.belongsTo('message', { polymorphic: true })
    });
    Comment.toString = stringify('Comment');

    Book = DS.Model.extend({
      name: attr('string'),
      author: belongsTo('author')
    });
    Book.toString = stringify('Book');

    Author = DS.Model.extend({
      name: attr('string')
    });
    Author.toString = stringify('Author');

    env = setupStore({
      user: User,
      post: Post,
      comment: Comment,
      message: Message,
      book: Book,
      author: Author
    });

    env.container.register('serializer:user', DS.JSONSerializer.extend({
      attrs: {
        favouriteMessage: { embedded: 'always' }
      }
    }));

    store = env.store;
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

  env.adapter.find = function(store, type, id) {
    ok(true, "The adapter's find method should be called");
    return Ember.RSVP.resolve({
      id: 1
    });
  };

  run(function(){
    env.store.push('post', {
      id: 1,
      user: 2
    });
  });

  run(function(){
    env.store.find('post', 1).then(function(post) {
      post.get('user');
    });
  });
});

test("Only a record of the same type can be used with a monomorphic belongsTo relationship", function() {
  expect(1);

  run(function(){
    store.push('post', { id: 1 });
    store.push('comment', { id: 2 });
  });

  run(function(){
    hash({
      post: store.find('post', 1),
      comment: store.find('comment', 2)
    }).then(function(records) {
      expectAssertion(function() {
        records.post.set('user', records.comment);
      }, /You can only add a 'user' record to this relationship/);
    });
  });
});

test("Only a record of the same base type can be used with a polymorphic belongsTo relationship", function() {
  expect(1);
  run(function(){
    store.push('comment', { id: 1 });
    store.push('comment', { id: 2 });
    store.push('post', { id: 1 });
    store.push('user', { id: 3 });
  });

  run(function(){
    var asyncRecords = hash({
      user: store.find('user', 3),
      post: store.find('post', 1),
      comment: store.find('comment', 1),
      anotherComment: store.find('comment', 2)
    });

    asyncRecords.then(function(records) {
      var comment = records.comment;

      comment.set('message', records.anotherComment);
      comment.set('message', records.post);
      comment.set('message', null);

      expectAssertion(function() {
        comment.set('message', records.user);
      }, /You can only add a 'message' record to this relationship/);
    });
  });
});

test("The store can load a polymorphic belongsTo association", function() {
  run(function(){
    env.store.push('post', { id: 1 });
    env.store.push('comment', { id: 2, message: 1, messageType: 'post' });
  });

  run(function(){
    hash({
      message: store.find('post', 1),
      comment: store.find('comment', 2)
    }).then(function(records) {
      equal(records.comment.get('message'), records.message);
    });
  });
});

test("The store can serialize a polymorphic belongsTo association", function() {
  env.serializer.serializePolymorphicType = function(record, json, relationship) {
    ok(true, "The serializer's serializePolymorphicType method should be called");
    json["message_type"] = "post";
  };
  run(function(){
    env.store.push('post', { id: 1 });
    env.store.push('comment', { id: 2, message: 1, messageType: 'post' });

    store.find('comment', 2).then(function(comment) {
      var serialized = store.serialize(comment, { includeId: true });
      equal(serialized['message'], 1);
      equal(serialized['message_type'], 'post');
    });
  });
});

test("A serializer can materialize a belongsTo as a link that gets sent back to findBelongsTo", function() {
  var Group = DS.Model.extend({
    people: DS.hasMany()
  });

  var Person = DS.Model.extend({
    group: DS.belongsTo({ async: true })
  });

  env.container.register('model:group', Group);
  env.container.register('model:person', Person);

  run(function(){
    store.push('person', { id: 1, links: { group: '/people/1/group' } });
  });

  env.adapter.find = function() {
    throw new Error("Adapter's find method should not be called");
  };

  env.adapter.findBelongsTo = async(function(store, record, link, relationship) {
    equal(relationship.type, Group);
    equal(relationship.key, 'group');
    equal(link, "/people/1/group");

    return Ember.RSVP.resolve({ id: 1, people: [1] });
  });

  run(function(){
    env.store.find('person', 1).then(function(person) {
      return person.get('group');
    }).then(function(group) {
      ok(group instanceof Group, "A group object is loaded");
      ok(group.get('id') === '1', 'It is the group we are expecting');
    });
  });
});

test('A record with an async belongsTo relationship always returns a promise for that relationship', function () {
  var Seat = DS.Model.extend({
    person: DS.belongsTo('person')
  });

  var Person = DS.Model.extend({
    seat: DS.belongsTo('seat', { async: true })
  });

  env.container.register('model:seat', Seat);
  env.container.register('model:person', Person);

  run(function(){
    store.push('person', { id: 1, links: { seat: '/people/1/seat' } });
  });

  env.adapter.find = function() {
    throw new Error("Adapter's find method should not be called");
  };

  env.adapter.findBelongsTo = async(function(store, record, link, relationship) {
    return Ember.RSVP.resolve({ id: 1});
  });

  run(function(){
    env.store.find('person', 1).then(function(person) {
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

  var Group = DS.Model.extend({
    people: DS.hasMany()
  });

  var Person = DS.Model.extend({
    group: DS.belongsTo({ async: true })
  });

  env.container.register('model:group', Group);
  env.container.register('model:person', Person);

  run(function(){
    store.push('person', { id: 1, links: { group: '/people/1/group' } });
  });

  env.adapter.find = function() {
    throw new Error("Adapter's find method should not be called");
  };

  env.adapter.findBelongsTo = async(function(store, record, link, relationship) {
    return Ember.RSVP.resolve(null);
  });

  env.store.find('person', 1).then(async(function(person) {
    return person.get('group');
  })).then(async(function(group) {
    ok(group === null, "group should be null");
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
  NewMessage.toString = stringify('Message');

  // A new store is created.
  env = setupStore({
    user: User,
    message: NewMessage
  });
  store = env.store;

  // relationshipsByName is called again.
  var modelViaSecondFactory = store.modelFor('user'),
      relationshipsByName   = get(modelViaSecondFactory, 'relationshipsByName'),
      messageType           = relationshipsByName.get('messages').type;

  // A model is looked up in the store based on a string, via user input
  var messageModelFromStore        = store.modelFor('message');
  // And the model is lookup up internally via the relationship type
  var messageModelFromRelationType = store.modelFor(messageType);

  equal( messageModelFromRelationType, messageModelFromStore,
         "model factory based on relationship type matches the model based on store.modelFor" );
});

test("relationshipsByName is cached in production", function() {
  var model = store.modelFor('user');
  var oldTesting = Ember.testing;
  //We set the cacheable to true because that is the default state for any CP and then assert that it
  //did not get dynamically changed when accessed
  var oldCacheable = Ember.meta(model).descs.relationshipsByName._cacheable;
  Ember.meta(model).descs.relationshipsByName._cacheable = true;
  Ember.testing = false;
  try {
    equal(get(model, 'relationshipsByName'), get(model, 'relationshipsByName'), 'relationshipsByName are cached');
    equal(get(model, 'relationshipsByName'), get(model, 'relationshipsByName'), 'relationshipsByName are cached');
  } finally {
    Ember.testing = oldTesting;
    Ember.meta(model).descs.relationshipsByName._cacheable = oldCacheable;
  }
});

test("relatedTypes is cached in production", function() {
  var model = store.modelFor('user');
  var oldTesting = Ember.testing;
  //We set the cacheable to true because that is the default state for any CP and then assert that it
  //did not get dynamically changed when accessed
  var oldCacheable = Ember.meta(model).descs.relatedTypes._cacheable;
  Ember.meta(model).descs.relatedTypes._cacheable = true;
  Ember.testing = false;
  try {
    equal(get(model, 'relatedTypes'), get(model, 'relatedTypes'), 'relatedTypes are cached');
    equal(get(model, 'relatedTypes'), get(model, 'relatedTypes'), 'relatedTypes are cached');
  } finally {
    Ember.testing = oldTesting;
    Ember.meta(model).descs.relatedTypes._cacheable = oldCacheable;
  }
});

test("relationships is cached in production", function() {
  var model = store.modelFor('user');
  var oldTesting = Ember.testing;
  //We set the cacheable to true because that is the default state for any CP and then assert that it
  //did not get dynamically changed when accessed
  var oldCacheable = Ember.meta(model).descs.relatedTypes._cacheable;
  Ember.meta(model).descs.relationships._cacheable = true;
  Ember.testing = false;
  try {
    equal(get(model, 'relationships'), get(model, 'relationships'), 'relationships are cached');
    equal(get(model, 'relationships'), get(model, 'relationships'), 'relationships are cached');
  } finally {
    Ember.testing = oldTesting;
    Ember.meta(model).descs.relationships._cacheable = oldCacheable;
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
    post: DS.belongsTo('post', {
    })
  });
  var post, comment;
  run(function(){
    post = env.store.push('post', {
      id: 1,
      comments: [1, 2, 3]
    });

    comment = env.store.push('comment', {
      id:   1,
      post: 1
    });
  });

  env.adapter.deleteRecord = function(store, type, record) {
    ok(record instanceof type);
    equal(record.id, 1, 'should first comment');
    return record;
  };

  env.adapter.findMany = function(store, type, ids, records) {
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

  run(function(){
    post = env.store.push('post', {
      id: 1,
      user: 2
    });
  });

  env.adapter.find = function() {
    throw new Error("Adapter's find method should not be called");
  };

  env.adapter.deleteRecord = function(store, type, record) {
    ok(record instanceof type);
    equal(record.id, 1, 'should first post');
    return record;
  };

  run(post, 'destroyRecord');
});

test("A sync belongsTo errors out if the record is unlaoded", function() {
  var message;
  run(function(){
    message = env.store.push('message', { id: 1, user: 2 });
  });

  expectAssertion(function() {
    message.get('user');
  }, /You looked up the 'user' relationship on a 'message' with id 1 but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async \(`DS.belongsTo\({ async: true }\)`\)/);
});

test("Rollbacking a deleted record restores implicit relationship - async", function () {
  Book.reopen({
    author: DS.belongsTo('author', { async: true })
  });
  var book, author;
  run(function(){
    book = env.store.push('book', { id: 1, name: "Stanley's Amazing Adventures", author: 2 });
    author = env.store.push('author', { id: 2, name: 'Stanley' });
  });
  run(function(){
    author.deleteRecord();
    author.rollback();
    book.get('author').then(function(fetchedAuthor) {
      equal(fetchedAuthor, author, 'Book has an author after rollback');
    });
  });
});

test("Rollbacking a deleted record restores implicit relationship - sync", function () {
  var book, author;
  run(function(){
    book = env.store.push('book', { id: 1, name: "Stanley's Amazing Adventures", author: 2 });
    author = env.store.push('author', { id: 2, name: 'Stanley' });
  });
  run(function(){
    author.deleteRecord();
    author.rollback();
  });
  equal(book.get('author'), author, 'Book has an author after rollback');
});

test("Passing a model as type to belongsTo should not work", function () {
  expect(1);

  expectAssertion(function() {
    User = DS.Model.extend();

    Contact = DS.Model.extend({
      user: belongsTo(User)
    });
  }, /The first argument to DS.belongsTo must be a string/);
});
