/*global Tag App*/

var get = Ember.get, set = Ember.set;

module("unit/model/relationships - DS.Model");

test("exposes a hash of the relationships on a model", function() {
  var Occupation = DS.Model.extend();

  var Person = DS.Model.extend({
    occupations: DS.hasMany(Occupation)
  });

  Person.reopen({
    people: DS.hasMany(Person),
    parent: DS.belongsTo(Person)
  });

  var relationships = get(Person, 'relationships');
  deepEqual(relationships.get(Person), [
    { name: "people", kind: "hasMany" },
    { name: "parent", kind: "belongsTo" }
  ]);

  deepEqual(relationships.get(Occupation), [
    { name: "occupations", kind: "hasMany" }
  ]);
});

var env;
module("unit/model/relationships - DS.hasMany", {
  setup: function() {
    env = setupStore();
  }
});

test("hasMany handles pre-loaded relationships", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person')
  });

  var Pet = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag'),
    pets: DS.hasMany('pet')
  });

  env.container.register('model:tag', Tag);
  env.container.register('model:pet', Pet);
  env.container.register('model:person', Person);

  env.adapter.find = function(store, type, id) {
    if (type === Tag && id === '12') {
      return Ember.RSVP.resolve({ id: 12, name: "oohlala" });
    } else {
      ok(false, "find() should not be called with these values");
    }
  };

  var store = env.store;

  store.pushMany('tag', [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }]);
  store.pushMany('pet', [{ id: 4, name: "fluffy" }, { id: 7, name: "snowy" }, { id: 12, name: "cerberus" }]);
  store.push('person', { id: 1, name: "Tom Dale", tags: [5] });
  store.push('person', { id: 2, name: "Yehuda Katz", tags: [12] });

  var wycats;

  store.find('person', 1).then(async(function(person) {
    equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

    var tags = get(person, 'tags');
    equal(get(tags, 'length'), 1, "the list of tags should have the correct length");
    equal(get(tags.objectAt(0), 'name'), "friendly", "the first tag should be a Tag");

    store.push('person', { id: 1, name: "Tom Dale", tags: [5, 2] });
    equal(tags, get(person, 'tags'), "a relationship returns the same object every time");
    equal(get(get(person, 'tags'), 'length'), 2, "the length is updated after new data is loaded");

    strictEqual(get(person, 'tags').objectAt(0), get(person, 'tags').objectAt(0), "the returned object is always the same");
    asyncEqual(get(person, 'tags').objectAt(0), store.find(Tag, 5), "relationship objects are the same as objects retrieved directly");

    store.push('person', { id: 3, name: "KSelden" });

    return store.find('person', 3);
  })).then(async(function(kselden) {
    equal(get(get(kselden, 'tags'), 'length'), 0, "a relationship that has not been supplied returns an empty array");

    store.push('person', { id: 4, name: "Cyvid Hamluck", pets: [4] });
    return store.find('person', 4);
  })).then(async(function(cyvid) {
    equal(get(cyvid, 'name'), "Cyvid Hamluck", "precond - retrieves person record from store");

    var pets = get(cyvid, 'pets');
    equal(get(pets, 'length'), 1, "the list of pets should have the correct length");
    equal(get(pets.objectAt(0), 'name'), "fluffy", "the first pet should be correct");

    store.push(Person, { id: 4, name: "Cyvid Hamluck", pets: [4, 12] });
    equal(pets, get(cyvid, 'pets'), "a relationship returns the same object every time");
    equal(get(get(cyvid, 'pets'), 'length'), 2, "the length is updated after new data is loaded");
  }));
});

