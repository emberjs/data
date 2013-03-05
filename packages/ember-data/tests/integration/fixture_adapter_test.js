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
