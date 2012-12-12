var get = Ember.get, set = Ember.set;

var serializer;

module("DS.RESTSerializer", {
  setup: function() {
    serializer = DS.RESTSerializer.create();
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
  equal(serializer.keyForBelongsTo(DS.Model, 'homeTown'), 'home_town_id');
});

test("Calling extract on a JSON payload with multiple records will tear them apart and call loader", function() {
  throw new Error("This test is pending");
  var Group = DS.Model.extend();

  serializer.mappings = {
    groups: Group
  };

  var payload = {
    post: {
      id: 1,
      title: "Fifty Ways to Bereave Your Lover"
    },

    groups: [{ id: 1, name: "To..." }]
  };

  var loader = {
    load: function(type, data, prematerialized) { }
  };

  serializer.extract(payload, loader);

  //this.extractRecord(type, structure, loader)

  //function extractRecord(type, structure, loader) {
    //loader.load(type, structure, {
      //id: this.extractId(structure),
      //hasMany: { comments: [ 1,2,3 ] }
    //});
  //}
});