test("hasMany lazily loads async relationships", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person')
  });

  var Pet = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: true }),
    pets: DS.hasMany('pet')
  });

  env.container.register('model:tag', Tag);
  env.container.register('model:pet', Pet);
  env.container.register('model:person', Person);

  env.adapter.find = function(store, type, id) {
    if (type === Tag && id === '12') {
      return Ember.RSVP.resolve({ id: 12, name: "oohlala" });
    } else {
      ok(false, "find() should not be called with these values");
    }
  };

  var store = env.store;

  store.pushMany('tag', [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }]);
  store.pushMany('pet', [{ id: 4, name: "fluffy" }, { id: 7, name: "snowy" }, { id: 12, name: "cerberus" }]);
  store.push('person', { id: 1, name: "Tom Dale", tags: [5] });
  store.push('person', { id: 2, name: "Yehuda Katz", tags: [12] });

  var wycats;

  store.find('person', 2).then(async(function(person) {
    wycats = person;

    equal(get(wycats, 'name'), "Yehuda Katz", "precond - retrieves person record from store");

    return Ember.RSVP.hash({
      wycats: wycats,
      tags: wycats.get('tags')
    });
  })).then(async(function(records) {
    equal(get(records.tags, 'length'), 1, "the list of tags should have the correct length");
    equal(get(records.tags.objectAt(0), 'name'), "oohlala", "the first tag should be a Tag");

    strictEqual(records.tags.objectAt(0), records.tags.objectAt(0), "the returned object is always the same");
    asyncEqual(records.tags.objectAt(0), store.find(Tag, 12), "relationship objects are the same as objects retrieved directly");

    return get(wycats, 'tags');
  })).then(async(function(tags) {
    var newTag = store.createRecord(Tag);
    tags.pushObject(newTag);
  }));
});

test("should be able to retrieve the type for a hasMany relationship from its metadata", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany(Tag)
  });

  equal(Person.typeForRelationship('tags'), Tag, "returns the relationship type");
});

test("should be able to retrieve the type for a hasMany relationship specified using a string from its metadata", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag')
  });

  var env = setupStore({
    tag: Tag,
    person: Person
  });

  equal(env.store.modelFor('person').typeForRelationship('tags'), Tag, "returns the relationship type");
});

test("should be able to retrieve the type for a belongsTo relationship from its metadata", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.belongsTo('tag')
  });

  var env = setupStore({
    tag: Tag,
    person: Person
  });

  equal(env.store.modelFor('person').typeForRelationship('tags'), Tag, "returns the relationship type");
});

test("should be able to retrieve the type for a belongsTo relationship specified using a string from its metadata", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.belongsTo('tag')
  });

  var env = setupStore({
    tag: Tag,
    person: Person
  });

  equal(env.store.modelFor('person').typeForRelationship('tags'), Tag, "returns the relationship type");
});

test("relationships work when declared with a string path", function() {
  window.App = {};

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag')
  });

  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var env = setupStore({
    person: Person,
    tag: Tag
  });

  env.store.pushMany('tag', [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }, { id: 12, name: "oohlala" }]);
  env.store.push('person', { id: 1, name: "Tom Dale", tags: [5, 2] });

  env.store.find('person', 1).then(async(function(person) {
    equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");
    equal(get(person, 'tags.length'), 2, "the list of tags should have the correct length");
  }));
});

test("hasMany relationships work when the data hash has not been loaded", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person')
  });

  Tag.toString = function() { return "Tag"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag', { async: true })
  });

  Person.toString = function() { return "Person"; };

  var env = setupStore({ tag: Tag, person: Person }),
      store = env.store;

  env.adapter.coalesceFindRequests = true;
  env.adapter.findMany = function(store, type, ids) {
    equal(type, Tag, "type should be Tag");
    deepEqual(ids, ['5', '2'], "ids should be 5 and 2");

    return Ember.RSVP.resolve([{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }]);
  };

  env.adapter.find = function(store, type, id) {
    equal(type, Person, "type should be Person");
    equal(id, 1, "id should be 1");

    return Ember.RSVP.resolve({ id: 1, name: "Tom Dale", tags: [5, 2] });
  };

  store.find('person', 1).then(async(function(person) {
    equal(get(person, 'name'), "Tom Dale", "The person is now populated");

    return person.get('tags');
  })).then(async(function(tags) {
    equal(get(tags, 'length'), 2, "the tags object still exists");
    equal(get(tags.objectAt(0), 'name'), "friendly", "Tom Dale is now friendly");
    equal(get(tags.objectAt(0), 'isLoaded'), true, "Tom Dale is now loaded");
  }));
});

test("it is possible to add a new item to a relationship", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.belongsTo('person')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag')
  });

  var env = setupStore({
    tag: Tag,
    person: Person
  });

  var store = env.store;

  store.push('person', { id: 1, name: "Tom Dale", tags: [ 1 ] });
  store.push('tag', { id: 1, name: "ember" });

  store.find(Person, 1).then(async(function(person) {
    var tag = get(person, 'tags').objectAt(0);

    equal(get(tag, 'name'), "ember", "precond - relationships work");

    tag = store.createRecord(Tag, { name: "js" });
    get(person, 'tags').pushObject(tag);

    equal(get(person, 'tags').objectAt(1), tag, "newly added relationship works");
  }));
});

