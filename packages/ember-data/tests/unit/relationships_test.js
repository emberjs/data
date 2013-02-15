/*global Tag App*/

var get = Ember.get, set = Ember.set;

module("DS.Model");

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

module("DS.hasMany");

test("hasMany lazily loads relationships as needed", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Pet = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany(Tag),
    pets: DS.hasMany(Pet)
  });

  Tag.reopen({
    person: DS.belongsTo(Person)
  });

  Pet.reopen({
    person: DS.belongsTo(Person)
  });

  var store = DS.Store.create({
    adapter: DS.Adapter.create({
      find: function(store, type, id) {
        if (type === Tag && id === '12') {
          store.load(type, 12, {
            id: 12,
            name: "oohlala"
          });
        } else {
          ok(false, "find() should not be called with these values");
        }
      }
    })
  });
  store.loadMany(Tag, [5, 2], [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }]);
  store.loadMany(Pet, [4, 7, 12], [{ id: 4, name: "fluffy" }, { id: 7, name: "snowy" }, { id: 12, name: "cerberus" }]);
  store.load(Person, 1, { id: 1, name: "Tom Dale", tags: [5] });
  store.load(Person, 2, { id: 2, name: "Yehuda Katz", tags: [12] });

  var person = store.find(Person, 1);
  equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

  var tags = get(person, 'tags');
  equal(get(tags, 'length'), 1, "the list of tags should have the correct length");
  equal(get(tags.objectAt(0), 'name'), "friendly", "the first tag should be a Tag");

  store.load(Person, 1, { id: 1, name: "Tom Dale", tags: [5, 2] });
  equal(tags, get(person, 'tags'), "a relationship returns the same object every time");
  equal(get(get(person, 'tags'), 'length'), 2, "the length is updated after new data is loaded");

  strictEqual(get(person, 'tags').objectAt(0), get(person, 'tags').objectAt(0), "the returned object is always the same");
  strictEqual(get(person, 'tags').objectAt(0), store.find(Tag, 5), "relationship objects are the same as objects retrieved directly");

  var wycats = store.find(Person, 2);
  equal(get(wycats, 'name'), "Yehuda Katz", "precond - retrieves person record from store");

  equal(get(wycats, 'tags.length'), 1, "the list of tags should have the correct length");
  equal(get(get(wycats, 'tags').objectAt(0), 'name'), "oohlala", "the first tag should be a Tag");

  strictEqual(get(wycats, 'tags').objectAt(0), get(wycats, 'tags').objectAt(0), "the returned object is always the same");
  strictEqual(get(wycats, 'tags').objectAt(0), store.find(Tag, 12), "relationship objects are the same as objects retrieved directly");

  store.load(Person, 3, { id: 3, name: "KSelden" });
  var kselden = store.find(Person, 3);

  equal(get(get(kselden, 'tags'), 'length'), 0, "a relationship that has not been supplied returns an empty array");

  store.load(Person, 4, { id: 4, name: "Cyvid Hamluck", pets: [4] });
  var cyvid = store.find(Person, 4);
  equal(get(cyvid, 'name'), "Cyvid Hamluck", "precond - retrieves person record from store");

  var pets = get(cyvid, 'pets');
  equal(get(pets, 'length'), 1, "the list of pets should have the correct length");
  equal(get(pets.objectAt(0), 'name'), "fluffy", "the first pet should be correct");

  store.load(Person, 4, { id: 4, name: "Cyvid Hamluck", pets: [4, 12] });
  equal(pets, get(cyvid, 'pets'), "a relationship returns the same object every time");
  equal(get(get(cyvid, 'pets'), 'length'), 2, "the length is updated after new data is loaded");

  var newTag = store.createRecord(Tag);
  get(wycats, 'tags').pushObject(newTag);
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
  window.Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('Tag')
  });

  equal(Person.typeForRelationship('tags'), Tag, "returns the relationship type");
});

test("should be able to retrieve the type for a belongsTo relationship from its metadata", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.belongsTo(Tag)
  });

  equal(Person.typeForRelationship('tags'), Tag, "returns the relationship type");
});

