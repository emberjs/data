var originalLookup = Ember.lookup, lookup;

var Adapter, store, adapter;

var Person = DS.Model.extend();

var Comment = DS.Model.extend({
  user: DS.belongsTo(Person)
});

var Group = DS.Model.extend({
  name: DS.attr('string'),
  people: DS.hasMany(Person)
});

Person.reopen({
  name: DS.attr('string'),
  group: DS.belongsTo(Group),
  comments: DS.hasMany(Comment)
});

module("Embedded Loading", {
  setup: function() {
    lookup = Ember.lookup = {};

    lookup.Person = Person;
    lookup.Comment = Comment;

    Adapter = DS.RESTAdapter.extend();

    store = DS.Store.create();
  },

  teardown: function() {
    Ember.lookup = originalLookup;
  }
});

Ember.ArrayPolyfills.forEach.call([[Comment, "as a type"], ["Comment", "as a string"]], function(testInfo) {
  var mapping = testInfo[0], testString = testInfo[1];
  test("A belongsTo relationship can be marked as embedded via the `map` API (" + testString + ")", function() {
    Adapter.map(mapping, {
      user: { embedded: 'load' }
    });

    adapter = Adapter.create();
    store.set('adapter', adapter);

    adapter.load(store, Comment, {
      id: 1,
      user: {
        id: 2,
        name: "Yehuda Katz"
      }
    });

    adapter.load(store, Comment, {
      id: 2,
      user: {
        id: 2,
        name: "Yehuda Katz"
      }
    });

    var comment1 = store.find(Comment, 1);
    var comment2 = store.find(Comment, 2);
    var user = store.find(Person, 2);

    strictEqual(user.get('name'), "Yehuda Katz", "user is addressable by its ID despite being loaded via embedding");

    strictEqual(comment1.get('user'), user, "relationship references the globally addressable record");
    strictEqual(comment2.get('user'), user, "relationships are identical");
  });
});

Ember.ArrayPolyfills.forEach.call([Person, "Person"], function(mapping) {
  test("A hasMany relationship can be marked as embedded via the `map` API", function() {
    Adapter.map(mapping, {
      comments: { embedded: 'load' }
    });

    adapter = Adapter.create();
    store.set('adapter', adapter);

    adapter.load(store, Person, {
      id: 1,
      name: "Erik Brynroflsson",
      comments: [{ id: 1 }, { id: 2 }]
    });

    adapter.load(store, Person, {
      id: 2,
      name: "Patrick Gibson",
      comments: [{ id: 1 }, { id: 2 }]
    });

    var person1 = store.find(Person, 1);
    var person2 = store.find(Person, 2);
    var comment1 = store.find(Comment, 1);
    var comment2 = store.find(Comment, 2);

    strictEqual(person1.get('comments').objectAt(0), comment1);
    strictEqual(person2.get('comments').objectAt(0), comment1);
  });
});

test("A nested belongsTo relationship can be marked as embedded via the `map` API", function() {
    Adapter.map(Comment, {
      user: { embedded: 'load' }
    });

    Adapter.map(Person, {
      group: { embedded: 'load' }
    });

    adapter = Adapter.create();
    store.set('adapter', adapter);

    adapter.load(store, Comment, {
      id: 1,
      user: {
        id: 2,
        name: "Yehuda Katz",
        group: {
          id: 3,
          name: "Developers"
        }
      }
    });

    var comment = store.find(Comment, 1);
    var group = store.find(Group, 3);

    strictEqual(group.get('name'), "Developers", "Group is addressable by its ID despite being loaded via embedding");
    strictEqual(comment.get('user.group'), group, "relationship references the globally addressable record");
});
