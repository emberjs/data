var env, User, Message, Post, Comment;
var get = Ember.get, set = Ember.set;

var attr = DS.attr, hasMany = DS.hasMany, belongsTo = DS.belongsTo;

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

    env.container.register('serializer:user', DS.NewJSONSerializer.extend({
      attrs: {
        favouriteMessage: { embedded: 'always' }
      }
    }));
  },

  teardown: function() {
    env.container.destroy();
  }
});

test("The store can materialize a non loaded monomorphic belongsTo association", function() {
  expect(1);
  env.store.push('post', { id: 1, user: 2});
  var post = env.store.find('post', 1);

  env.adapter.find = function(store, type, id) {
    ok(true, "The adapter's find method should be called");
  };

  post.get('user');
});

test("Only a record of the same type can be used with a monomorphic belongsTo relationship", function() {
  expect(1);

  env.store.push('post', { id: 1 });
  env.store.push('comment', { id: 2 });
  var post = env.store.find('post', 1),
      comment = env.store.find('comment', 2);

  expectAssertion(function() {
    post.set('user', comment);
  }, /You can only add a 'user' record to this relationship/);
});

test("Only a record of the same base type can be used with a polymorphic belongsTo relationship", function() {
  expect(1);
  env.store.push('comment', { id: 1 });
  env.store.push('comment', { id: 2 });
  env.store.push('post', { id: 1 });
  env.store.push('user', { id: 3 });

  var user = env.store.find('user', 3),
      post = env.store.find('post', 1),
      comment = env.store.find('comment', 1),
      anotherComment = env.store.find('comment', 2);

  comment.set('message', anotherComment);
  comment.set('message', post);
  comment.set('message', null);

  expectAssertion(function() {
    comment.set('message', user);
  }, /You can only add a 'message' record to this relationship/);
});

test("The store can load a polymorphic belongsTo association", function() {
  env.store.push('post', { id: 1 });
  env.store.push('comment', { id: 2, message: 1, message_type: 'post' });

  var message = env.store.find('post', 1),
      comment = env.store.find('comment', 2);

  equal(comment.get('message'), message);
});

test("The store can serialize a polymorphic belongsTo association", function() {
  env.store.push('post', { id: 1 });
  env.store.push('comment', { id: 2, message: 1, message_type: 'post' });

  var comment = env.store.find('comment', 2);

  var serialized = env.store.serialize(comment, { includeId: true });
  equal(serialized['message'], 1);
  equal(serialized['message_type'], 'post');
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
