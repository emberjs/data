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
      lastName: attr('string'),
      createdAt: attr('date')
    });

    DS.registerTransforms('test', {
      date: {
        serialize: function(value) {
          return value.toString();
        },

        deserialize: function(string) {
          return new Date(string);
        }
      }
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

test("A camelizeKeys() convenience will camelize all of the keys", function() {
  Person.sync = {
    find: function(id, process) {
      setTimeout(async(function() {
        process({ id: 1, first_name: "Tom", last_name: "Dale" })
          .camelizeKeys()
          .load();
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

test("An applyTransforms method will apply registered transforms", function() {
  Person.sync = {
    find: function(id, process) {
      setTimeout(async(function() {
        process({ id: 1, firstName: "Tom", lastName: "Dale", createdAt: "1986-06-09" })
          .applyTransforms('test')
          .load();
      }));
    }
  };

  var person = Person.find(1);

  equal(get(person, 'id'), "1", "The id is the coerced ID passed to find");

  person.on('didLoad', async(function() {
    equal(get(person, 'firstName'), "Tom");
    equal(get(person, 'lastName'), "Dale");
    equal(get(person, 'createdAt').valueOf(), new Date("1986-06-09").valueOf(), "The date was properly transformed");
    equal(get(person, 'id'), "1", "The id is still the same");
  }));
});
