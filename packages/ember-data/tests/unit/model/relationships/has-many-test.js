var get = Ember.get;
var run = Ember.run;
var env;

module("unit/model/relationships - DS.hasMany", {
  setup: function() {
    env = setupStore();
  }
});

test("hasMany handles pre-loaded relationships", function() {
  expect(13);

  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  var Pet = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: false }),
    pets: DS.hasMany('pet', { async: false })
  });

  env.registry.register('model:tag', Tag);
  env.registry.register('model:pet', Pet);
  env.registry.register('model:person', Person);

  env.adapter.findRecord = function(store, type, id, snapshot) {
    if (type === Tag && id === '12') {
      return Ember.RSVP.resolve({ id: 12, name: "oohlala" });
    } else {
      ok(false, "findRecord() should not be called with these values");
    }
  };

  var store = env.store;

  run(function() {
    store.pushMany('tag', [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }]);
    store.pushMany('pet', [{ id: 4, name: "fluffy" }, { id: 7, name: "snowy" }, { id: 12, name: "cerberus" }]);
    store.push('person', { id: 1, name: "Tom Dale", tags: [5] });
    store.push('person', { id: 2, name: "Yehuda Katz", tags: [12] });
  });

  run(function() {
    store.findRecord('person', 1).then(function(person) {
      equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

      var tags = get(person, 'tags');
      equal(get(tags, 'length'), 1, "the list of tags should have the correct length");
      equal(get(tags.objectAt(0), 'name'), "friendly", "the first tag should be a Tag");

      run(function() {
        store.push('person', { id: 1, name: "Tom Dale", tags: [5, 2] });
      });

      equal(tags, get(person, 'tags'), "a relationship returns the same object every time");
      equal(get(get(person, 'tags'), 'length'), 2, "the length is updated after new data is loaded");

      strictEqual(get(person, 'tags').objectAt(0), get(person, 'tags').objectAt(0), "the returned object is always the same");
      asyncEqual(get(person, 'tags').objectAt(0), store.findRecord('tag', 5), "relationship objects are the same as objects retrieved directly");

      run(function() {
        store.push('person', { id: 3, name: "KSelden" });
      });

      return store.findRecord('person', 3);
    }).then(function(kselden) {
      equal(get(get(kselden, 'tags'), 'length'), 0, "a relationship that has not been supplied returns an empty array");

      run(function() {
        store.push('person', { id: 4, name: "Cyvid Hamluck", pets: [4] });
      });
      return store.findRecord('person', 4);
    }).then(function(cyvid) {
      equal(get(cyvid, 'name'), "Cyvid Hamluck", "precond - retrieves person record from store");

      var pets = get(cyvid, 'pets');
      equal(get(pets, 'length'), 1, "the list of pets should have the correct length");
      equal(get(pets.objectAt(0), 'name'), "fluffy", "the first pet should be correct");

      run(function() {
        store.push('person', { id: 4, name: "Cyvid Hamluck", pets: [4, 12] });
      });

      equal(pets, get(cyvid, 'pets'), "a relationship returns the same object every time");
      equal(get(get(cyvid, 'pets'), 'length'), 2, "the length is updated after new data is loaded");
    });
  });
});

test("hasMany lazily loads async relationships", function() {
  expect(5);

  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  var Pet = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: true }),
    pets: DS.hasMany('pet', { async: false })
  });

  env.registry.register('model:tag', Tag);
  env.registry.register('model:pet', Pet);
  env.registry.register('model:person', Person);

  env.adapter.findRecord = function(store, type, id, snapshot) {
    if (type === Tag && id === '12') {
      return Ember.RSVP.resolve({ id: 12, name: "oohlala" });
    } else {
      ok(false, "findRecord() should not be called with these values");
    }
  };

  var store = env.store;

  run(function() {
    store.pushMany('tag', [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }]);
    store.pushMany('pet', [{ id: 4, name: "fluffy" }, { id: 7, name: "snowy" }, { id: 12, name: "cerberus" }]);
    store.push('person', { id: 1, name: "Tom Dale", tags: [5] });
    store.push('person', { id: 2, name: "Yehuda Katz", tags: [12] });
  });

  var wycats;

  run(function() {
    store.findRecord('person', 2).then(function(person) {
      wycats = person;

      equal(get(wycats, 'name'), "Yehuda Katz", "precond - retrieves person record from store");

      return Ember.RSVP.hash({
        wycats: wycats,
        tags: wycats.get('tags')
      });
    }).then(function(records) {
      equal(get(records.tags, 'length'), 1, "the list of tags should have the correct length");
      equal(get(records.tags.objectAt(0), 'name'), "oohlala", "the first tag should be a Tag");

      strictEqual(records.tags.objectAt(0), records.tags.objectAt(0), "the returned object is always the same");
      asyncEqual(records.tags.objectAt(0), store.findRecord('tag', 12), "relationship objects are the same as objects retrieved directly");

      return get(wycats, 'tags');
    }).then(function(tags) {
      var newTag;
      run(function() {
        newTag = store.createRecord('tag');
        tags.pushObject(newTag);
      });
    });
  });
});

