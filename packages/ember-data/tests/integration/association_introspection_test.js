var Blog, User, Post;
var lookup, oldLookup;

module("Association Introspection", {
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

test("DS.Model class computed property `associations` returns a map keyed on types", function() {
  var associations = Ember.get(Blog, 'associations');

  var expected = [{ name: 'admins', kind: 'hasMany'  }, { name: 'owner', kind: 'belongsTo' }];
  deepEqual(associations.get(User), expected, "user associations returns expected array");

  expected = [{ name: 'posts', kind: 'hasMany' }];
  deepEqual(associations.get(Post), expected, "post associations returns expected array");
});

test("DS.Model class computed property `associations` returns a map keyed on types when types are specified as strings", function() {
  Blog = DS.Model.extend({
    admins: DS.hasMany('User'),
    owner: DS.belongsTo('User'),

    posts: DS.hasMany('Post')
  });

  Ember.lookup = {
    User: DS.Model.extend(),
    Post: DS.Model.extend()
  };

  var associations = Ember.get(Blog, 'associations');

  var expected = [{ name: 'admins', kind: 'hasMany'  }, { name: 'owner', kind: 'belongsTo' }];
  deepEqual(associations.get(Ember.lookup.User), expected, "user associations returns expected array");

  expected = [{ name: 'posts', kind: 'hasMany' }];
  deepEqual(associations.get(Ember.lookup.Post), expected, "post associations returns expected array");
});
