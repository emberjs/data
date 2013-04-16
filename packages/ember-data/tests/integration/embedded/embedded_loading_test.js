var originalLookup = Ember.lookup, lookup;

var Adapter, store, serializer, adapter;

var App = Ember.Namespace.create({
  name: "App"
});

var Person = App.Person = DS.Model.extend();

var Comment = App.Comment = DS.Model.extend({
  user: DS.belongsTo(Person)
});

var Group = App.Group = DS.Model.extend({
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

  asyncTest("An embedded hasMany relationship can be extracted if the JSON is returned in response to a find", function() {
    Adapter.map(mapping, {
      comments: { embedded: 'load' }
    });

    adapter = Adapter.create();
    store.set('adapter', adapter);

    adapter.find = function(store, type, id) {
      var self = this;

      setTimeout(function() {
        Ember.run(function() {
          self.didFindRecord(store, type, {
            person: {
              id: 1,
              name: "Erik Brynroflsson",
              comments: [{ id: 1 }, { id: 2 }]
            }
          }, id);
        });

        done();
      });
    };

    store.find(Person, 1);

    function done() {
      start();

      var person1 = store.find(Person, 1);
      var comment1 = store.find(Comment, 1);
      var comment2 = store.find(Comment, 2);

      strictEqual(person1.get('comments').objectAt(0), comment1);
    }
  });

  asyncTest("An embedded hasMany relationship can be extracted if the JSON is returned in response to a findAll", function() {
    Adapter.map(mapping, {
      comments: { embedded: 'load' }
    });

    adapter = Adapter.create();
    store.set('adapter', adapter);

    adapter.findAll = function(store, type) {
      var self = this;

      setTimeout(function() {
        Ember.run(function() {
          self.didFindAll(store, type, {
            persons: [{
              id: 1,
              name: "Erik Brynroflsson",
              comments: [{ id: 1 }, { id: 2 }]
            }, {
              id: 2,
              name: "Patrick Gibson",
              comments: [{ id: 1 }, { id: 2 }]
            }]
          });
        });

        done();
      });
    };

    store.find(Person);

    function done() {
      start();

      var person1 = store.find(Person, 1);
      var person2 = store.find(Person, 2);
      var comment1 = store.find(Comment, 1);
      var comment2 = store.find(Comment, 2);

      strictEqual(person1.get('comments').objectAt(0), comment1);
      strictEqual(person2.get('comments').objectAt(0), comment1);
    }
  });

  test("Loading the same record with embedded hasMany multiple times works correctly", function() {
    Adapter.map(mapping, {
      comments: { embedded: 'load' }
    });

    adapter = Adapter.create();
    store.set('adapter', adapter);

    Ember.run(function() {
      adapter.load(store, Person, {
        id: 1,
        name: "Erik Brynroflsson",
        comments: [{ id: 1 }, { id: 2 }]
      });
    });

    var person = store.find(Person, 1);
    person.get('comments');

    // Load the same data twice
    Ember.run(function() {
      adapter.load(store, Person, {
        id: 1,
        name: "Erik Brynroflsson",
        comments: [{ id: 1 }, { id: 2 }]
      });
    });

    var comment1 = person.get('comments').objectAt(0);

    equal(comment1.get('id'), 1, "comment with ID 1 was loaded");
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

test("updating a embedded record with a belongsTo relationship is serialize correctly.", function() {
    Adapter.map(Comment, {
      user: { embedded: 'load' }
    });

    Adapter.map(Person, {
      group: { embedded: 'load' }
    });

    adapter = Adapter.create();
    serializer = adapter.get('serializer');
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
    adapter.load(store, Person, {
      id: 4,
      name: "Peter Pan"
    });

    var comment = store.find(Comment, 1);
    var yehuda = store.find(Person, 2);
    var peter = store.find(Person, 4);

    comment.set('user', peter);
    strictEqual(comment.get('user'), peter, "updated relationship references the globally addressable record");

    var commentJSON = serializer.serialize(comment, { includeId: true });
    deepEqual(commentJSON, { id: 1, user: { id: 4, name: "Peter Pan", group: null }});
});

