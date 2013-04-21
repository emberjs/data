var get = Ember.get, set = Ember.set;

var serializer;

module("DS.RESTSerializer", {
  setup: function() {
    serializer = DS.RESTSerializer.create();
    serializer.configure('plurals', {
      person: 'people'
    });
  },
  teardown: function() {
    serializer.destroy();
  }
});

test("keyForAttributeName returns decamelized property name", function() {
  equal(serializer.keyForAttributeName(DS.Model, 'myName'), 'my_name');
  equal(serializer.keyForAttributeName(DS.Model, 'my_name'), 'my_name');
});

test("keyForBelongsTo returns the key appended with '_id'", function() {
  equal(serializer.keyForBelongsTo(DS.Model, 'person'), 'person_id');
  equal(serializer.keyForBelongsTo(DS.Model, 'town'), 'town_id');
  equal(serializer.keyForBelongsTo(DS.Model, 'homeTown'), 'home_town_id');
});

test("keyForHasMany returns the singularized key appended with '_ids'", function() {
  equal(serializer.keyForHasMany(DS.Model, 'people'), 'person_ids');
  equal(serializer.keyForHasMany(DS.Model, 'towns'), 'town_ids');
  equal(serializer.keyForHasMany(DS.Model, 'homeTowns'), 'home_town_ids');
});

test("extractBelongsToPolymorphic returns a tuple containing the type", function() {
  deepEqual(serializer.extractBelongsToPolymorphic(DS.Model, {message_id: 2, message_type: 'post'}, 'message_id'), {id: 2, type: 'post'});
});

test("extracting a JSON payload with multiple records will return data for each", function() {
  var App = Ember.Namespace.create({
    toString: function() { return "App"; }
  });

  App.Group = DS.Model.extend({
    name: DS.attr('string')
  });

  App.Post = DS.Model.extend({
    title: DS.attr('string'),
    groups: DS.hasMany(App.Group)
  });

  serializer.configure(App.Group, {
    sideloadAs: 'groups'
  });

  var payload = {
    post: {
      id: 1,
      title: "Fifty Ways to Bereave Your Lover",
      groups: [1]
    },

    groups: [{ id: 1, name: "Trolls" }]
  };

  var result = serializer.extract(App.Post, payload);

  equal(result.sideloaded.length, 1);
  deepEqual(result.raw, payload['post']);
});

test("Sideloading can be done by specifying only an alias", function() {
  var App = Ember.Namespace.create({
    toString: function() { return "App"; }
  });

  App.Group = DS.Model.extend({
    name: DS.attr('string')
  });

  App.Post = DS.Model.extend({
    title: DS.attr('string')
  });

  serializer.configure(App.Group, {
    alias: 'group'
  });

  var payload = {
    post: {
      id: 1,
      title: "Fifty Ways to Bereave Your Lover"
    },

    groups: [{ id: 1, name: "Trolls" }]
  };

  var result = serializer.extract(App.Post, payload);

  equal(result.sideloaded.length, 1);
  deepEqual(result.raw, payload['post']);
});
