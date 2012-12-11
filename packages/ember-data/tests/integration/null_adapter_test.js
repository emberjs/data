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

  var inMemoryRecords = adapter.loadedRecordsForType(Person);
  equal(inMemoryRecords.length, 1, "In memory objects updated");

  inMemoryProfile = inMemoryRecords[0].profile
  ok(inMemoryProfile instanceof Ember.Object, 'Complex objects persisted in memory');
  equal(inMemoryProfile.skills, adam.get('profile.skills'))
  equal(inMemoryProfile.music, adam.get('profile.music'))
});

test("records are updated as is", function() {
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

  adam.set('name', 'Adam Andrew Hawkins');
  store.commit();

  equal(adam.get('name'), 'Adam Andrew Hawkins', 'Attribute materialized');

  var inMemoryRecords = adapter.loadedRecordsForType(Person);
  equal(inMemoryRecords.length, 1, "In memory objects updated");

  var inMemoryObject = inMemoryRecords[0];

  equal(inMemoryObject.name, adam.get('name'), 'Changes saved to in memory records')
});

test("records are deleted", function() {
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
  adam.deleteRecord();
  store.commit();

  var inMemoryRecords = adapter.loadedRecordsForType(Person);
  equal(inMemoryRecords.length, 0, "In memory objects updated");
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

  adapter.storeRecord(Person, attributes);

  var adam = store.find(Person, 1);

  equal(adam.get('name'), attributes.name, 'Attribute materialized');
  equal(adam.get('profile'), attributes.profile, 'Complex object materialized');
});

test("findQuery is implemented with a method to override", function() {
  adapter.queryRecords = function(records, query) {
    return records.filter(function(record) {
      return record.profile.get('skills').contains(query.skill);
    });
  };

  var adamsAttributes = {
    id: '1',
    name: "Adam Hawkins",
    profile: ComplexObject.create({
      skills: ['ruby', 'javascript'],
      music: 'Trance'
    })
  };

  var paulsAttributes = {
    id: '2',
    name: "Paul Chavard",
    profile: ComplexObject.create({
      skills: ['ruby', 'javascript', 'French'],
      music: 'Funny french stuff'
    })
  };

  adapter.storeRecord(Person, adamsAttributes);
  adapter.storeRecord(Person, paulsAttributes);

  var results = store.find(Person, {skill: 'French'})

  equal(results.get('length'), 1, 'Records filtered correctly');

  var paul = results.get('firstObject');
  equal(paul.get('name'), 'Paul Chavard');
});