test("it is possible to remove an item from a relationship", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag')
  });

  var env = setupStore({ tag: Tag, person: Person }),
      store = env.store;

  store.push('person', { id: 1, name: "Tom Dale", tags: [ 1 ] });
  store.push('tag', { id: 1, name: "ember" });

  store.find('person', 1).then(async(function(person) {
    var tag = get(person, 'tags').objectAt(0);

    equal(get(tag, 'name'), "ember", "precond - relationships work");

    get(person, 'tags').removeObject(tag);

    equal(get(person, 'tags.length'), 0, "object is removed from the relationship");
  }));
});

test("it is possible to add an item to a relationship, remove it, then add it again", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag')
  });

  Tag.toString = function() { return "Tag"; };
  Person.toString = function() { return "Person"; };

  var env = setupStore({ tag: Tag, person: Person }),
      store = env.store;

  var person = store.createRecord('person');
  var tag1 = store.createRecord('tag');
  var tag2 = store.createRecord('tag');
  var tag3 = store.createRecord('tag');

  var tags = get(person, 'tags');

  tags.pushObjects([tag1, tag2, tag3]);
  tags.removeObject(tag2);
  equal(tags.objectAt(0), tag1);
  equal(tags.objectAt(1), tag3);
  equal(get(person, 'tags.length'), 2, "object is removed from the relationship");

  tags.insertAt(0, tag2);
  equal(get(person, 'tags.length'), 3, "object is added back to the relationship");
  equal(tags.objectAt(0), tag2);
  equal(tags.objectAt(1), tag1);
  equal(tags.objectAt(2), tag3);
});

module("unit/model/relationships - RecordArray");

test("updating the content of a RecordArray updates its content", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var env = setupStore({ tag: Tag }),
      store = env.store;

  var records = store.pushMany('tag', [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }, { id: 12, name: "oohlala" }]);

  var tags = DS.RecordArray.create({ content: Ember.A(records.slice(0, 2)), store: store, type: Tag });

  var tag = tags.objectAt(0);
  equal(get(tag, 'name'), "friendly", "precond - we're working with the right tags");

  set(tags, 'content', Ember.A(records.slice(1, 3)));
  tag = tags.objectAt(0);
  equal(get(tag, 'name'), "smarmy", "the lookup was updated");
});

test("can create child record from a hasMany relationship", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('tag')
  });

  var env = setupStore({ tag: Tag, person: Person }),
      store = env.store;

  store.push('person', { id: 1, name: "Tom Dale"});

  store.find('person', 1).then(async(function(person) {
    person.get("tags").createRecord({ name: "cool" });

    equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");
    equal(get(person, 'tags.length'), 1, "tag is added to the parent record");
    equal(get(person, 'tags').objectAt(0).get("name"), "cool", "tag values are passed along");
  }));
});

module("unit/model/relationships - DS.belongsTo");

test("belongsTo lazily loads relationships as needed", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person')
  });
  Tag.toString = function() { return "Tag"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag')
  });
  Person.toString = function() { return "Person"; };

  var env = setupStore({ tag: Tag, person: Person }),
      store = env.store;

  store.pushMany('tag', [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }, { id: 12, name: "oohlala" }]);
  store.push('person', { id: 1, name: "Tom Dale", tag: 5 });

  store.find('person', 1).then(async(function(person) {
    equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

    equal(get(person, 'tag') instanceof Tag, true, "the tag property should return a tag");
    equal(get(person, 'tag.name'), "friendly", "the tag shuld have name");

    strictEqual(get(person, 'tag'), get(person, 'tag'), "the returned object is always the same");
    asyncEqual(get(person, 'tag'), store.find('tag', 5), "relationship object is the same as object retrieved directly");
  }));
});

test("async belongsTo relationships work when the data hash has not been loaded", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: true })
  });

  var env = setupStore({ tag: Tag, person: Person }),
      store = env.store;

  env.adapter.find = function(store, type, id) {
    if (type === Person) {
      equal(id, 1, "id should be 1");

      return Ember.RSVP.resolve({ id: 1, name: "Tom Dale", tag: 2 });
    } else if (type === Tag) {
      equal(id, 2, "id should be 2");

      return Ember.RSVP.resolve({ id: 2, name: "friendly" });
    }
  };

  store.find('person', 1).then(async(function(person) {
    equal(get(person, 'name'), "Tom Dale", "The person is now populated");

    return get(person, 'tag');
  })).then(async(function(tag) {
    equal(get(tag, 'name'), "friendly", "Tom Dale is now friendly");
    equal(get(tag, 'isLoaded'), true, "Tom Dale is now loaded");
  }));
});