test("should be able to retrieve the type for a hasMany relationship without specifying a type from its metadata", function() {
  var Tag = DS.Model.extend({});

  var Person = DS.Model.extend({
    tags: DS.hasMany('tag', { async: false })

  });

  var env = setupStore({
    tag: Tag,
    person: Person
  });

  equal(env.store.modelFor('person').typeForRelationship('tags', env.store), Tag, "returns the relationship type");
});

test("should be able to retrieve the type for a hasMany relationship specified using a string from its metadata", function() {
  var Tag = DS.Model.extend({});

  var Person = DS.Model.extend({
    tags: DS.hasMany('tag', { async: false })
  });

  var env = setupStore({
    tag: Tag,
    person: Person
  });

  equal(env.store.modelFor('person').typeForRelationship('tags', env.store), Tag, "returns the relationship type");
});

test("should be able to retrieve the type for a belongsTo relationship without specifying a type from its metadata", function() {
  var Tag = DS.Model.extend({});

  var Person = DS.Model.extend({
    tag: DS.belongsTo('tag', { async: false })
  });

  var env = setupStore({
    tag: Tag,
    person: Person
  });

  equal(env.store.modelFor('person').typeForRelationship('tag', env.store), Tag, "returns the relationship type");
});

test("should be able to retrieve the type for a belongsTo relationship specified using a string from its metadata", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    tags: DS.belongsTo('tag', { async: false })
  });

  var env = setupStore({
    tag: Tag,
    person: Person
  });

  equal(env.store.modelFor('person').typeForRelationship('tags', env.store), Tag, "returns the relationship type");
});

test("relationships work when declared with a string path", function() {
  expect(2);

  window.App = {};

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: false })
  });

  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var env = setupStore({
    person: Person,
    tag: Tag
  });

  run(function() {
    env.store.pushMany('tag', [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }, { id: 12, name: "oohlala" }]);
    env.store.push('person', { id: 1, name: "Tom Dale", tags: [5, 2] });
  });

  run(function() {
    env.store.findRecord('person', 1).then(function(person) {
      equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");
      equal(get(person, 'tags.length'), 2, "the list of tags should have the correct length");
    });
  });
});

test("hasMany relationships work when the data hash has not been loaded", function() {
  expect(8);

  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  Tag.toString = function() { return "Tag"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: true })
  });

  Person.toString = function() { return "Person"; };

  var env = setupStore({ tag: Tag, person: Person });
  var store = env.store;

  env.adapter.coalesceFindRequests = true;
  env.adapter.findMany = function(store, type, ids, snapshots) {
    equal(type, Tag, "type should be Tag");
    deepEqual(ids, ['5', '2'], "ids should be 5 and 2");

    return Ember.RSVP.resolve([{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }]);
  };

  env.adapter.findRecord = function(store, type, id, snapshot) {
    equal(type, Person, "type should be Person");
    equal(id, 1, "id should be 1");

    return Ember.RSVP.resolve({ id: 1, name: "Tom Dale", tags: [5, 2] });
  };

  run(function() {
    store.findRecord('person', 1).then(function(person) {
      equal(get(person, 'name'), "Tom Dale", "The person is now populated");

      return run(function() {
        return person.get('tags');
      });
    }).then(function(tags) {
      equal(get(tags, 'length'), 2, "the tags object still exists");
      equal(get(tags.objectAt(0), 'name'), "friendly", "Tom Dale is now friendly");
      equal(get(tags.objectAt(0), 'isLoaded'), true, "Tom Dale is now loaded");
    });
  });
});

