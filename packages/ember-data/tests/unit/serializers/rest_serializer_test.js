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

test("Calling extract on a JSON payload with multiple records will tear them apart and call loader", function() {
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

  var loadCallCount = 0,
      loadMainCallCount = 0;

  var loader = {
    sideload: function(type, data, prematerialized) {
      loadCallCount++;
    },

    load: function(type, data, prematerialized) {
      loadMainCallCount++;
    },

    prematerialize: Ember.K
  };

  serializer.extract(loader, payload, App.Post);

  equal(loadMainCallCount, 1, "one main record was loaded from a single payload");
  equal(loadCallCount, 1, "one secondary record was loaded from a single payload");

  //this.extractRecord(type, structure, loader)

  //function extractRecord(type, structure, loader) {
    //loader.load(type, structure, {
      //id: this.extractId(structure),
      //hasMany: { comments: [ 1,2,3 ] }
    //});
  //}
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

  var loadCallCount = 0,
      loadMainCallCount = 0;

  var loader = {
    sideload: function(type, data, prematerialized) {
      if(type === App.Group) {
        loadCallCount++;
      }
    },

    load: function(type, data, prematerialized) {
      loadMainCallCount++;
    },

    prematerialize: Ember.K
  };

  serializer.extract(loader, payload, App.Post);

  equal(loadMainCallCount, 1, "one main record was loaded from a single payload");
  equal(loadCallCount, 1, "one secondary record was loaded from a single payload");
});