test("async belongsTo relationships work when the data hash has already been loaded", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag', { async: true })
  });

  var env = setupStore({ tag: Tag, person: Person }),
      store = env.store;

    store.push('tag', { id: 2, name: "friendly"});
    store.push('person', { id: 1, name: "Tom Dale", tag: 2});

    store.find('person', 1).then(async(function(person) {
        equal(get(person, 'name'), "Tom Dale", "The person is now populated");
        return get(person, 'tag');
    })).then(async(function(tag) {
        equal(get(tag, 'name'), "friendly", "Tom Dale is now friendly");
        equal(get(tag, 'isLoaded'), true, "Tom Dale is now loaded");
  }));
});

test("calling createRecord and passing in an undefined value for a relationship should be treated as if null", function () {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    person: DS.belongsTo('person')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag')
  });

  var env = setupStore({ tag: Tag, person: Person }),
      store = env.store;

  store.createRecord('person', {id: 1, tag: undefined});

  store.find(Person, 1).then(async(function(person) {
    strictEqual(person.get('tag'), null, "undefined values should return null relationships");
  }));
});

test("When finding a hasMany relationship the inverse belongsTo relationship is available immediately", function() {
  var Occupation = DS.Model.extend({
    description: DS.attr('string'),
    person: DS.belongsTo('person')
  });

  Occupation.toString = function() { return "Occupation"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    occupations: DS.hasMany('occupation', { async: true })
  });

  Person.toString = function() { return "Person"; };

  var env = setupStore({ occupation: Occupation, person: Person }),
      store = env.store;

  env.adapter.findMany = function(store, type, ids, records) {
    equal(records[0].get('person.id'), '1');
    return Ember.RSVP.resolve([{ id: 5, description: "fifth" }, { id: 2, description: "second" }]);
  };

  env.adapter.coalesceFindRequests = true;

  store.push('person', { id: 1, name: "Tom Dale", occupations: [5, 2] });

  store.find('person', 1).then(async(function(person) {
    equal(get(person, 'isLoaded'), true, "isLoaded should be true");
    equal(get(person, 'name'), "Tom Dale", "the person is still Tom Dale");

    return get(person, 'occupations');
  })).then(async(function(occupations) {
    equal(get(occupations, 'length'), 2, "the list of occupations should have the correct length");

    equal(get(occupations.objectAt(0), 'description'), "fifth", "the occupation is the fifth");
    equal(get(occupations.objectAt(0), 'isLoaded'), true, "the occupation is now loaded");
  }));
});

test("When finding a belongsTo relationship the inverse belongsTo relationship is available immediately", function() {
  expect(1);
  var Occupation = DS.Model.extend({
    description: DS.attr('string'),
    person: DS.belongsTo('person')
  });

  Occupation.toString = function() { return "Occupation"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    occupation: DS.belongsTo('occupation', { async: true })
  });

  Person.toString = function() { return "Person"; };

  var env = setupStore({ occupation: Occupation, person: Person }),
      store = env.store;

  env.adapter.find = function(store, type, id, record) {
    equal(record.get('person.id'), '1');
    return Ember.RSVP.resolve({ id: 5, description: "fifth" });
  };

  store.push('person', { id: 1, name: "Tom Dale", occupation: 5 });

  store.getById('person', 1).get('occupation');
});

test("belongsTo supports relationships to models with id 0", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string'),
    people: DS.hasMany('person')
  });
  Tag.toString = function() { return "Tag"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo('tag')
  });
  Person.toString = function() { return "Person"; };

  var env = setupStore({ tag: Tag, person: Person }),
      store = env.store;

  store.pushMany('tag', [{ id: 0, name: "friendly" }, { id: 2, name: "smarmy" }, { id: 12, name: "oohlala" }]);
  store.push('person', { id: 1, name: "Tom Dale", tag: 0 });

  store.find('person', 1).then(async(function(person) {
    equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

    equal(get(person, 'tag') instanceof Tag, true, "the tag property should return a tag");
    equal(get(person, 'tag.name'), "friendly", "the tag should have name");

    strictEqual(get(person, 'tag'), get(person, 'tag'), "the returned object is always the same");
    asyncEqual(get(person, 'tag'), store.find(Tag, 0), "relationship object is the same as object retrieved directly");
  }));
});
