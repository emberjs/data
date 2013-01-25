var Adapter, adapter, serializer, store, App;
var originalLookup = Ember.lookup, lookup;
var get = Ember.get, set = Ember.set;

module("Belongs-To Relationships", {
  setup: function() {
    lookup = Ember.lookup = {};

    serializer = DS.RESTSerializer.create();
    Adapter = DS.RESTAdapter.extend({
      serializer: serializer
    });
    Adapter.configure('App.Comment', {
      alias: 'comment'
    });
    Adapter.configure('App.Post', {
      alias: 'post'
    });

    App = Ember.Namespace.create({
      name: 'App'
    });

    App.User = DS.Model.extend({
      name: DS.attr('string'),
      messages: DS.hasMany('App.Message', {polymorphic: true}),
      favouriteMessage: DS.belongsTo('App.Message', {polymorphic: true})
    });

    App.Message = DS.Model.extend({
      user: DS.belongsTo('App.User'),
      created_at: DS.attr('date')
    });

    App.Post = App.Message.extend({
      title: DS.attr('string'),
      comments: DS.hasMany('App.Comment')
    });

    App.Comment = App.Message.extend({
      body: DS.attr('string'),
      message: DS.belongsTo('App.Message', {polymorphic: true})
    });

    Adapter.map(App.User, {
      favouriteMessage: {embedded: 'always'}
    });

    adapter = Adapter.create();
    store = DS.Store.create({
      adapter: adapter
    });

    lookup.App = {
      User: App.User,
      Post: App.Post,
      Comment: App.Comment,
      Message: App.Message
    };
  },

  teardown: function() {
    serializer.destroy();
    adapter.destroy();
    store.destroy();
    Ember.lookup = originalLookup;
  }
});

test("The store can materialize a non loaded monomorphic belongsTo association", function() {
  expect(1);
  store.load(App.Post, { id: 1, user_id: 2});
  var post = store.find(App.Post, 1);

  adapter.find = function(store, type, id) {
    ok(true, "The adapter's find method should be called");
  };

  post.get('user');
});

test("Only a record of the same type can be used with a monomorphic belongsTo relationship", function() {
  expect(1);
  store.load(App.Post, { id: 1 });
  store.load(App.Comment, { id: 2 });
  var post = store.find(App.Post, 1),
      comment = store.find(App.Comment, 2);

  raises(
    function() { post.set('user', comment); },
    /You can only add a record of App.User to this relationship/,
    "Adding a record of a different type on a monomorphic belongsTo is disallowed"
  );
});

test("Only a record of the same base type can be used with a polymorphic belongsTo relationship", function() {
  expect(1);
  store.load(App.Comment, { id: 1 });
  store.load(App.Comment, { id: 2 });
  store.load(App.Post, { id: 1 });
  store.load(App.User, { id: 3 });

  var user = store.find(App.User, 3),
      post = store.find(App.Post, 1),
      comment = store.find(App.Comment, 1),
      anotherComment = store.find(App.Comment, 2);

  comment.set('message', anotherComment);
  comment.set('message', post);
  comment.set('message', null);

  raises(
    function() { comment.set('message', user); },
    /You can only add a record of App.Message to this relationship/,
    "Adding a record of a different base type on a polymorphic belongsTo is disallowed"
  );
});

test("The store can load a polymorphic belongsTo association", function() {
  store.load(App.Post, { id: 1 });
  store.load(App.Comment, { id: 2, message_id: 1, message_type: 'post' });

  var message = store.find(App.Post, 1),
      comment = store.find(App.Comment, 2);

  equal(comment.get('message'), message);
});

test("The store can serialize a polymorphic belongsTo association", function() {
  store.load(App.Post, { id: 1 });
  store.load(App.Comment, { id: 2, message_id: 1, message_type: 'post' });

  var comment = store.find(App.Comment, 2);

  var serialized = store.serialize(comment, {includeId: true});
  equal(serialized.hasOwnProperty('message'), false);
  equal(serialized['message_id'], 1);
  equal(serialized['message_type'], 'post');
});

test("The store can load an embedded polymorphic belongsTo association", function() {
  serializer.keyForEmbeddedType = function() {
    return 'embeddedType';
  };

  adapter.load(store, App.User, { id: 2, favourite_message: { id: 1, embeddedType: 'comment'}});

  var user = store.find(App.User, 2),
      message = store.find(App.Comment, 1);

  equal(user.get('favouriteMessage'), message);
});

test("The store can serialize an embedded polymorphic belongsTo association", function() {
  serializer.keyForEmbeddedType = function() {
    return 'embeddedType';
  };
  adapter.load(store, App.User, { id: 2, favourite_message: { id: 1, embeddedType: 'comment'}});

  var user = store.find(App.User, 2),
      serialized = store.serialize(user, {includeId: true});

  ok(serialized.hasOwnProperty('favourite_message'));
  equal(serialized.favourite_message.id, 1);
  equal(serialized.favourite_message.embeddedType, 'comment');
});