test("it is possible to add a new item to a relationship", function() {
  expect(2);

  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.belongsTo('person', { async: false })
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: false })
  });

  var env = setupStore({
    tag: Tag,
    person: Person
  });

  var store = env.store;

  run(function() {
    store.push('person', { id: 1, name: "Tom Dale", tags: [1] });
    store.push('tag', { id: 1, name: "ember" });
  });

  run(function() {
    store.findRecord('person', 1).then(function(person) {
      var tag = get(person, 'tags').objectAt(0);

      equal(get(tag, 'name'), "ember", "precond - relationships work");

      tag = store.createRecord('tag', { name: "js" });
      get(person, 'tags').pushObject(tag);

      equal(get(person, 'tags').objectAt(1), tag, "newly added relationship works");
    });
  });
});

test("possible to replace items in a relationship using setObjects w/ Ember Enumerable Array/Object as the argument (GH-2533)", function() {
  expect(2);

  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: false })
  });

  var env   = setupStore({ tag: Tag, person: Person });
  var store = env.store;

  run(function() {
    store.push('person', { id: 1, name: "Tom Dale", tags: [1] });
    store.push('person', { id: 2, name: "Sylvain Mina", tags: [2] });
    store.push('tag', { id: 1, name: "ember" });
    store.push('tag', { id: 2, name: "ember-data" });
  });

  var tom, sylvain;

  run(function() {
    tom = store.peekRecord('person', '1');
    sylvain = store.peekRecord('person', '2');
    // Test that since sylvain.get('tags') instanceof DS.ManyArray,
    // addRecords on Relationship iterates correctly.
    tom.get('tags').setObjects(sylvain.get('tags'));
  });

  equal(tom.get('tags.length'), 1);
  equal(tom.get('tags.firstObject'), store.peekRecord('tag', 2));
});

test("it is possible to remove an item from a relationship", function() {
  expect(2);

  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: false })
  });

  var env = setupStore({ tag: Tag, person: Person });
  var store = env.store;

  run(function() {
    store.push('person', { id: 1, name: "Tom Dale", tags: [1] });
    store.push('tag', { id: 1, name: "ember" });
  });

  run(function() {
    store.findRecord('person', 1).then(async(function(person) {
      var tag = get(person, 'tags').objectAt(0);

      equal(get(tag, 'name'), "ember", "precond - relationships work");

      run(function() {
        get(person, 'tags').removeObject(tag);
      });

      equal(get(person, 'tags.length'), 0, "object is removed from the relationship");
    }));
  });
});

test("it is possible to add an item to a relationship, remove it, then add it again", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person', { async: false })
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: false })
  });

  Tag.toString = function() { return "Tag"; };
  Person.toString = function() { return "Person"; };

  var env = setupStore({ tag: Tag, person: Person });
  var store = env.store;
  var person, tag1, tag2, tag3;

  run(function() {
    person = store.createRecord('person');
    tag1 = store.createRecord('tag');
    tag2 = store.createRecord('tag');
    tag3 = store.createRecord('tag');
  });

  var tags = get(person, 'tags');

  run(function() {
    tags.pushObjects([tag1, tag2, tag3]);
    tags.removeObject(tag2);
  });

  equal(tags.objectAt(0), tag1);
  equal(tags.objectAt(1), tag3);
  equal(get(person, 'tags.length'), 2, "object is removed from the relationship");

  run(function() {
    tags.insertAt(0, tag2);
  });

  equal(get(person, 'tags.length'), 3, "object is added back to the relationship");
  equal(tags.objectAt(0), tag2);
  equal(tags.objectAt(1), tag1);
  equal(tags.objectAt(2), tag3);
});

test("DS.hasMany is async by default", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: false })
  });

  var env = setupStore({ tag: Tag, person: Person });
  var store = env.store;

  run(function() {
    var tag = store.createRecord('tag');
    ok(tag.get('people') instanceof DS.PromiseArray, 'people should be an async relationship');
  });
});
