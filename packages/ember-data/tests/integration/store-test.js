var store, env;

var Person = DS.Model.extend({
  name: DS.attr('string'),
  cars: DS.hasMany('car', { async: false })
});

var run = Ember.run;

Person.toString = function() { return "Person"; };

var Car = DS.Model.extend({
  make: DS.attr('string'),
  model: DS.attr('string'),
  person: DS.belongsTo('person', { async: false })
});

Car.toString = function() { return "Car"; };

function initializeStore(adapter) {
  env = setupStore({
    adapter: adapter
  });
  store = env.store;

  env.registry.register('model:car', Car);
  env.registry.register('model:person', Person);
}

module("integration/store - destroy", {
  setup: function() {
    initializeStore(DS.Adapter.extend());
  }
});

function tap(obj, methodName, callback) {
  var old = obj[methodName];

  var summary = { called: [] };

  obj[methodName] = function() {
    var result = old.apply(obj, arguments);
    if (callback) {
      callback.apply(obj, arguments);
    }
    summary.called.push(arguments);
    return result;
  };

  return summary;
}

asyncTest("destroying record during find doesn't cause error", function() {
  expect(0);

  var TestAdapter = DS.Adapter.extend({
    findRecord: function(store, type, id, snapshot) {
      return new Ember.RSVP.Promise(function(resolve, reject) {
        Ember.run.next(function() {
          store.unloadAll(type.modelName);
          reject();
        });
      });
    }
  });

  initializeStore(TestAdapter);

  var type = "car";
  var id = 1;

  function done() {
    start();
  }

  run(function() {
    store.findRecord(type, id).then(done, done);
  });
});

asyncTest("find calls do not resolve when the store is destroyed", function() {
  expect(0);

  var TestAdapter = DS.Adapter.extend({
    findRecord: function(store, type, id, snapshot) {
      store.destroy();
      Ember.RSVP.resolve(null);
    }
  });

  initializeStore(TestAdapter);


  var type = "car";
  var id = 1;

  store.push = function() {
    Ember.assert("The test should have destroyed the store by now", store.get("isDestroyed"));

    throw new Error("We shouldn't be pushing data into the store when it is destroyed");
  };

  run(function() {
    store.findRecord(type, id);
  });

  setTimeout(function() {
    start();
  }, 500);
});


test("destroying the store correctly cleans everything up", function() {
  var car, person;
  run(function() {
    store.push({
      data: [{
        type: 'car',
        id: '1',
        attributes: {
          make: 'BMC',
          model: 'Mini'
        },
        relationships: {
          person: {
            data: { type: 'person', id: '1' }
          }
        }
      }, {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        },
        relationships: {
          cars: {
            data: [
              { type: 'car', id: '1' }
            ]
          }
        }
      }]
    });
    car = store.peekRecord('car', 1);
    person = store.peekRecord('person', 1);
  });

  var personWillDestroy = tap(person, 'willDestroy');
  var carWillDestroy = tap(car, 'willDestroy');
  var carsWillDestroy = tap(car.get('person.cars'), 'willDestroy');

  env.adapter.query = function() {
    return [{
      id: 2,
      name: 'Yehuda'
    }];
  };
  var adapterPopulatedPeople, filterdPeople;

  run(function() {
    adapterPopulatedPeople = store.query('person', {
      someCrazy: 'query'
    });
  });

  run(function() {
    filterdPeople = store.filter('person', function() { return true; });
  });

  var filterdPeopleWillDestroy =  tap(filterdPeople.content, 'willDestroy');
  var adapterPopulatedPeopleWillDestroy = tap(adapterPopulatedPeople.content, 'willDestroy');

  run(function() {
    store.findRecord('person', 2);
  });

  equal(personWillDestroy.called.length, 0, 'expected person.willDestroy to not have been called');
  equal(carWillDestroy.called.length, 0, 'expected car.willDestroy to not have been called');
  equal(carsWillDestroy.called.length, 0, 'expected cars.willDestroy to not have been called');
  equal(adapterPopulatedPeopleWillDestroy.called.length, 0, 'expected adapterPopulatedPeople.willDestroy to not have been called');
  equal(filterdPeopleWillDestroy.called.length, 0, 'expected filterdPeople.willDestroy to not have been called');

  equal(filterdPeople.get('length'), 2, 'expected filterdPeople to have 2 entries');

  equal(car.get('person'), person, "expected car's person to be the correct person");
  equal(person.get('cars.firstObject'), car, " expected persons cars's firstRecord to be the correct car");

  Ember.run(person, person.destroy);
  Ember.run(store, 'destroy');

  equal(car.get('person'), null, "expected car.person to no longer be present");

  equal(personWillDestroy.called.length, 1, 'expected person to have recieved willDestroy once');
  equal(carWillDestroy.called.length, 1, 'expected car to recieve willDestroy once');
  equal(carsWillDestroy.called.length, 1, 'expected cars to recieve willDestroy once');
  equal(adapterPopulatedPeopleWillDestroy.called.length, 1, 'expected adapterPopulatedPeople to recieve willDestroy once');
  equal(filterdPeopleWillDestroy.called.length, 1, 'expected filterdPeople.willDestroy to have been called once');
});

function ajaxResponse(value) {
  var passedUrl, passedVerb, passedHash;
  env.adapter.ajax = function(url, verb, hash) {
    passedUrl = url;
    passedVerb = verb;
    passedHash = hash;

    return run(Ember.RSVP, 'resolve', Ember.copy(value, true));
  };
}



