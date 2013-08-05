var get = Ember.get, set = Ember.set;
var App, ComplexObject, Person, store, adapter;

ComplexObject = Ember.Object.extend({

});

module("DS.FixtureAdapter & DS.FixtureSerializer", {
  setup: function() {
    App = Ember.Namespace.create();

    App.Person = DS.Model.extend({
      name: DS.attr('string'),
      profile: DS.attr('object'),
    });

    App.Person.FIXTURES = [];

    App.User = App.Person.extend({
      messages: DS.hasMany('App.Message', {polymorphic: true})
    });
    App.Admin = App.User.extend({});

    App.Message = DS.Model.extend({
      owner: DS.belongsTo('App.Person', {polymorphic: true})
    });

    App.Post = App.Message.extend({});
    App.Comment = App.Message.extend({});


    App.User.FIXTURES = [{
      id: "1",
      name: "Alice",
      messages: [
        {id: "1", type: "post"},
        {id: "2", type: "comment"}
      ]
    }];

    App.Admin.FIXTURES = [{
      id: "2",
      name: "Bob",
      messages: [{id: "3", type: "post"}]
    }];

    App.Post.FIXTURES = [{
      id: "1",
      owner: "1",
      owner_type: "user"
    }, {
      id: "3",
      owner: "2",
      owner_type: "admin"
    }];

    App.Comment.FIXTURES = [{
      id: "2",
      owner: "1",
      owner_type: "user"
    }];

    DS.FixtureAdapter.configure(App.User, { alias: 'user' });
    DS.FixtureAdapter.configure(App.Admin, { alias: 'admin' });
    DS.FixtureAdapter.configure(App.Post, { alias: 'post' });
    DS.FixtureAdapter.configure(App.Comment, { alias: 'comment' });

    adapter = DS.FixtureAdapter.create({
      simulateRemoteResponse: false
    });

    store = DS.Store.create({ adapter: adapter });
  },

  teardown: function() {
    adapter.destroy();
    store.destroy();
  }
});

test("records are persisted as is", function() {
  var attributes = {
    name: "Adam Hawkins",
    profile: ComplexObject.create({
      skills: ['ruby', 'javascript'],
      music: 'Trance'
    })
  };

  var record = store.createRecord(App.Person, attributes);
  store.commit();

  var adam = store.find(App.Person, record.get('id'));

  equal(adam.get('name'), attributes.name, 'Attribute materialized');
  equal(adam.get('profile'), attributes.profile, 'Complex object materialized');

  var fixtures = adapter.fixturesForType(App.Person);
  equal(fixtures.length, 1, "fixtures updated");

  var inMemoryProfile = fixtures[0].profile;
  ok(inMemoryProfile instanceof Ember.Object, 'Complex objects persisted in memory');
  equal(inMemoryProfile.skills, adam.get('profile.skills'));
  equal(inMemoryProfile.music, adam.get('profile.music'));
});

test("records are updated as is", function() {
  var attributes = {
    name: "Adam Hawkins",
    profile: ComplexObject.create({
      skills: ['ruby', 'javascript'],
      music: 'Trance'
    })
  };

  var record = store.createRecord(App.Person, attributes);
  store.commit();

  var adam = store.find(App.Person, record.get('id'));

  adam.set('name', 'Adam Andrew Hawkins');
  store.commit();

  equal(adam.get('name'), 'Adam Andrew Hawkins', 'Attribute materialized');

  var fixtures = adapter.fixturesForType(App.Person);
  equal(fixtures.length, 1, "fixtures updated");

  var inMemoryObject = fixtures[0];

  equal(inMemoryObject.name, adam.get('name'), 'Changes saved to in memory records');
});

test("records are deleted", function() {
  var attributes = {
    name: "Adam Hawkins",
    profile: ComplexObject.create({
      skills: ['ruby', 'javascript'],
      music: 'Trance'
    })
  };

  var record = store.createRecord(App.Person, attributes);
  store.commit();

  var adam = store.find(App.Person, record.get('id'));
  adam.deleteRecord();
  store.commit();

  var fixtures = adapter.fixturesForType(App.Person);
  equal(fixtures.length, 0, "fixtures updated");
});

test("find queries loaded records", function() {
  var attributes = {
    id: '1',
    name: "Adam Hawkins",
    profile: ComplexObject.create({
      skills: ['ruby', 'javascript'],
      music: 'Trance'
    })
  };

  adapter.updateFixtures(App.Person, attributes);

  var adam = store.find(App.Person, 1);

  equal(adam.get('name'), attributes.name, 'Attribute materialized');
  equal(adam.get('profile'), attributes.profile, 'Complex object materialized');
});

test("polymorphic has many", function () {
  var alice, bob;

  Ember.run(function () {
    alice = store.find(App.User, 1);
  });

  equal(alice.get('name'), "Alice", 'record materialized');
  equal(alice.get('messages.length'), 2, 'correct number of messages');
  equal(alice.get('messages').objectAt(0).constructor, App.Post, 'correct message subclass');
  equal(alice.get('messages').objectAt(0).get('id'), "1", 'correct record');
  equal(alice.get('messages').objectAt(1).constructor, App.Comment, 'correct message subclass');
  equal(alice.get('messages').objectAt(1).get('id'), "2", 'correct record');

  Ember.run(function () {
    bob = store.find(App.Admin, 2);
  });

  equal(bob.get('name'), "Bob", 'record materialized');
  equal(bob.get('messages.length'), 1, 'correct number of messages');
  equal(bob.get('messages').objectAt(0).constructor, App.Post, 'correct message subclass');
  equal(bob.get('messages').objectAt(0).get('id'), "3", 'correct record');
});

test("polymorphic belongs to", function () {
  var alice_post, bob_post, alice, bob;

  Ember.run(function () {
    alice_post = store.find(App.Post, 1);
    bob_post = store.find(App.Post, 3);
  });

  Ember.run(function () {
    alice = alice_post.get('owner');
    bob = bob_post.get('owner');
  });

  equal(alice.get('name'), "Alice", 'correct owner');
  equal(alice.constructor, App.User, 'correct person subclass');
  equal(bob.get('name'), "Bob", 'correct owner');
  equal(bob.constructor, App.Admin, 'correct person subclass');
});