test("should be able to retrieve the type for a belongsTo relationship specified using a string from its metadata", function() {
  window.Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.belongsTo('Tag')
  });

  equal(Person.typeForRelationship('tags'), Tag, "returns the relationship type");
});

test("relationships work when declared with a string path", function() {
  window.App = {};

  App.Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('App.Tag')
  });

  App.Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var store = DS.Store.create();
  store.loadMany(App.Tag, [5, 2, 12], [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }, { id: 12, name: "oohlala" }]);
  store.load(App.Person, 1, { id: 1, name: "Tom Dale", tag_ids: [5, 2] });

  var person = store.find(App.Person, 1);
  equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

  equal(get(person, 'tags.length'), 2, "the list of tags should have the correct length");
});

test("relationships work when the data hash has not been loaded", function() {
  expect(13);

  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  Tag.toString = function() { return "Tag"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany(Tag)
  });

  Person.toString = function() { return "Person"; };

  Tag.reopen({
    person: DS.belongsTo(Person)
  });

  var store = DS.Store.create({
    adapter: DS.Adapter.create({
      findMany: function(store, type, ids) {
        equal(type, Tag, "type should be Tag");
        deepEqual(ids, ['5', '2'], "ids should be 5 and 2");

        stop();

        setTimeout(function() {
          start();
          store.loadMany(type, ids, [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }]);

          equal(get(person, 'name'), "Tom Dale", "precond - the person is still Tom Dale");
          equal(get(person, 'tags.length'), 2, "the tags object still exists");
          equal(get(get(person, 'tags').objectAt(0), 'name'), "friendly", "Tom Dale is now friendly");
          equal(get(get(person, 'tags').objectAt(0), 'isLoaded'), true, "Tom Dale is now loaded");
        }, 1);
      },

      find: function(store, type, id) {
        equal(type, Person, "type should be Person");
        equal(id, 1, "id should be 1");

        stop();

        setTimeout(function() {
          start();
          store.load(type, id, { id: 1, name: "Tom Dale", tags: [5, 2] });

          equal(get(person, 'name'), "Tom Dale", "The person is now populated");
          equal(get(person, 'tags.length'), 2, "the tags Array already exists");
          equal(get(get(person, 'tags').objectAt(0), 'isLoaded'), false, "the tag objects exist, but are not yet loaded");
        }, 1);
      }
    })
  });

  var person = store.find(Person, 1);

  equal(get(person, 'isLoaded'), false, "isLoaded should be false");
  equal(get(person, 'tags.length'), 0, "tags should be empty");
});

test("it is possible to add a new item to a relationship", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany(Tag)
  });

  Tag.reopen({
    people: DS.belongsTo(Person)
  });

  var store = DS.Store.create();

  store.load(Person, { id: 1, name: "Tom Dale", tag_ids: [ 1 ] });
  store.load(Tag, { id: 1, name: "ember" });

  var person = store.find(Person, 1);
  var tag = get(person, 'tags').objectAt(0);

  equal(get(tag, 'name'), "ember", "precond - relationships work");

  tag = store.createRecord(Tag, { name: "js" });
  get(person, 'tags').pushObject(tag);

  equal(get(person, 'tags').objectAt(1), tag, "newly added relationship works");
});

test("it is possible to remove an item from a relationship", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany(Tag)
  });

  Tag.reopen({
    person: DS.belongsTo(Person)
  });

  var store = DS.Store.create();

  store.load(Person, { id: 1, name: "Tom Dale", tag_ids: [ 1 ] });
  store.load(Tag, { id: 1, name: "ember" });

  var person = store.find(Person, 1);
  var tag = get(person, 'tags').objectAt(0);

  equal(get(tag, 'name'), "ember", "precond - relationships work");

  get(person, 'tags').removeObject(tag);

  equal(get(person, 'tags.length'), 0, "object is removed from the relationship");
});

