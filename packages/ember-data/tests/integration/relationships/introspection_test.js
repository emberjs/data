var Blog, User, Post;
var lookup, oldLookup;

module("Relationship Introspection", {
  setup: function() {
    oldLookup = Ember.lookup;
    Ember.lookup = {};

    User = DS.Model.extend();
    Post = DS.Model.extend();
    Blog = DS.Model.extend({
      admins: DS.hasMany(User),
      owner: DS.belongsTo(User),

      posts: DS.hasMany(Post)
    });
  },

  teardown: function() {
    Ember.lookup = oldLookup;
  }
});

test("DS.Model class computed property `relationships` returns a map keyed on types", function() {
  var relationships = Ember.get(Blog, 'relationships');

  var expected = [{ name: 'admins', kind: 'hasMany'  }, { name: 'owner', kind: 'belongsTo' }];
  deepEqual(relationships.get(User), expected, "user relationships returns expected array");

  expected = [{ name: 'posts', kind: 'hasMany' }];
  deepEqual(relationships.get(Post), expected, "post relationships returns expected array");
});

test("DS.Model class computed property `relationships` returns a map keyed on types when types are specified as strings", function() {
  Blog = DS.Model.extend({
    admins: DS.hasMany('User'),
    owner: DS.belongsTo('User'),

    posts: DS.hasMany('Post')
  });

  Ember.lookup = {
    User: DS.Model.extend(),
    Post: DS.Model.extend()
  };

  var relationships = Ember.get(Blog, 'relationships');

  var expected = [{ name: 'admins', kind: 'hasMany'  }, { name: 'owner', kind: 'belongsTo' }];
  deepEqual(relationships.get(Ember.lookup.User), expected, "user relationships returns expected array");

  expected = [{ name: 'posts', kind: 'hasMany' }];
  deepEqual(relationships.get(Ember.lookup.Post), expected, "post relationships returns expected array");
});
