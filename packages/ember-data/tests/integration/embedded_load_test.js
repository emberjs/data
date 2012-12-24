var originalLookup = Ember.lookup, lookup;

var Adapter, store;

var Person = DS.Model.extend();
var Comment = DS.Model.extend();
var Attachment = DS.Model.extend();

Person.reopen({
  name: DS.attr('string'),
  comments: DS.hasMany(Comment)
});

Comment.reopen({
  user: DS.belongsTo(Person),
  extra: DS.hasOne(Attachment)
});

Attachment.reopen({
  filename: DS.attr('string'),
  comment: DS.belongsTo(Comment)
});

module("Embedded Load", {
  setup: function() {
    lookup = Ember.lookup = {};

    lookup.Person = Person;
    lookup.Comment = Comment;
    lookup.Attachment = Attachment;

    Adapter = DS.Adapter.extend();

    store = DS.Store.create({
      adapter: Adapter
    });
  },
  teardown: function() {
    Ember.lookup = originalLookup;
  }
});

Ember.ArrayPolyfills.forEach.call([[Comment, "as a type"], ["Comment", "as a string"]], function(testInfo) {
  var mapping = testInfo[0], testString = testInfo[1];

  test("A belongsTo association can be marked as embedded via the `map` API (" + testString + ")", function() {
    Adapter.map(mapping, {
      user: { embedded: 'load' }
    });

    store.load(Comment, {
      id: 1,
      user: {
        id: 2,
        name: "Yehuda Katz"
      }
    });

    store.load(Comment, {
      id: 2,
      user: {
        id: 2,
        name: "Yehuda Katz"
      }
    });

    store.load(Comment, 3, {
      user: {
        id: 3,
        name: "Yehuda Katz"
      }
    });

    var comment1 = store.find(Comment, 1);
    var comment2 = store.find(Comment, 2);
    var comment3 = store.find(Comment, 3);
    var user = store.find(Person, 2);

    strictEqual(user.get('name'), "Yehuda Katz", "user is addressable by its ID despite being loaded via embedding");
    strictEqual(comment3.get('user.name'), "Yehuda Katz", "user is addressable by its ID despite being loaded via embedding (alternate load syntax)");

    strictEqual(comment1.get('user'), user, "association references the globally addressable record");
    strictEqual(comment2.get('user'), user, "associations are identical");
  });

  test("A hasOne association can be marked as embedded via the `map` API (" + testString + ")", function() {
    Adapter.map(mapping, {
      extra: { embedded: 'load' }
    });

    store.load(Comment, {
      id: 1,
      extra: {
        id: 2,
        filename: "ep1.mp3"
      }
    });

    store.load(Comment, {
      id: 2,
      extra: {
        id: 2,
        filename: "ep1.mp3"
      }
    });

    var comment1 = store.find(Comment, 1);
    var comment2 = store.find(Comment, 2);
    var extra = store.find(Attachment, 2);

    strictEqual(extra.get('filename'), "ep1.mp3", "extra is addressable by its ID despite being loaded via embedding");

    strictEqual(comment1.get('extra'), extra, "association references the globally addressable record");
    strictEqual(comment2.get('extra'), extra, "associations are identical");
  });
});

Ember.ArrayPolyfills.forEach.call([Person, "Person"], function(mapping) {
  test("A hasMany association can be marked as embedded via the `map` API", function() {
    Adapter.map(mapping, {
      comments: { embedded: 'load' }
    });

    store.load(Person, {
      id: 1,
      name: "Erik Brynroflsson",
      comments: [{ id: 1 }, { id: 2 }]
    });

    store.load(Person, {
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
