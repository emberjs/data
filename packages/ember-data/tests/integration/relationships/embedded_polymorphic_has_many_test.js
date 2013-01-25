var get = Ember.get, set = Ember.set;
var originalLookup = Ember.lookup, lookup;
var Adapter, adapter, serializer, store, App;

module("Has-Many Polymorphic Relationships", {
  setup: function() {
    lookup = Ember.lookup = {};
    serializer = DS.RESTSerializer.create();
    Adapter = DS.RESTAdapter.extend({
      serializer: serializer
    });
    Adapter.configure('App.Comment', {
      alias: 'comment'
    });

    Adapter.map('App.User', {
      messages: { embedded: 'always' }
    });
    Adapter.configure('App.Post', {
      alias: 'post'
    });
    Adapter.configure('App.Comment', {
      alias: 'comment'
    });

    adapter = Adapter.create();
    store = DS.Store.create({
      adapter: adapter
    });

    App = Ember.Namespace.create({
      name: 'App'
    });

    App.User = DS.Model.extend({
      name: DS.attr('string'),
      messages: DS.hasMany('App.Message', {polymorphic: true})
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
      post: DS.belongsTo('App.Post')
    });

    lookup.App = {
      Post: App.Post,
      Comment: App.Comment,
      User: App.User,
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


test("A record can't be created from an embedded polymorphic hasMany relationship", function() {
  expect(1);
  store.load(App.User, { id: 1, messages: [] });
  var user = store.find(App.User, 1),
      messages = user.get('messages');

  raises(
    function() { messages.createRecord(); },
    /You can not create records of App.Message on this polymorphic relationship/,
    "Creating records directly on a polymorphic hasMany is disallowed"
  );
});

test("Only records of the same base type can be added to an embedded polymorphic hasMany relationship", function() {
  expect(2);
  store.load(App.User, { id: 1 });
  store.load(App.User, { id: 2 });
  store.load(App.Post, { id: 1 });
  store.load(App.Comment, { id: 3 });

  var user = store.find(App.User, 1),
      anotherUser = store.find(App.User, 2),
      messages = user.get('messages'),
      post = store.find(App.Post, 1),
      comment = store.find(App.Comment, 3);

  messages.pushObject(post);
  messages.pushObject(comment);

  equal(messages.get('length'), 2, "The messages are correctly added");

  raises(
    function() { messages.pushObject(anotherUser); },
    /You can only add records of App.Message to this relationship/,
    "Adding records of a different base type on a polymorphic hasMany is disallowed"
  );
});

test("A record can be removed from an embedded polymorphic association", function() {
  expect(3);

  store.load(App.User, { id: 1 , messages: [{id: 3, type: 'comment'}]});
  store.load(App.Comment, { id: 3 });

  var user = store.find(App.User, 1),
      comment = store.find(App.Comment, 3),
      messages = user.get('messages');

  equal(messages.get('length'), 1, "The user has 1 message");

  var removedObject = messages.popObject();

  equal(removedObject, comment, "The message is correctly removed");
  equal(messages.get('length'), 0, "The user does not have any messages");
});

test("The store can load an embedded polymorphic hasMany association", function() {
  serializer.keyForEmbeddedType = function() {
    return 'embeddedType';
  };

  adapter.load(store, App.User, { id: 2, messages: [{ id: 1, embeddedType: 'comment'}]});

  var user = store.find(App.User, 2),
      message = store.find(App.Comment, 1);

  deepEqual(user.get('messages').toArray(), [message]);
});

test("The store can serialize an embedded polymorphic belongsTo association", function() {
  serializer.keyForEmbeddedType = function() {
    return 'embeddedType';
  };
  adapter.load(store, App.User, { id: 2, messages: [{ id: 1, embeddedType: 'comment'}]});

  var user = store.find(App.User, 2),
      serialized = store.serialize(user, {includeId: true});

  ok(serialized.hasOwnProperty('messages'));
  equal(serialized.messages.length, 1, "The messages are serialized");
  equal(serialized.messages[0].id, 1);
  equal(serialized.messages[0].embeddedType, 'comment');
});
