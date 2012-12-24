/*global Tag App*/

var get = Ember.get, set = Ember.set;

module("DS.Model");

test("exposes a hash of the associations on a model", function() {
  var Occupation = DS.Model.extend();

  var Person = DS.Model.extend({
    occupations: DS.hasMany(Occupation)
  });

  Person.reopen({
    people: DS.hasMany(Person),
    parent: DS.belongsTo(Person)
  });

  var associations = get(Person, 'associations');
  deepEqual(associations.get(Person), [
    { name: "people", kind: "hasMany" },
    { name: "parent", kind: "belongsTo" }
  ]);

  deepEqual(associations.get(Occupation), [
    { name: "occupations", kind: "hasMany" }
  ]);
});

module("DS.hasMany");

test("hasMany lazily loads associations as needed", function() {
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
  equal(tags, get(person, 'tags'), "an association returns the same object every time");
  equal(get(get(person, 'tags'), 'length'), 2, "the length is updated after new data is loaded");

  strictEqual(get(person, 'tags').objectAt(0), get(person, 'tags').objectAt(0), "the returned object is always the same");
  strictEqual(get(person, 'tags').objectAt(0), store.find(Tag, 5), "association objects are the same as objects retrieved directly");

  var wycats = store.find(Person, 2);
  equal(get(wycats, 'name'), "Yehuda Katz", "precond - retrieves person record from store");

  equal(get(wycats, 'tags.length'), 1, "the list of tags should have the correct length");
  equal(get(get(wycats, 'tags').objectAt(0), 'name'), "oohlala", "the first tag should be a Tag");

  strictEqual(get(wycats, 'tags').objectAt(0), get(wycats, 'tags').objectAt(0), "the returned object is always the same");
  strictEqual(get(wycats, 'tags').objectAt(0), store.find(Tag, 12), "association objects are the same as objects retrieved directly");

  store.load(Person, 3, { id: 3, name: "KSelden" });
  var kselden = store.find(Person, 3);

  equal(get(get(kselden, 'tags'), 'length'), 0, "an association that has not been supplied returns an empty array");

  store.load(Person, 4, { id: 4, name: "Cyvid Hamluck", pets: [4] });
  var cyvid = store.find(Person, 4);
  equal(get(cyvid, 'name'), "Cyvid Hamluck", "precond - retrieves person record from store");

  var pets = get(cyvid, 'pets');
  equal(get(pets, 'length'), 1, "the list of pets should have the correct length");
  equal(get(pets.objectAt(0), 'name'), "fluffy", "the first pet should be correct");

  store.load(Person, 4, { id: 4, name: "Cyvid Hamluck", pets: [4, 12] });
  equal(pets, get(cyvid, 'pets'), "an association returns the same object every time");
  equal(get(get(cyvid, 'pets'), 'length'), 2, "the length is updated after new data is loaded");

  var newTag = store.createRecord(Tag);
  get(wycats, 'tags').pushObject(newTag);
});

test("should be able to retrieve the type for a hasMany association from its metadata", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany(Tag)
  });

  equal(Person.typeForAssociation('tags'), Tag, "returns the association type");
});

test("should be able to retrieve the type for a hasMany association specified using a string from its metadata", function() {
  window.Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.hasMany('Tag')
  });

  equal(Person.typeForAssociation('tags'), Tag, "returns the association type");
});

test("should be able to retrieve the type for a belongsTo association from its metadata", function() {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.belongsTo(Tag)
  });

  equal(Person.typeForAssociation('tags'), Tag, "returns the association type");
});

test("should be able to retrieve the type for a belongsTo association specified using a string from its metadata", function() {
  window.Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tags: DS.belongsTo('Tag')
  });

  equal(Person.typeForAssociation('tags'), Tag, "returns the association type");
});

test("associations work when declared with a string path", function() {
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
  store.load(App.Person, 1, { id: 1, name: "Tom Dale", tags: [5, 2] });

  var person = store.find(App.Person, 1);
  equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

  equal(get(person, 'tags.length'), 2, "the list of tags should have the correct length");
});

