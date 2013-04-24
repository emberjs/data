var get = Ember.get;

var store, adapter, Person, PhoneNumber;

module("Basic Adapter - Finding", {
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
    find: function(id, load) {
      equal(id, "1", "The correct ID is passed through");
      setTimeout(async(function() {
        load({ id: 1, firstName: "Tom", lastName: "Dale" });
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

var process = DS.process;

test("A camelizeKeys() convenience will camelize all of the keys", function() {
  Person.sync = {
    find: function(id, load) {
      setTimeout(async(function() {
        var json = process({ id: 1, first_name: "Tom", last_name: "Dale" }).camelizeKeys();
        load(json);
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

// test("An applyTransforms method will apply registered transforms", function() {
//   Person.sync = {
//     find: function(id, process) {
//       setTimeout(async(function() {
//         process({ id: 1, firstName: "Tom", lastName: "Dale", createdAt: "1986-06-09" })
//           .applyTransforms('test')
//           .load();
//       }));
//     }
//   };

//   var person = Person.find(1);

//   equal(get(person, 'id'), "1", "The id is the coerced ID passed to find");

//   person.on('didLoad', async(function() {
//     equal(get(person, 'firstName'), "Tom");
//     equal(get(person, 'lastName'), "Dale");
//     equal(get(person, 'createdAt').valueOf(), new Date("1986-06-09").valueOf(), "The date was properly transformed");
//     equal(get(person, 'id'), "1", "The id is still the same");
//   }));
// });

test("An adapter can use `munge` for arbitrary transformations", function() {
  Person.sync = {
    find: function(id, load) {
      setTimeout(async(function() {
        var json = process({ id: 1, FIRST_NAME: "Tom", LAST_NAME: "Dale", didCreateAtTime: "1986-06-09" })
          .munge(function(json) {
            json.firstName = json.FIRST_NAME;
            json.lastName = json.LAST_NAME;
            json.createdAt = new Date(json.didCreateAtTime);
          });

        load(json);
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
    query: function(query, load) {
      deepEqual(query, { all: true }, "The query was passed through");

      setTimeout(async(function() {
        var json = process([
          { id: 1, first_name: "Yehuda", last_name: "Katz" },
          { id: 2, first_name: "Tom", last_name: "Dale" }
        ]).camelizeKeys();
        load(json);
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
    query: function(query, load) {
      deepEqual(query, { all: true }, "The query was passed through");

      setTimeout(async(function() {
        var json = process([
          { id: 1, "name,first": "Yehuda", "name,last": "Katz" },
          { id: 2, "name,first": "Tom", "name,last": "Dale" }
        ])
        .munge(function(json) {
          json.firstName = json["name,first"];
          json.lastName = json["name,last"];
        });
        load(json);
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

 test("A basic adapter receives a call to find<Relationship> for relationships", function() {
   expect(3);

   Person.sync = {
     find: function(id, load) {
       setTimeout(async(function() {
         load(process({ id: 1, firstName: "Tom", lastName: "Dale" }));
       }));
     },

     findPhoneNumbers: function(person, options, load) {
       setTimeout(async(function() {
         load(process([ { id: 1, areaCode: 703, number: 1234567 }, { id: 2, areaCode: 904, number: 9543256 } ]));
       }));
     }
   };

   Person.find(1).then(function(person) {
     return person.get('phoneNumbers');
   }).then(async(function(phoneNumbers) {
     equal(phoneNumbers.get('length'), 2, "There are now two phone numbers");
     equal(phoneNumbers.objectAt(0).get('number'), 1234567, "The first phone number was loaded in");
     equal(phoneNumbers.objectAt(1).get('number'), 9543256, "The second phone number was loaded in");
     return phoneNumbers;
   }));
 });

 test("A basic adapter receives a call to find<Relationship> for relationships", function() {
   expect(4);

   Person.sync = {
     find: function(id, load) {
       setTimeout(async(function() {
         load(process({ id: 1, firstName: "Tom", lastName: "Dale" }));
       }));
     },

     findHasMany: function(person, options, load) {
       equal(options.relationship, 'phoneNumbers');
       setTimeout(async(function() {
         load(process([ { id: 1, areaCode: 703, number: 1234567 }, { id: 2, areaCode: 904, number: 9543256 } ]));
       }));
     }
   };

   Person.find(1).then(function(person) {
     return person.get('phoneNumbers');
   }).then(async(function(phoneNumbers) {
     equal(phoneNumbers.get('length'), 2, "There are now two phone numbers");
     equal(phoneNumbers.objectAt(0).get('number'), 1234567, "The first phone number was loaded in");
     equal(phoneNumbers.objectAt(1).get('number'), 9543256, "The second phone number was loaded in");
     return phoneNumbers;
   }));
 });

 test("Metadata passed for a relationship will get passed to find<Relationship>", function() {
   expect(4);

   Person.sync = {
     find: function(id, load) {
       setTimeout(async(function() {
         load(process({ id: 1, firstName: "Tom", lastName: "Dale", phoneNumbers: 'http://example.com/people/1/phone_numbers' }));
       }));
     },

     findPhoneNumbers: function(person, options, load) {
       equal(options.data, 'http://example.com/people/1/phone_numbers', "The metadata was passed");
       setTimeout(async(function() {
         load(process([ { id: 1, areaCode: 703, number: 1234567 }, { id: 2, areaCode: 904, number: 9543256 } ]));
       }));
     }
   };

   Person.find(1).then(function(person) {
     return person.get('phoneNumbers');
   }).then(async(function(phoneNumbers) {
     equal(phoneNumbers.get('length'), 2, "There are now two phone numbers");
     equal(phoneNumbers.objectAt(0).get('number'), 1234567, "The first phone number was loaded in");
     equal(phoneNumbers.objectAt(1).get('number'), 9543256, "The second phone number was loaded in");
     return phoneNumbers;
   }));
 });


test("A basic adapter receives a call to find<Relationship> for relationships", function() {
  expect(4);

  Person.sync = {
    find: function(id, load) {
      setTimeout(async(function() {
        load(process({ id: 1, firstName: "Tom", lastName: "Dale" }));
      }));
    },

    findHasMany: function(person, options, load) {
      equal(options.relationship, 'phoneNumbers');
      setTimeout(async(function() {
        load(process([ { id: 1, areaCode: 703, number: 1234567 }, { id: 2, areaCode: 904, number: 9543256 } ]));
      }));
    }
  };

  Person.find(1).then(function(person) {
    return person.get('phoneNumbers');
  }).then(async(function(phoneNumbers) {
    equal(phoneNumbers.get('length'), 2, "There are now two phone numbers");
    equal(phoneNumbers.objectAt(0).get('number'), 1234567, "The first phone number was loaded in");
    equal(phoneNumbers.objectAt(1).get('number'), 9543256, "The second phone number was loaded in");
  }));
});

test("Metadata passed for a relationship will get passed to find<Relationship>", function() {
  expect(4);

  Person.sync = {
    find: function(id, load) {
      setTimeout(async(function() {
        load({ id: 1, firstName: "Tom", lastName: "Dale", phoneNumbers: 'http://example.com/people/1/phone_numbers' });
      }));
    },

    findPhoneNumbers: function(person, options, load) {
      equal(options.data, 'http://example.com/people/1/phone_numbers', "The metadata was passed");
      setTimeout(async(function() {
        load([ { id: 1, areaCode: 703, number: 1234567 }, { id: 2, areaCode: 904, number: 9543256 } ]);
      }));
    }
  };

  Person.find(1).then(function(person) {
    return person.get('phoneNumbers');
  }).then(async(function(phoneNumbers) {
    equal(phoneNumbers.get('length'), 2, "There are now two phone numbers");
    equal(phoneNumbers.objectAt(0).get('number'), 1234567, "The first phone number was loaded in");
    equal(phoneNumbers.objectAt(1).get('number'), 9543256, "The second phone number was loaded in");
  }));
});


test("Metadata passed for a relationship will get passed to findHasMany", function() {
  expect(5);

  Person.sync = {
    find: function(id, load) {
      setTimeout(async(function() {
        load(process({ id: 1, firstName: "Tom", lastName: "Dale", phoneNumbers: 'http://example.com/people/1/phone_numbers' }));
      }));
    },

    findHasMany: function(person, options, load) {
      equal(options.data, 'http://example.com/people/1/phone_numbers', "The metadata was passed");
      equal(options.relationship, 'phoneNumbers', "The relationship name was passed");
      setTimeout(async(function() {
        load(process([ { id: 1, areaCode: 703, number: 1234567 }, { id: 2, areaCode: 904, number: 9543256 } ]));
      }));
    }
  };

  Person.find(1).then(function(person) {
    return person.get('phoneNumbers');
  }).then(async(function(phoneNumbers) {
    equal(phoneNumbers.get('length'), 2, "There are now two phone numbers");
    equal(phoneNumbers.objectAt(0).get('number'), 1234567, "The first phone number was loaded in");
    equal(phoneNumbers.objectAt(1).get('number'), 9543256, "The second phone number was loaded in");
    return phoneNumbers;
  }));
});