module("integration/store - findRecord { reload: true }", {
  setup: function() {
    initializeStore(DS.RESTAdapter.extend());
  }
});

test("Using store#findRecord on non existing record fetches it from the server", function() {
  expect(2);

  env.registry.register('serializer:application', DS.RESTSerializer);
  ajaxResponse({
    cars: [{
      id: 20,
      make: 'BMCW',
      model: 'Mini'
    }]
  });

  var car = store.hasRecordForId('car', 20);
  ok(!car, 'Car with id=20 should not exist');

  run(function() {
    store.findRecord('car', 20, { reload: true }).then(function (car) {
      equal(car.get('make'), 'BMCW', 'Car with id=20 is now loaded');
    });
  });
});

test("Using store#findRecord on existing record reloads it", function() {
  expect(2);
  var car;

  run(function() {
    store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: 'BMC',
          model: 'Mini'
        }
      }
    });
    car = store.peekRecord('car', 1);
  });

  ajaxResponse({
    cars: [{
      id: 1,
      make: 'BMCW',
      model: 'Mini'
    }]
  });

  equal(car.get('make'), 'BMC');

  run(function() {
    store.findRecord('car', 1, { reload: true }).then(function(car) {
      equal(car.get('make'), 'BMCW');
    });
  });
});

module("integration/store - findAll", {
  setup: function() {
    initializeStore(DS.RESTAdapter.extend());
  }
});

test("Using store#findAll with no records triggers a query", function() {
  expect(2);

  ajaxResponse({
    cars: [{
      id: 1,
      make: 'BMC',
      model: 'Mini'
    },
    {
      id: 2,
      make: 'BMCW',
      model: 'Isetta'
    }]
  });

  var cars = store.peekAll('car');
  ok(!cars.get('length'), 'There is no cars in the store');

  run(function() {
    store.findAll('car').then(function(cars) {
      equal(cars.get('length'), 2, 'Two car were fetched');
    });
  });
});

test("Using store#findAll with existing records performs a query, updating existing records and returning new ones", function() {
  expect(3);

  run(function() {
    store.push({
      data: {
        type: 'car',
        id: '1',
        attributes: {
          make: 'BMC',
          model: 'Mini'
        }
      }
    });
  });

  ajaxResponse({
    cars: [{
      id: 1,
      make: 'BMC',
      model: 'New Mini'
    },
    {
      id: 2,
      make: 'BMCW',
      model: 'Isetta'
    }]
  });

  var cars = store.peekAll('car');
  equal(cars.get('length'), 1, 'There is one car in the store');

  run(function() {
    store.findAll('car').then(function(cars) {
      equal(cars.get('length'), 2, 'There is 2 cars in the store now');
      var mini = cars.findBy('id', '1');
      equal(mini.get('model'), 'New Mini', 'Existing records have been updated');
    });
  });
});

test("store#findAll should return all known records even if they are not in the adapter response", function() {
  expect(4);

  run(function() {
    store.push({
      data: [{
        type: 'car',
        id: '1',
        attributes: {
          make: 'BMC',
          model: 'Mini'
        }
      }, {
        type: 'car',
        id: '2',
        attributes: {
          make: 'BMCW',
          model: 'Isetta'
        }
      }]
    });
  });

  ajaxResponse({
    cars: [{
      id: 1,
      make: 'BMC',
      model: 'New Mini'
    }]
  });

  var cars = store.peekAll('car');
  equal(cars.get('length'), 2, 'There is two cars in the store');

  run(function() {
    store.findAll('car').then(function(cars) {
      equal(cars.get('length'), 2, 'It returns all cars');
      var mini = cars.findBy('id', '1');
      equal(mini.get('model'), 'New Mini', 'Existing records have been updated');

      var carsInStore = store.peekAll('car');
      equal(carsInStore.get('length'), 2, 'There is 2 cars in the store');
    });
  });
});

test("Using store#fetch on an empty record calls find", function() {
  expect(2);

  ajaxResponse({
    cars: [{
      id: 20,
      make: 'BMCW',
      model: 'Mini'
    }]
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        },
        relationships: {
          cars: {
            data: [
              { type: 'car', id: '20' }
            ]
          }
        }
      }
    });
  });

  var car = store.recordForId('car', 20);
  ok(car.get('isEmpty'), 'Car with id=20 should be empty');

  run(function() {
    store.findRecord('car', 20, { reload: true }).then(function (car) {
      equal(car.get('make'), 'BMCW', 'Car with id=20 is now loaded');
    });
  });
});

test("Using store#adapterFor should not throw an error when looking up the application adapter", function() {
  expect(1);

  run(function() {
    var applicationAdapter = store.adapterFor('application');
    ok(applicationAdapter);
  });
});


test("Using store#serializerFor should not throw an error when looking up the application serializer", function() {
  expect(1);

  run(function() {
    var applicationSerializer = store.serializerFor('application');
    ok(applicationSerializer);
  });
});

module("integration/store - deleteRecord", {
  setup: function() {
    initializeStore(DS.RESTAdapter.extend());
  }
});

test("Using store#deleteRecord should mark the model for removal", function() {
  expect(3);
  var person;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        }
      }
    });
    person = store.peekRecord('person', 1);
  });

  ok(store.hasRecordForId('person', 1), 'expected the record to be in the store');

  var personDeleteRecord = tap(person, 'deleteRecord');

  run(function() {
    store.deleteRecord(person);
  });

  equal(personDeleteRecord.called.length, 1, 'expected person.deleteRecord to have been called');
  ok(person.get('isDeleted'), 'expect person to be isDeleted');
});
