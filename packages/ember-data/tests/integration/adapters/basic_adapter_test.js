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

test("An adapter can use `munge` for arbitrary transformations", function() {
  Person.sync = {
    find: function(id, process) {
      setTimeout(async(function() {
        process({ id: 1, FIRST_NAME: "Tom", LAST_NAME: "Dale", didCreateAtTime: "1986-06-09" })
          .munge(function(json) {
            json.firstName = json.FIRST_NAME;
            json.lastName = json.LAST_NAME;
            json.createdAt = json.didCreateAtTime;
          })
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

test("A query will invoke the findQuery hook on the sync object", function() {
  Person.sync = {
    query: function(query, process) {
      deepEqual(query, { all: true }, "The query was passed through");

      setTimeout(async(function() {
        process([
          { id: 1, first_name: "Yehuda", last_name: "Katz" },
          { id: 2, first_name: "Tom", last_name: "Dale" }
        ]).camelizeKeys().load();
      }));
    }
  };

  var people = Person.query({ all: true });

  people.then(function() {
    equal(get(people, 'length'), 2, "The people are loaded in");
    deepEqual(people.objectAt(0).getProperties('id', 'firstName', 'lastName'), {
      id: "1",
      firstName: "Yehuda",
      lastName: "Katz"
    });

    deepEqual(people.objectAt(1).getProperties('id', 'firstName', 'lastName'), {
      id: "2",
      firstName: "Tom",
      lastName: "Dale"
    });
  });
});

test("A query's processor supports munge across all elements in its Array", function() {
  Person.sync = {
    query: function(query, process) {
      deepEqual(query, { all: true }, "The query was passed through");

      setTimeout(async(function() {
        process([
          { id: 1, "name,first": "Yehuda", "name,last": "Katz" },
          { id: 2, "name,first": "Tom", "name,last": "Dale" }
        ])
        .munge(function(json) {
          json.firstName = json["name,first"];
          json.lastName = json["name,last"];
        })
        .load();
      }));
    }
  };

  var people = Person.query({ all: true });

  people.then(function() {
    equal(get(people, 'length'), 2, "The people are loaded in");
    deepEqual(people.objectAt(0).getProperties('id', 'firstName', 'lastName'), {
      id: "1",
      firstName: "Yehuda",
      lastName: "Katz"
    });

    deepEqual(people.objectAt(1).getProperties('id', 'firstName', 'lastName'), {
      id: "2",
      firstName: "Tom",
      lastName: "Dale"
    });
  });
});