test("it is possible to add an item to a relationship, remove it, then add it again", function() {
  var Tag = DS.Model.extend();
  var Person = DS.Model.extend();

  Tag.reopen({
    name: DS.attr('string'),
    person: DS.belongsTo(Person)
  });
  Person.reopen({
    name: DS.attr('string'),
    tags: DS.hasMany(Tag)
  });
  Tag.toString = function() { return "App.Tag"; };
  Person.toString = function() { return "App.Person"; };

  var store = DS.Store.create();

  var person = store.createRecord(Person);
  var tag1 = store.createRecord(Tag);
  var tag2 = store.createRecord(Tag);
  var tag3 = store.createRecord(Tag);

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

module("RecordArray");

test("updating the content of a RecordArray updates its content", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var store = DS.Store.create();
  var references = store.loadMany(Tag, [5, 2, 12], [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }, { id: 12, name: "oohlala" }]);

  var tags = DS.RecordArray.create({ content: Ember.A(references.slice(0, 2)), store: store, type: Tag });

  var tag = tags.objectAt(0);
  equal(get(tag, 'name'), "friendly", "precond - we're working with the right tags");

  set(tags, 'content', Ember.A(references.slice(1, 3)));
  tag = tags.objectAt(0);
  equal(get(tag, 'name'), "smarmy", "the lookup was updated");
});

test("can create child record from a hasMany relationship", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany(Tag)
  });

  Tag.reopen({
    person: DS.belongsTo(Person)
  });

  var store = DS.Store.create();
  store.load(Person, 1, { id: 1, name: "Tom Dale"});

  var person = store.find(Person, 1);
  person.get("tags").createRecord({name:"cool"});

  equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");
  equal(get(person, 'tags.length'), 1, "tag is added to the parent record");
  equal(get(person, 'tags').objectAt(0).get("name"), "cool", "tag values are passed along");
});

module("DS.belongsTo");

test("belongsTo lazily loads relationships as needed", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });
  Tag.toString = function() { return "Tag"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo(Tag)
  });
  Person.toString = function() { return "Person"; };

  Tag.reopen({
    people: DS.hasMany(Person)
  });

  var store = DS.Store.create({ adapter: 'DS.Adapter' });
  store.loadMany(Tag, [5, 2, 12], [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }, { id: 12, name: "oohlala" }]);
  store.load(Person, 1, { id: 1, name: "Tom Dale", tag: 5 });

  var person = store.find(Person, 1);
  equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

  equal(get(person, 'tag') instanceof Tag, true, "the tag property should return a tag");
  equal(get(person, 'tag.name'), "friendly", "the tag shuld have name");

  strictEqual(get(person, 'tag'), get(person, 'tag'), "the returned object is always the same");
  strictEqual(get(person, 'tag'), store.find(Tag, 5), "relationship object is the same as object retrieved directly");
});

test("relationships work when the data hash has not been loaded", function() {
  expect(12);

  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo(Tag)
  });

  var store = DS.Store.create({
    adapter: DS.Adapter.create({
      find: function(store, type, id) {
        if (type === Person) {
          equal(type, Person, "type should be Person");
          equal(id, 1, "id should be 1");

          stop();

          setTimeout(function() {
            start();
            store.load(type, id, { id: 1, name: "Tom Dale", tag: 2 });

            equal(get(person, 'name'), "Tom Dale", "The person is now populated");
            equal(get(person, 'tag') instanceof Tag, true, "the tag Model already exists");
            equal(get(person, 'tag.isLoaded'), false, "the tag objects exist, but are not yet loaded");
          }, 1);
        } else if (type === Tag) {
          equal(type, Tag, "type should be Tag");
          equal(id, 2, "id should be 2");

          stop();

          setTimeout(function() {
            start();
            store.load(type, 2, { id: 2, name: "friendly" });

            equal(get(person, 'name'), "Tom Dale", "precond - the person is still Tom Dale");
            equal(get(person, 'tag.name'), "friendly", "Tom Dale is now friendly");
            equal(get(person, 'tag.isLoaded'), true, "Tom Dale is now loaded");
          }, 1);
        }
      }
    })
  });

  var person = store.find(Person, 1);

  equal(get(person, 'isLoaded'), false, "isLoaded should be false");
  equal(get(person, 'tag'), null, "tag should be null");
});

