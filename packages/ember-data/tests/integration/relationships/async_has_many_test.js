var env, User, Contact, Email, Phone, Message, Post, Comment;
var get = Ember.get, set = Ember.set;

var attr = DS.attr, hasMany = DS.hasMany, belongsTo = DS.belongsTo;

function stringify(string) {
  return function() { return string; };
}

module("integration/relationships/async_has_many - Has-Many Relationships", {
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
      comments: hasMany('comment', { async: true })
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

test("When a hasMany relationship is accessed, the adapter's find/findMany method should not be called.", function() {
  expect(0);

  env.adapter.find = function() {
    ok(false, "The adapter's find method should not be called.");
  }
  env.adapter.findMany = function() {
    ok(false, "The adapter's findMany method should not be called");
  };

  env.store.push('post', { id: 1, comments: [ 1 ] });
  // env.store.push('comment', { id: 1 });

  env.store.find('post', 1).then(async(function(post) {
    post.get('comments');
  }));
});

test("Accessing a record in a hasMany relationship should trigger the adapter's find method.", function() {
  expect(2);


  env.adapter.find = function(store, type, id, record) {
    notEqual(id, "2", "Find method should be called with the correct id.");

    return { id: id };
  };

  env.store.push('post', { id: 1, comments: [ 1, 2, 3 ] });

  env.store.find('post', 1).then(async(function(post) {
    post.get('comments').then(async(function(comments) {
      comments.objectAt(0);
    }));
  }));
});

