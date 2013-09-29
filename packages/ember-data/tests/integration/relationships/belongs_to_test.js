var env, store, User, Message, Post, Comment;
var get = Ember.get, set = Ember.set;

var attr = DS.attr, hasMany = DS.hasMany, belongsTo = DS.belongsTo;
var resolve = Ember.RSVP.resolve, hash = Ember.RSVP.hash;

function stringify(string) {
  return function() { return string; };
}

module("integration/relationship/belongs_to Belongs-To Relationships", {
  setup: function() {
    User = DS.Model.extend({
      name: attr('string'),
      messages: hasMany('message', {polymorphic: true}),
      favouriteMessage: belongsTo('message', {polymorphic: true})
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

    env = setupStore({
      user: User,
      post: Post,
      comment: Comment,
      message: Message
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
    user: DS.belongsTo('user', { async: true })
  });

  env.adapter.find = function(store, type, id) {
    ok(true, "The adapter's find method should be called");
    return Ember.RSVP.resolve({ id: 1 });
  };

  env.store.push('post', { id: 1, user: 2});

  env.store.find('post', 1).then(async(function(post) {
    post.get('user');
  }));
});

test("Only a record of the same type can be used with a monomorphic belongsTo relationship", function() {
  expect(1);

  store.push('post', { id: 1 });
  store.push('comment', { id: 2 });

  hash({ post: store.find('post', 1), comment: store.find('comment', 2) }).then(async(function(records) {
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

  hash({ message: store.find('post', 1), comment: store.find('comment', 2) }).then(async(function(records) {
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
    ok(true, "The group is loaded");
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
