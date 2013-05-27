var serializer, originalLookup = Ember.lookup, lookup;

var Group = DS.Model.extend();
var Comment = DS.Model.extend();

var Person = DS.Model.extend({
  group: DS.belongsTo(Group),
  comments: DS.hasMany(Comment)
});

module("DS.Serializer", {
  setup: function() {
    lookup = Ember.lookup = {};

    lookup.Comment = Comment;
    lookup.Group = Group;
    lookup.Person = Person;

    serializer = DS.Serializer.create();
  },

  teardown: function() {
    serializer.destroy();

    Ember.lookup = originalLookup;
  }
});

test("extractEmbeddedData is called to retrieve the data associated with an embedded hasMany relationship", function() {
  expect(1);

  var loader = {
    load: function() {},
    prematerialize: function() {}
  };

  serializer.map( 'Person', {
    comments: {embedded: 'load'}
  });

  serializer.extractEmbeddedData = function(data, key) {
    equal(key, 'comments', "The serializer can extract embedded hasMany relationship");
  };

  serializer.extractRecordRepresentation( loader, Person, {comments: [1, 2, 3]}, false);
});

test("extractEmbeddedData is called to retrieve the data associated with an embedded belongsTo relationship", function() {
  expect(1);

  var loader = {
    load: function() {},
    prematerialize: function() {}
  };

  serializer.map( 'Person', {
    group: {embedded: 'load'}
  });

  serializer.extractEmbeddedData = function(data, key) {
    equal(key, 'group', "The serializer can extract embedded belongTo relationship");
  };

  serializer.extractRecordRepresentation( loader, Person, {group: {id: 1}}, false);
});
