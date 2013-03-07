var get = Ember.get;

var store, adapter, Person;
module("Basic Adapter", {
  setup: function() {
    adapter = DS.BasicAdapter.create();
    store = DS.Store.create({
      adapter: adapter
    });

    var attr = DS.attr;
    Person = DS.Model.extend({
      firstName: attr('string'),
      lastName: attr('string')
    });
  },

  teardown: function() {
    Ember.run(function() {
      store.destroy();
      adapter.destroy();
    });
  }
});

test("The sync object is consulted to load data", function() {
  Person.sync = {
    find: function(id, process) {
      equal(id, "1", "The correct ID is passed through");
      setTimeout(async(function() {
        process({ id: 1, firstName: "Tom", lastName: "Dale" }).load();
      }));
    }
  };

  var person = Person.find(1);

  equal(get(person, 'id'), "1", "The id is the coerced ID passed to find");

  person.on('didLoad', async(function() {
    equal(get(person, 'firstName'), "Tom");
    equal(get(person, 'lastName'), "Dale");
    equal(get(person, 'id'), "1", "The id is still the same");
  }));
});
