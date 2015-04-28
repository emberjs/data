var attr = DS.attr;
var belongsTo = DS.belongsTo;
var hasMany = DS.hasMany;
var run = Ember.run;
var env;

var Person = DS.Model.extend({
  name: attr('string'),
  cars: hasMany('car')
});

Person.toString = function() { return "Person"; };

var Group = DS.Model.extend({
  people: hasMany('person')
});

Group.toString = function() { return "Group"; };

var Car = DS.Model.extend({
  make: attr('string'),
  model: attr('string'),
  person: belongsTo('person')
});

Car.toString = function() { return "Car"; };

module("integration/unload - Unloading Records", {
  setup: function() {
    env = setupStore({
      person: Person,
      car: Car,
      group: Group
    });
  },

  teardown: function() {
    Ember.run(function() {
      env.container.destroy();
    });
  }
});

test("can unload a single record", function () {
  var adam;
  run(function() {
    adam = env.store.push('person', { id: 1, name: "Adam Sunderland" });
  });

  Ember.run(function() {
    adam.unloadRecord();
  });

  equal(env.store.all('person').get('length'), 0);
});

test("can unload all records for a given type", function () {
  expect(2);

  var adam, bob, dudu;
  run(function() {
    adam = env.store.push('person', { id: 1, name: "Adam Sunderland" });
    bob = env.store.push('person', { id: 2, name: "Bob Bobson" });

    dudu = env.store.push('car', {
      id: 1,
      make: "VW",
      model: "Beetle",
      person: 1
    });
  });

  Ember.run(function() {
    env.store.unloadAll('person');
  });

  equal(env.store.all('person').get('length'), 0);
  equal(env.store.all('car').get('length'), 1);
});

test("can unload all records", function () {
  expect(2);

  var adam, bob, dudu;
  run(function() {
    adam = env.store.push('person', { id: 1, name: "Adam Sunderland" });
    bob = env.store.push('person', { id: 2, name: "Bob Bobson" });

    dudu = env.store.push('car', {
      id: 1,
      make: "VW",
      model: "Beetle",
      person: 1
    });
  });

  Ember.run(function() {
    env.store.unloadAll();
  });

  equal(env.store.all('person').get('length'), 0);
  equal(env.store.all('car').get('length'), 0);
});

test("Unloading all records for a given type clears saved meta data.", function () {

  function metadataKeys(type) {
    return Ember.keys(env.store.metadataFor(type));
  }

  run(function() {
    env.store.setMetadataFor('person', { count: 10 });
  });

  Ember.run(function() {
    env.store.unloadAll('person');
  });

  deepEqual(metadataKeys('person'), [], 'Metadata for person is empty');

});

test("removes findAllCache after unloading all records", function () {
  var adam, bob;
  run(function() {
    adam = env.store.push('person', { id: 1, name: "Adam Sunderland" });
    bob = env.store.push('person', { id: 2, name: "Bob Bobson" });
  });

  Ember.run(function() {
    env.store.all('person');
    env.store.unloadAll('person');
  });

  equal(env.store.all('person').get('length'), 0);
});

test("unloading all records also updates record array from all()", function() {
  var adam, bob;
  run(function() {
    adam = env.store.push('person', { id: 1, name: "Adam Sunderland" });
    bob = env.store.push('person', { id: 2, name: "Bob Bobson" });
  });
  var all = env.store.all('person');

  equal(all.get('length'), 2);

  Ember.run(function() {
    env.store.unloadAll('person');
  });

  equal(all.get('length'), 0);
});


test("unloading a record also clears its relationship", function() {
  var adam, bob;
  run(function() {
    adam = env.store.push('person', {
      id: 1,
      name: "Adam Sunderland",
      cars: [1]
    });
  });

  run(function() {
    bob = env.store.push('car', {
      id: 1,
      make: "Lotus",
      model: "Exige",
      person: 1
    });
  });

  run(function() {
    env.store.find('person', 1).then(function(person) {
      equal(person.get('cars.length'), 1, 'The inital length of cars is correct');

      run(function() {
        person.unloadRecord();
      });

      equal(person.get('cars.length'), undefined);
    });
  });
});

test("unloading a record also clears the implicit inverse relationships", function() {
  var adam, bob;
  run(function() {
    adam = env.store.push('person', {
      id: 1,
      name: "Adam Sunderland"
    });
  });

  run(function() {
    bob = env.store.push('group', {
      id: 1,
      people: [1]
    });
  });

  run(function() {
    env.store.find('group', 1).then(function(group) {
      equal(group.get('people.length'), 1, 'The inital length of people is correct');
      var person = env.store.getById('person', 1);
      run(function() {
        person.unloadRecord();
      });

      equal(group.get('people.length'), 0, 'Person was removed from the people array');
    });
  });
});
