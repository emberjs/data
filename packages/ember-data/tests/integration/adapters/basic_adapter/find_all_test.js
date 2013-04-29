var get = Ember.get, set = Ember.set;
var store, adapter, Person, PhoneNumber;

module("Basic Adapter - Find All", {
  setup: function() {
    adapter = DS.BasicAdapter.create();
    store = DS.Store.create({
      adapter: adapter
    });

    var attr = DS.attr, hasMany = DS.hasMany, belongsTo = DS.belongsTo;
    Person = DS.Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
      createdAt: attr('date')
    });

    PhoneNumber = DS.Model.extend({
      areaCode: attr('number'),
      number: attr('number'),
      person: belongsTo(Person)
    });

    Person.reopen({
      phoneNumbers: hasMany(PhoneNumber)
    });
  },

  teardown: function() {
    Ember.run(function() {
      DS.clearTransforms();
      store.destroy();
      adapter.destroy();
    });
  }
});

test("The sync object is consulted to find all records of a type", function() {
  expect(3);

  var people;

  Person.sync = {
    findAll: function(load) {
      setTimeout(async(function() {
        Ember.run(function() {
          load([{
            id: 1,
            firstName: "Yehuda",
            lastName: "Katz"
          }, {
            id: 2,
            firstName: "Tom",
            lastName: "Dale"
          }]);
        });

        equal(get(people, 'length'), 2, "array has been populated with two records");

        var person = people.objectAt(1);
        deepEqual(person.getProperties('id', 'firstName', 'lastName'), {
          id: "2",
          firstName: "Tom",
          lastName: "Dale"
        }, "record was populated with attributes from adapter");
      }));
    }
  };

  people = Person.find();
  equal(get(people, 'length'), 0, "precond - the array is not yet populated");
});