test("calling createRecord and passing in an undefined value for a relationship should be treated as if null", function () {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo(Tag),
  });

  Tag.reopen({
    person: DS.belongsTo(Person)
  });

  var store = DS.Store.create();

  store.createRecord(Person, {id: 1, tag: undefined});

  var person = store.find(Person, 1);

  strictEqual(person.get('tag'), null, "undefined values should return null relationships");
});

test("findMany is passed the owner record for adapters when some of the object graph is already loaded", function() {
  var Occupation = DS.Model.extend({
    description: DS.attr('string')
  });

  Occupation.toString = function() { return "Occupation"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    occupations: DS.hasMany(Occupation)
  });

  Person.toString = function() { return "Person"; };

  Occupation.reopen({
    person: DS.belongsTo(Person)
  });

  var store = DS.Store.create({
    adapter: DS.Adapter.create({
      findMany: function(store, type, ids, owner) {
        equal(type, Occupation, "type should be Occupation");
        deepEqual(ids, ['5', '2'], "ids should be 5 and 2");
        equal(get(owner, 'id'), 1, "the owner record id should be 1");

        stop();

        setTimeout(function() {
          start();
          store.loadMany(type, ids, [{ id: 5, description: "fifth" }, { id: 2, description: "second" }]);

          equal(get(person, 'name'), "Tom Dale", "the person is still Tom Dale");
          equal(get(person, 'occupations.length'), 2, "the occupation objects still exist");
          equal(get(get(person, 'occupations').objectAt(0), 'description'), "fifth", "the occupation is the fifth");
          equal(get(get(person, 'occupations').objectAt(0), 'isLoaded'), true, "the occupation is now loaded");
        }, 1);
      }
    })
  });

  store.load(Person, 1, { id: 1, name: "Tom Dale", occupations: [5, 2] });

  var person = store.find(Person, 1);

  equal(get(person, 'isLoaded'), true, "isLoaded should be true");
  equal(get(person, 'occupations.length'), 2, "the list of occupations should have the correct length");

});

test("findMany is passed the owner record for adapters when none of the object graph is loaded", function() {
  var Occupation = DS.Model.extend({
    description: DS.attr('string')
  });

  Occupation.toString = function() { return "Occupation"; };

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    occupations: DS.hasMany(Occupation)
  });

  Person.toString = function() { return "Person"; };

  Occupation.reopen({
    person: DS.belongsTo(Person)
  });

  var store = DS.Store.create({
    adapter: DS.Adapter.create({
      findMany: function(store, type, ids, owner) {
        equal(type, Occupation, "type should be Occupation");
        deepEqual(ids, ['5', '2'], "ids should be 5 and 2");
        equal(get(owner, 'id'), 1, "the owner record id should be 1");

        stop();

        setTimeout(function() {
          start();
          store.loadMany(type, ids, [{ id: 5, description: "fifth" }, { id: 2, description: "second" }]);

          equal(get(person, 'name'), "Tom Dale", "the person is still Tom Dale");
          equal(get(person, 'occupations.length'), 2, "the occupation objects still exist");
          equal(get(get(person, 'occupations').objectAt(0), 'description'), "fifth", "the occupation is the fifth");
          equal(get(get(person, 'occupations').objectAt(0), 'isLoaded'), true, "the occupation is now loaded");
        }, 1);
      },

      find: function(store, type, id) {
        equal(type, Person, "type should be Person");
        equal(id, 1, "id should be 1");

        stop();

        setTimeout(function() {
          start();
          store.load(type, id, { id: 1, name: "Tom Dale", occupations: [5, 2] });

          equal(get(person, 'name'), "Tom Dale", "The person is now populated");
          equal(get(person, 'occupations.length'), 2, "the occupations Array already exists");
          equal(get(get(person, 'occupations').objectAt(0), 'isLoaded'), false, "the occupation objects exist, but are not yet loaded");
        }, 1);
      }
    })
  });

  var person = store.find(Person, 1);

  equal(get(person, 'isLoaded'), false, "isLoaded should be false");
  equal(get(person, 'occupations.length'), 0, "occupations should be empty");

});

