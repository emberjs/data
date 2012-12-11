var get = Ember.get, set = Ember.set;
var ComplexObject, Person, store, adapter;

ComplexObject = Ember.Object.extend({

});

module("InMemoryAdapter & NullSerializer", {
  setup: function() {
    Person = DS.Model.extend({
      name: DS.attr('string'),
      profile: DS.attr('object'),
    });

    adapter = DS.InMemoryAdapter.create();
    store = DS.Store.create({ adapter: adapter });
  },

  teardown: function() {
    adapter.destroy();
    store.destroy();
  }
});

test("records are persisted as is", function() {
  var attributes = {
    id: '1',
    name: "Adam Hawkins",
    profile: ComplexObject.create({
      skills: ['ruby', 'javascript'],
      music: 'Trance'
    })
  };

  store.createRecord(Person, attributes);
  store.commit();

  var adam = store.find(Person, 1);

  equal(adam.get('name'), attributes.name, 'Attribute materialized');
  equal(adam.get('profile'), attributes.profile, 'Complex object materialized');

  var inMemoryRecords = adapter.recordsForType(Person)
  equal(inMemoryRecords.length, 1, "In memory objects updated");

  inMemoryProfile = inMemoryRecords[0].profile
  ok(inMemoryProfile instanceof Ember.Object, 'Complex objects persisted in memory');
  equal(inMemoryProfile.skills, adam.get('profile.skills'))
  equal(inMemoryProfile.music, adam.get('profile.music'))
});
