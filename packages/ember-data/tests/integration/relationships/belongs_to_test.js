var env, store, User, Message, Post, Comment, Book, Author;
var NewMessage;
var get = Ember.get;

var attr = DS.attr, hasMany = DS.hasMany, belongsTo = DS.belongsTo;
var hash = Ember.RSVP.hash;

function stringify(string) {
  return function() { return string; };
}

module("integration/relationship/belongs_to Belongs-To Relationships", {
  setup: function() {
    User = DS.Model.extend({
      name: attr('string'),
      messages: hasMany('message', {polymorphic: true})
      //favouriteMessage: belongsTo('message', {polymorphic: true})
    });
    User.toString = stringify('User');

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
    env.container.destroy();
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

  env.store.push('post', {
    id: 1,
    user: 2
  });

  env.store.find('post', 1).then(async(function(post) {
    post.get('user');
  }));
});

test("Only a record of the same type can be used with a monomorphic belongsTo relationship", function() {
  expect(1);

  store.push('post', { id: 1 });
  store.push('comment', { id: 2 });

  hash({
    post: store.find('post', 1),
    comment: store.find('comment', 2)
  }).then(async(function(records) {
    expectAssertion(function() {
      records.post.set('user', records.comment);
    }, /You can only add a 'user' record to this relationship/);
  }));
});

test("Only a record of the same base type can be used with a polymorphic belongsTo relationship", function() {
  expect(1);
  store.push('comment', { id: 1 });
  store.push('comment', { id: 2 });
  store.push('post', { id: 1 });
  store.push('user', { id: 3 });

  var asyncRecords = hash({
    user: store.find('user', 3),
    post: store.find('post', 1),
    comment: store.find('comment', 1),
    anotherComment: store.find('comment', 2)
  });

  asyncRecords.then(async(function(records) {
    var comment = records.comment;

    comment.set('message', records.anotherComment);
    comment.set('message', records.post);
    comment.set('message', null);

    expectAssertion(function() {
      comment.set('message', records.user);
    }, /You can only add a 'message' record to this relationship/);
  }));
});

test("The store can load a polymorphic belongsTo association", function() {
  env.store.push('post', { id: 1 });
  env.store.push('comment', { id: 2, message: 1, messageType: 'post' });

  hash({
    message: store.find('post', 1),
    comment: store.find('comment', 2)
  }).then(async(function(records) {
    equal(records.comment.get('message'), records.message);
  }));
});

test("The store can serialize a polymorphic belongsTo association", function() {
  env.serializer.serializePolymorphicType = function(record, json, relationship) {
    ok(true, "The serializer's serializePolymorphicType method should be called");
    json["message_type"] = "post";
  };
  env.store.push('post', { id: 1 });
  env.store.push('comment', { id: 2, message: 1, messageType: 'post' });

  store.find('comment', 2).then(async(function(comment) {
    var serialized = store.serialize(comment, { includeId: true });
    equal(serialized['message'], 1);
    equal(serialized['message_type'], 'post');
  }));
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

  store.push('person', { id: 1, links: { group: '/people/1/group' } });

  env.adapter.find = function() {
    throw new Error("Adapter's find method should not be called");
  };

  env.adapter.findBelongsTo = async(function(store, record, link, relationship) {
    equal(relationship.type, Group);
    equal(relationship.key, 'group');
    equal(link, "/people/1/group");

    return Ember.RSVP.resolve({ id: 1, people: [1] });
  });

  env.store.find('person', 1).then(async(function(person) {
    return person.get('group');
  })).then(async(function(group) {
    ok(group instanceof Group, "A group object is loaded");
    ok(group.get('id') === '1', 'It is the group we are expecting');
  }));
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

  store.push('person', { id: 1, links: { seat: '/people/1/seat' } });

  env.adapter.find = function() {
    throw new Error("Adapter's find method should not be called");
  };

  env.adapter.findBelongsTo = async(function(store, record, link, relationship) {
    return Ember.RSVP.resolve({ id: 1});
  });

  env.store.find('person', 1).then(async(function(person) {
    person.get('seat').then(async(function(seat) {
        // this assertion fails too
        // ok(seat.get('person') === person, 'parent relationship should be populated');
        seat.set('person', person);
        ok(person.get('seat').then, 'seat should be a PromiseObject');
    }));
  }));
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

  store.push('person', { id: 1, links: { group: '/people/1/group' } });

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

test("TODO (embedded): The store can load an embedded polymorphic belongsTo association", function() {
  expect(0);
  //serializer.keyForEmbeddedType = function() {
    //return 'embeddedType';
  //};

  //adapter.load(store, App.User, { id: 2, favourite_message: { id: 1, embeddedType: 'comment'}});

  //var user = store.find(App.User, 2),
      //message = store.find(App.Comment, 1);

  //equal(user.get('favouriteMessage'), message);
});

test("TODO (embedded): The store can serialize an embedded polymorphic belongsTo association", function() {
  expect(0);
  //serializer.keyForEmbeddedType = function() {
    //return 'embeddedType';
  //};
  //adapter.load(store, App.User, { id: 2, favourite_message: { id: 1, embeddedType: 'comment'}});

  //var user = store.find(App.User, 2),
      //serialized = store.serialize(user, {includeId: true});

  //ok(serialized.hasOwnProperty('favourite_message'));
  //equal(serialized.favourite_message.id, 1);
  //equal(serialized.favourite_message.embeddedType, 'comment');
});

test("relationshipsByName does not cache a factory", function() {

  // The model is loaded up via a container. It has relationshipsByName
  // called on it.
  var modelViaFirstFactory = store.modelFor('user');
  get(modelViaFirstFactory, 'relationshipsByName');

  // An app is reset, or the container otherwise destroyed.
  env.container.destroy();

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

test("asdf", function() {
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

  env.store.push('post', {
    id: 1,
    comments: [1, 2, 3]
  });

  var comment = env.store.push('comment', {
    id:   1,
    post: 1
  });

  env.adapter.deleteRecord = function(store, type, record) {
    ok(record instanceof type);
    equal(record.id, 1, 'should first comment');
    return record;
  };

  env.adapter.findMany = function(store, type, ids, records) {
    ok(false, 'should not need to findMay more comments, but attempted to anyways');
  };

  comment.destroyRecord();
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

  post = env.store.push('post', {
    id: 1,
    user: 2
  });

  env.adapter.find = function() {
    throw new Error("Adapter's find method should not be called");
  };

  env.adapter.deleteRecord = function(store, type, record) {
    ok(record instanceof type);
    equal(record.id, 1, 'should first post');
    return record;
  };

  post.destroyRecord();
});

test("A sync belongsTo errors out if the record is unlaoded", function() {
  var message = env.store.push('message', { id: 1, user: 2 });

  expectAssertion(function() {
    message.get('user');
  }, /You looked up the 'user' relationship on a 'message' with id 1 but some of the associated records were not loaded. Either make sure they are all loaded together with the parent record, or specify that the relationship is async \(`DS.belongsTo\({ async: true }\)`\)/);
});

test("Rollbacking a deleted record restores implicit relationship - async", function () {
  Book.reopen({
    author: DS.belongsTo('author', { async: true })
  });
  var book = env.store.push('book', { id: 1, name: "Stanley's Amazing Adventures", author: 2 });
  var author = env.store.push('author', { id: 2, name: 'Stanley' });
  author.deleteRecord();
  author.rollback();
  book.get('author').then(async(function(fetchedAuthor) {
    equal(fetchedAuthor, author, 'Book has an author after rollback');
  }));
});

test("Rollbacking a deleted record restores implicit relationship - sync", function () {
  var book = env.store.push('book', { id: 1, name: "Stanley's Amazing Adventures", author: 2 });
  var author = env.store.push('author', { id: 2, name: 'Stanley' });
  author.deleteRecord();
  author.rollback();
  equal(book.get('author'), author, 'Book has an author after rollback');
});