test("associations work when the data hash has not been loaded", function() {
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

test("it is possible to add a new item to an association", function() {
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

  store.load(Person, { id: 1, name: "Tom Dale", tags: [ 1 ] });
  store.load(Tag, { id: 1, name: "ember" });

  var person = store.find(Person, 1);
  var tag = get(person, 'tags').objectAt(0);

  equal(get(tag, 'name'), "ember", "precond - associations work");

  tag = store.createRecord(Tag, { name: "js" });
  get(person, 'tags').pushObject(tag);

  equal(get(person, 'tags').objectAt(1), tag, "newly added association works");
});

test("it is possible to remove an item from an association", function() {
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

  store.load(Person, { id: 1, name: "Tom Dale", tags: [ 1 ] });
  store.load(Tag, { id: 1, name: "ember" });

  var person = store.find(Person, 1);
  var tag = get(person, 'tags').objectAt(0);

  equal(get(tag, 'name'), "ember", "precond - associations work");

  get(person, 'tags').removeObject(tag);

  equal(get(person, 'tags.length'), 0, "object is removed from the association");
});

test("it is possible to add an item to an association, remove it, then add it again", function() {
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
  equal(get(person, 'tags.length'), 2, "object is removed from the association");

  tags.insertAt(0, tag2);
  equal(get(person, 'tags.length'), 3, "object is added back to the association");
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
  var loaded = store.loadMany(Tag, [5, 2, 12], [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }, { id: 12, name: "oohlala" }]);

  var clientIds = loaded.clientIds;

  var tags = DS.RecordArray.create({ content: Ember.A([clientIds[0], clientIds[1]]), store: store, type: Tag });

  var tag = tags.objectAt(0);
  equal(get(tag, 'name'), "friendly", "precond - we're working with the right tags");

  set(tags, 'content', Ember.A([clientIds[1], clientIds[2]]));
  tag = tags.objectAt(0);
  equal(get(tag, 'name'), "smarmy", "the lookup was updated");
});

test("can create child record from a hasMany association", function() {
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

test("belongsTo lazily loads associations as needed", function() {
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

  var store = DS.Store.create();
  store.loadMany(Tag, [5, 2, 12], [{ id: 5, name: "friendly" }, { id: 2, name: "smarmy" }, { id: 12, name: "oohlala" }]);
  store.load(Person, 1, { id: 1, name: "Tom Dale", tag: 5 });

  var person = store.find(Person, 1);
  equal(get(person, 'name'), "Tom Dale", "precond - retrieves person record from store");

  equal(get(person, 'tag') instanceof Tag, true, "the tag property should return a tag");
  equal(get(person, 'tag.name'), "friendly", "the tag shuld have name");

  strictEqual(get(person, 'tag'), get(person, 'tag'), "the returned object is always the same");
  strictEqual(get(person, 'tag'), store.find(Tag, 5), "association object is the same as object retrieved directly");
});

test("associations work when the data hash has not been loaded", function() {
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

test("calling createRecord and passing in an undefined value for an association should be treated as if null", function () {
  var Tag = DS.Model.extend({
    name: DS.attr('string')
  });

  var Person = DS.Model.extend({
    name: DS.attr('string'),
    tag: DS.belongsTo(Tag)
  });

  Tag.reopen({
    person: DS.hasOne(Person)
  });

  var store = DS.Store.create();

  store.createRecord(Person, {id: 1, tag: undefined});

  var person = store.find(Person, 1);

  strictEqual(person.get('tag'), null, "undefined values should return null associations");
});

test("changing a one-to-one relationship A=>B=>A should clean up the record", function() {
  var store = DS.Store.create();
  var Kidney = DS.Model.extend();
  var Person = DS.Model.extend();

  Kidney.reopen({
    person: DS.belongsTo(Person)
  });
  Kidney.toString = function() { return "Kidney"; };

  Person.reopen({
    name: DS.attr('string'),
    kidneys: DS.hasMany(Kidney)
  });
  Person.toString = function() { return "Person"; };

  store.load(Person, { id: 1, name: "John Doe", kidneys: [1, 2] });
  store.load(Person, { id: 2, name: "Jane Doe", kidneys: [3]});
  store.load(Kidney, { id: 1, person: 1 });
  store.load(Kidney, { id: 2, person: 1 });
  store.load(Kidney, { id: 3, person: 2 });

  var john = store.find(Person, 1);
  var jane = store.find(Person, 2);
  var kidney1 = store.find(Kidney, 1);
  var kidney2 = store.find(Kidney, 2);
  var kidney3 = store.find(Kidney, 3);

  deepEqual(john.get('kidneys').toArray(), [kidney1, kidney2], "precond - john should have the first two kidneys");
  deepEqual(jane.get('kidneys').toArray(), [kidney3], "precond - jane should have the third kidney");
  equal(kidney2.get('person'), john, "precond - second kidney should be in john");

  kidney2.set('person', jane);

  deepEqual(john.get('kidneys').toArray(), [kidney1], "precond - john should have only the first kidney");
  deepEqual(jane.get('kidneys').toArray(), [kidney3, kidney2], "precond - jane should have the other two kidneys");
  equal(kidney2.get('person'), jane, "precond - second kidney should be in jane");

  kidney2.set('person', john);

  deepEqual(john.get('kidneys').toArray(), [kidney1, kidney2], "john should have the first two kidneys again");
  deepEqual(jane.get('kidneys').toArray(), [kidney3], "jane should have the third kidney again");
  equal(kidney2.get('person'), john, "second kidney should be in john again");
});

test("changing a one-to-one relationship A=>B=>A should clean up the record", function() {
  var store = DS.Store.create();
  var Heart = DS.Model.extend();
  var Person = DS.Model.extend();

  Heart.reopen({
    person: DS.belongsTo(Person)
  });
  Heart.toString = function() { return "Heart"; };

  Person.reopen({
    name: DS.attr('string'),
    heart: DS.hasOne(Heart)
  });
  Person.toString = function() { return "Person"; };

  store.load(Person, { id: 1, name: "John Doe", heart: 1 });
  store.load(Person, { id: 2, name: "Jane Doe" });
  store.load(Heart, { id: 1, person: 1 });

  var john = store.find(Person, 1);
  var jane = store.find(Person, 2);
  var heart = store.find(Heart, 1);

  equal(john.get('heart'), heart, "precond - john should have the heart");
  equal(jane.get('heart'), null, "precond - jane should have no heart");
  equal(heart.get('person'), john, "precond - the heart should be in john");

  heart.set('person', jane);

  equal(john.get('heart'), null, "precond - john should have no heart");
  equal(jane.get('heart'), heart, "precond - jane should have the heart");
  equal(heart.get('person'), jane, "precond - the heart should be in jane");

  heart.set('person', john);

  equal(john.get('heart'), heart, "john should have the heart again");
  equal(jane.get('heart'), null, "jane should no longer have the heart");
  equal(heart.get('person'), john, "the heart should be in john again");
});

module("DS.hasOne");

test("getting the association when the data has been loaded", function() {
  var Person = DS.Model.extend(),
    Address = DS.Model.extend(),
    store = DS.Store.create();

  Person.reopen({
    name: DS.attr('string'),
    address: DS.hasOne(Address)
  });
  Person.toString = function() { return "Person"; };

  Address.reopen({
    street: DS.attr('string'),
    person: DS.belongsTo(Person)
  });
  Address.toString = function() { return "Address"; };

  store.loadMany(Person, [1, 2], [{ id: 1, name: "John Doe", address: 3 }, { id: 2, name: "Homeless Bob" }]);
  store.loadMany(Address, [2, 3, 4], [{ id: 2, street: "123 Main St" }, { id: 3, street: "456 Side St", person: 1 }, { id: 4, street: "789 Through Way" }]);

  var john = store.find(Person, 1);
  equal(get(john, 'address') instanceof Address, true, "the address property returns an address");
  equal(get(john, 'address.street'), "456 Side St", "the address has a street");

  strictEqual(get(john, 'address'), get(john, 'address'), "the returned object is always the same");
  strictEqual(get(john, 'address'), store.find(Address, 3), "association object is the same as object retrieved directly");

  var bob = store.find(Person, 2);
  ok(!get(bob, 'address'), "a person may not always have an address");
});

test("getting the association when the data has not been loaded", function() {
  expect(14);

  var Heart = DS.Model.extend();
  var Person = DS.Model.extend();

  Heart.reopen({
    pressure: DS.attr('string'),
    person: DS.belongsTo(Person)
  });
  Person.reopen({
    name: DS.attr('string'),
    heart: DS.hasOne(Heart)
  });
  Heart.toString = function() { return "App.Heart"; };
  Person.toString = function() { return "App.Person"; };

  var store = DS.Store.create({
    adapter: DS.Adapter.create({
      find: function(store, type, id) {
        if (type === Person) {
          equal(type, Person, "type should be Person");
          equal(id, 1, "id should be 1");

          stop();

          setTimeout(function() {
            start();
            store.load(type, id, { id: 1, name: "Tom Dale", heart: 2 });

            equal(get(person, 'name'), "Tom Dale", "the person is now populated");
            equal(get(person, 'isLoaded'), true, "the person is now loaded");
            equal(get(person, 'heart') instanceof Heart, true, "the person has a heart");
            equal(get(person, 'heart.isLoaded'), false, "the heart object exists, but is not yet loaded");
          }, 1);
        } else if (type === Heart) {
          equal(type, Heart, "type should be Heart");
          equal(id, 2, "id should be 2");

          stop();

          setTimeout(function() {
            start();
            store.load(type, 2, { id: 2, pressure: "100 kPa" });

            equal(get(person, 'name'), "Tom Dale", "precond - the person is still Tom Dale");
            equal(get(person, 'isLoaded'), true, "Tom Dale is still loaded");
            equal(get(person, 'heart.pressure'), "100 kPa", "Tom Dale now has a beating heart");
            equal(get(person, 'heart.isLoaded'), true, "Tom Dale's heart is now loaded");
          }, 1);
        }
      }
    })
  });

  var person = store.find(Person, 1);

  equal(get(person, 'isLoaded'), false, "isLoaded should be false");
  equal(get(person, 'heart'), null, "heart should be null");
});

test("creating a record with an undefined value for the association should be treated as null", function () {
  var store = DS.Store.create();
  var Heart = DS.Model.extend();
  var Person = DS.Model.extend();

  Heart.reopen({
    pressure: DS.attr('string'),
    person: DS.belongsTo(Person)
  });
  Person.reopen({
    name: DS.attr('string'),
    heart: DS.hasOne(Heart)
  });

  store.createRecord(Person, { id: 1, heart: undefined });
  var person = store.find(Person, 1);

  strictEqual(person.get('heart'), null, "undefined values should return null associations");
});

test("changing A=>B=>A should restore the associations", function() {
  var store = DS.Store.create();
  var Heart = DS.Model.extend();
  var Person = DS.Model.extend();

  Heart.reopen({
    pressure: DS.attr('string'),
    person: DS.belongsTo(Person)
  });
  Heart.toString = function() { return "Heart"; };

  Person.reopen({
    name: DS.attr('string'),
    heart: DS.hasOne(Heart)
  });
  Person.toString = function() { return "Person"; };

  store.load(Person, { id: 1, heart: 1 });
  store.load(Heart, { id: 1, person: 1 });
  store.load(Heart, { id: 2 });

  var person = store.find(Person, 1);
  var heart1 = store.find(Heart, 1);
  var heart2 = store.find(Heart, 2);

  equal(person.get('heart'), heart1, "precond - person should have the first heart");
  equal(heart1.get('person'), person, "precond - first heart should be in the person");
  equal(heart2.get('person'), null, "precond - second heart should be awaiting implantation");

  person.set('heart', heart2);

  equal(person.get('heart'), heart2, "precond - person should have the second heart");
  equal(heart1.get('person'), null, "precond - first heart should be on the operating table");
  equal(heart2.get('person'), person, "precond - second heart should be in the person");

  person.set('heart', heart1);

  equal(person.get('heart'), heart1, "person should have the first heart again");
  equal(heart1.get('person'), person, "first heart should be in the person again");
  equal(heart2.get('person'), null, "second heart should be out of the person again");
});
