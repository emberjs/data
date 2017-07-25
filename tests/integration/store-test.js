import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import testInDebug from 'dummy/tests/helpers/test-in-debug';
import {module, test} from 'qunit';

import DS from 'ember-data';
import { isEnabled } from 'ember-data/-private';

let store, env;

const Person = DS.Model.extend({
  name: DS.attr('string'),
  cars: DS.hasMany('car', { async: false })
});

Person.reopenClass({
  toString() {
    return 'Person'
  }
});

const { run } = Ember;
const Car = DS.Model.extend({
  make: DS.attr('string'),
  model: DS.attr('string'),
  person: DS.belongsTo('person', { async: false })
});

Car.reopenClass({
  toString() {
    return 'Car';
  }
});

function initializeStore(adapter) {
  env = setupStore({
    adapter: adapter
  });
  store = env.store;

  env.registry.register('model:car', Car);
  env.registry.register('model:person', Person);
}

module("integration/store - destroy", {
  beforeEach() {
    initializeStore(DS.Adapter.extend());
  },
  afterEach() {
    store = null;
    env = null;
  }
});

function tap(obj, methodName, callback) {
  let old = obj[methodName];

  let summary = { called: [] };

  obj[methodName] = function() {
    let result = old.apply(obj, arguments);
    if (callback) {
      callback.apply(obj, arguments);
    }
    summary.called.push(arguments);
    return result;
  };

  return summary;
}

test("destroying record during find doesn't cause error", function(assert) {
  assert.expect(0);
  let done = assert.async();

  let TestAdapter = DS.Adapter.extend({
    findRecord(store, type, id, snapshot) {
      return new Ember.RSVP.Promise((resolve, reject) => {
        Ember.run.next(() => {
          store.unloadAll(type.modelName);
          reject();
        });
      });
    }
  });

  initializeStore(TestAdapter);

  let type = "car";
  let id = 1;

  return run(() => store.findRecord(type, id).then(done, done));
});

test("find calls do not resolve when the store is destroyed", function(assert) {
  assert.expect(0);
  let done = assert.async();

  let TestAdapter = DS.Adapter.extend({
    findRecord(store, type, id, snapshot) {
      store.destroy();
      Ember.RSVP.resolve(null);
    }
  });

  initializeStore(TestAdapter);


  let type = "car";
  let id = 1;

  store.push = function() {
    Ember.assert("The test should have destroyed the store by now", store.get("isDestroyed"));

    throw new Error("We shouldn't be pushing data into the store when it is destroyed");
  };

  run(() => store.findRecord(type, id));

  setTimeout(() => done(), 500);
});

test("destroying the store correctly cleans everything up", function(assert) {
  let car, person;
  env.adapter.shouldBackgroundReloadRecord = () => false;
  run(() => {
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

  let personWillDestroy = tap(person, 'willDestroy');
  let carWillDestroy = tap(car, 'willDestroy');
  let carsWillDestroy = run(() => tap(car.get('person.cars'), 'willDestroy'));

  env.adapter.query = function() {
    return {
      data: [
        {
          id: 2,
          type: 'person',
          attributes: { name: 'Yehuda' }
        }
      ]
    };
  };

  let adapterPopulatedPeople =run(() => {
    return adapterPopulatedPeople = store.query('person', {
      someCrazy: 'query'
    });
  });

  let filterdPeople = run(() => store.filter('person', () => true));

  let filterdPeopleWillDestroy = tap(filterdPeople.get('content'), 'willDestroy');
  let adapterPopulatedPeopleWillDestroy = tap(adapterPopulatedPeople.get('content'), 'willDestroy');

  run(() => store.findRecord('person', 2));

  assert.equal(personWillDestroy.called.length, 0, 'expected person.willDestroy to not have been called');
  assert.equal(carWillDestroy.called.length, 0, 'expected car.willDestroy to not have been called');
  assert.equal(carsWillDestroy.called.length, 0, 'expected cars.willDestroy to not have been called');
  assert.equal(adapterPopulatedPeopleWillDestroy.called.length, 0, 'expected adapterPopulatedPeople.willDestroy to not have been called');
  assert.equal(filterdPeopleWillDestroy.called.length, 0, 'expected filterdPeople.willDestroy to not have been called');

  assert.equal(filterdPeople.get('length'), 2, 'expected filterdPeople to have 2 entries');

  assert.equal(car.get('person'), person, "expected car's person to be the correct person");
  assert.equal(person.get('cars.firstObject'), car, " expected persons cars's firstRecord to be the correct car");

  Ember.run(store, 'destroy');

  assert.equal(personWillDestroy.called.length, 1, 'expected person to have recieved willDestroy once');
  assert.equal(carWillDestroy.called.length, 1, 'expected car to recieve willDestroy once');
  assert.equal(carsWillDestroy.called.length, 1, 'expected person.cars to recieve willDestroy once');
  assert.equal(adapterPopulatedPeopleWillDestroy.called.length, 1, 'expected adapterPopulatedPeople to recieve willDestroy once');
  assert.equal(filterdPeopleWillDestroy.called.length, 1, 'expected filterdPeople.willDestroy to have been called once');
});

function ajaxResponse(value) {
  if (isEnabled('ds-improved-ajax')) {
    env.adapter._makeRequest = function() {
      return run(Ember.RSVP, 'resolve', Ember.copy(value, true));
    };
  } else {
    env.adapter.ajax = function(url, verb, hash) {
      return run(Ember.RSVP, 'resolve', Ember.copy(value, true));
    };
  }
}

module("integration/store - findRecord");

test("store#findRecord fetches record from server when cached record is not present", function(assert) {
  assert.expect(2);

  initializeStore(DS.RESTAdapter.extend());

  env.registry.register('serializer:application', DS.RESTSerializer);
  ajaxResponse({
    cars: [{
      id: 20,
      make: 'BMC',
      model: 'Mini'
    }]
  });

  let cachedRecordIsPresent = store.hasRecordForId('car', 20);
  assert.ok(!cachedRecordIsPresent, 'Car with id=20 should not exist');

  return run(() => {
    return store.findRecord('car', 20).then(car => {
      assert.equal(car.get('make'), 'BMC', 'Car with id=20 is now loaded');
    });
  });
});

test("store#findRecord returns cached record immediately and reloads record in the background", function(assert) {
  assert.expect(2);

  initializeStore(DS.RESTAdapter.extend());

  run(() => {
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
      model: 'Princess'
    }]
  });

  run(() => {
    return store.findRecord('car', 1).then(car => {
      assert.equal(car.get('model'), 'Mini', 'cached car record is returned');
    });
  });

  run(() => {
    let car = store.peekRecord('car', 1);
    assert.equal(car.get('model'), 'Princess', 'car record was reloaded');
  });
});

test("store#findRecord { reload: true } ignores cached record and reloads record from server", function(assert) {
  assert.expect(2);

  const testAdapter = DS.RESTAdapter.extend({
    shouldReloadRecord(store, type, id, snapshot) {
      assert.ok(false, 'shouldReloadRecord should not be called when { reload: true }');
    }
  });

  initializeStore(testAdapter);

  run(() => {
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
      model: 'Princess'
    }]
  });

  let cachedCar = store.peekRecord('car', 1);
  assert.equal(cachedCar.get('model'), 'Mini', 'cached car has expected model');

  return run(() => {
    return store.findRecord('car', 1, { reload: true }).then(car => {
      assert.equal(car.get('model'), 'Princess', 'cached record ignored, record reloaded via server');
    });
  });
});

test("store#findRecord { backgroundReload: false } returns cached record and does not reload in the background", function(assert) {
  assert.expect(2);

  let testAdapter = DS.RESTAdapter.extend({
    shouldBackgroundReloadRecord() {
      assert.ok(false, 'shouldBackgroundReloadRecord should not be called when { backgroundReload: false }');
    },

    findRecord() {
      assert.ok(false, 'findRecord() should not be called when { backgroundReload: false }');
    }
  });

  initializeStore(testAdapter);

  run(() => {
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

  run(() => {
    store.findRecord('car', 1, { backgroundReload: false }).then((car) => {
      assert.equal(car.get('model'), 'Mini', 'cached car record is returned');
    });
  });

  run(() => {
    let car = store.peekRecord('car', 1);
    assert.equal(car.get('model'), 'Mini', 'car record was not reloaded');
  });
});

test("store#findRecord { backgroundReload: true } returns cached record and reloads record in background", function(assert) {
  assert.expect(2);

  let testAdapter = DS.RESTAdapter.extend({
    shouldBackgroundReloadRecord() {
      assert.ok(false, 'shouldBackgroundReloadRecord should not be called when { backgroundReload: true }');
    }
  });

  initializeStore(testAdapter);

  run(() => {
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
      model: 'Princess'
    }]
  });

  run(() => {
    store.findRecord('car', 1, { backgroundReload: true }).then((car) => {
      assert.equal(car.get('model'), 'Mini', 'cached car record is returned');
    });
  });

  run(() => {
    let car = store.peekRecord('car', 1);
    assert.equal(car.get('model'), 'Princess', 'car record was reloaded');
  });
});

test("store#findRecord { backgroundReload: false } is ignored if adapter.shouldReloadRecord is true", function(assert) {
  assert.expect(2);

  let testAdapter = DS.RESTAdapter.extend({
    shouldReloadRecord() {
      return true;
    },

    shouldBackgroundReloadRecord() {
      assert.ok(false, 'shouldBackgroundReloadRecord should not be called when adapter.shouldReloadRecord = true');
    }
  });

  initializeStore(testAdapter);

  run(() => {
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
      model: 'Princess'
    }]
  });

  run(() => {
    let car = store.peekRecord('car', 1);
    assert.equal(car.get('model'), 'Mini', 'Car record is initially a Mini');
  });

  run(() => {
    store.findRecord('car', 1, { backgroundReload: false }).then((car) => {
      assert.equal(car.get('model'), 'Princess', 'Car record is reloaded immediately (not in the background)');
    });
  });
});

testInDebug('store#findRecord call with `id` of type different than non-empty string or number should trigger an assertion', assert => {
  const badValues = ['', undefined, null, NaN, false];
  assert.expect(badValues.length);

  initializeStore(DS.RESTAdapter.extend());

  run(() => {
    badValues.map(item => {
      assert.expectAssertion(() => {
        store.findRecord('car', item);
      }, '`id` passed to `findRecord()` has to be non-empty string or number');
    });
  });
});

module("integration/store - findAll", {
  beforeEach() {
    initializeStore(DS.RESTAdapter.extend());
  }
});

test("Using store#findAll with no records triggers a query", function(assert) {
  assert.expect(2);

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

  let cars = store.peekAll('car');
  assert.ok(!cars.get('length'), 'There is no cars in the store');

  return run(() => {
    return store.findAll('car').then(cars => {
      assert.equal(cars.get('length'), 2, 'Two car were fetched');
    });
  });
});

test("Using store#findAll with existing records performs a query in the background, updating existing records and returning new ones", function(assert) {
  assert.expect(4);

  run(() => {
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

  let cars = store.peekAll('car');
  assert.equal(cars.get('length'), 1, 'There is one car in the store');

  let waiter = run(() => {
    return store.findAll('car').then(cars => {
      assert.equal(cars.get('length'), 1, 'Store resolves with the existing records');
    });
  });

  run(() => {
    let cars = store.peekAll('car');
    assert.equal(cars.get('length'), 2, 'There is 2 cars in the store now');
    let mini = cars.findBy('id', '1');
    assert.equal(mini.get('model'), 'New Mini', 'Existing records have been updated');
  });

  return waiter;
});

test("store#findAll { backgroundReload: false } skips shouldBackgroundReloadAll, returns cached records & does not reload in the background", function(assert) {
  assert.expect(4);

  let testAdapter = DS.RESTAdapter.extend({
    shouldBackgroundReloadAll() {
      assert.ok(false, 'shouldBackgroundReloadAll should not be called when { backgroundReload: false }');
    },

    findAll() {
      assert.ok(false, 'findAll() should not be called when { backgroundReload: true }');
    }
  });

  initializeStore(testAdapter);

  run(() => {
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

  run(() => {
    store.findAll('car', { backgroundReload: false }).then((cars) => {
      assert.equal(cars.get('length'), 1, 'single cached car record is returned');
      assert.equal(cars.get('firstObject.model'), 'Mini', 'correct cached car record is returned');
    });
  });

  run(() => {
    let cars = store.peekAll('car');
    assert.equal(cars.get('length'), 1, 'single cached car record is returned again');
    assert.equal(cars.get('firstObject.model'), 'Mini', 'correct cached car record is returned again');
  });
});

test("store#findAll { backgroundReload: true } skips shouldBackgroundReloadAll, returns cached records, & reloads in background", function(assert) {
  assert.expect(5);

  let testAdapter = DS.RESTAdapter.extend({
    shouldBackgroundReloadAll() {
      assert.ok(false, 'shouldBackgroundReloadAll should not be called when { backgroundReload: true }');
    }
  });

  initializeStore(testAdapter);

  run(() => {
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

  run(() => {
    store.findAll('car', { backgroundReload: true }).then((cars) => {
      assert.equal(cars.get('length'), 1, 'single cached car record is returned');
      assert.equal(cars.get('firstObject.model'), 'Mini', 'correct cached car record is returned');
    });
  });

  run(() => {
    let cars = store.peekAll('car');
    assert.equal(cars.get('length'), 2, 'multiple cars now in the store');
    assert.equal(cars.get('firstObject.model'), 'New Mini', 'existing record updated correctly');
    assert.equal(cars.get('lastObject.model'), 'Isetta', 'new record added to the store');
  });
});

test("store#findAll { backgroundReload: false } is ignored if adapter.shouldReloadAll is true", function(assert) {
  assert.expect(5);

  let testAdapter = DS.RESTAdapter.extend({
    shouldReloadAll() {
      return true;
    },

    shouldBackgroundReloadAll() {
      assert.ok(false, 'shouldBackgroundReloadAll should not be called when adapter.shouldReloadAll = true');
    }
  });

  initializeStore(testAdapter);

  run(() => {
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

  run(() => {
    let cars = store.peekAll('car');
    assert.equal(cars.get('length'), 1, 'one car in the store');
    assert.equal(cars.get('firstObject.model'), 'Mini', 'correct car is in the store');
  });

  return run(() => {
    return store.findAll('car', { backgroundReload: false }).then((cars) => {
      assert.equal(cars.get('length'), 2, 'multiple car records are returned');
      assert.equal(cars.get('firstObject.model'), 'New Mini', 'initial car record was updated');
      assert.equal(cars.get('lastObject.model'), 'Isetta', 'second car record was loaded');
    });
  });
});

test("store#findAll should eventually return all known records even if they are not in the adapter response", function(assert) {
  assert.expect(5);

  run(() => {
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

  let cars = store.peekAll('car');
  assert.equal(cars.get('length'), 2, 'There is two cars in the store');

  let waiter = run(() => {
    return store.findAll('car').then(cars => {
      assert.equal(cars.get('length'), 2, 'It returns all cars');

      let carsInStore = store.peekAll('car');
      assert.equal(carsInStore.get('length'), 2, 'There is 2 cars in the store');
    });
  });

  run(() => {
    let cars = store.peekAll('car');
    let mini = cars.findBy('id', '1');
    assert.equal(mini.get('model'), 'New Mini', 'Existing records have been updated');

    let carsInStore = store.peekAll('car');
    assert.equal(carsInStore.get('length'), 2, 'There is 2 cars in the store');
  });

  return waiter;
});


test("Using store#fetch on an empty record calls find", function(assert) {
  assert.expect(2);

  ajaxResponse({
    cars: [{
      id: 20,
      make: 'BMCW',
      model: 'Mini'
    }]
  });

  run(() => {
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

  let car = store.recordForId('car', 20);
  assert.ok(car.get('isEmpty'), 'Car with id=20 should be empty');

  return run(() => {
    return store.findRecord('car', 20, { reload: true }).then(car => {
      assert.equal(car.get('make'), 'BMCW', 'Car with id=20 is now loaded');
    });
  });
});

test("Using store#adapterFor should not throw an error when looking up the application adapter", function(assert) {
  assert.expect(1);

  run(() => {
    let applicationAdapter = store.adapterFor('application');
    assert.ok(applicationAdapter);
  });
});


test("Using store#serializerFor should not throw an error when looking up the application serializer", function(assert) {
  assert.expect(1);

  run(() => {
    let applicationSerializer = store.serializerFor('application');
    assert.ok(applicationSerializer);
  });
});

module("integration/store - deleteRecord", {
  beforeEach() {
    initializeStore(DS.RESTAdapter.extend());
  }
});

test("Using store#deleteRecord should mark the model for removal", function(assert) {
  assert.expect(3);
  let person;

  run(() => {
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

  assert.ok(store.hasRecordForId('person', 1), 'expected the record to be in the store');

  let personDeleteRecord = tap(person, 'deleteRecord');

  run(() => store.deleteRecord(person));

  assert.equal(personDeleteRecord.called.length, 1, 'expected person.deleteRecord to have been called');
  assert.ok(person.get('isDeleted'), 'expect person to be isDeleted');
});

test("Store should accept a null value for `data`", function(assert) {
  assert.expect(0);

  run(() => {
    store.push({
      data: null
    });
  });
});

testInDebug('store#findRecord that returns an array should assert', assert => {
  initializeStore(DS.JSONAPIAdapter.extend({
    findRecord() {
      return { data: [] };
    }
  }));

  assert.expectAssertion(() => {
    run(() => {
      store.findRecord('car', 1);
    });
  }, /expected the primary data returned from a 'findRecord' response to be an object but instead it found an array/);
});

testInDebug('store#didSaveRecord should assert when the response to a save does not include the id', function(assert) {
  env.adapter.createRecord = function() {
    return {};
  };

  assert.expectAssertion(() => {
    run(() => {
      let car = store.createRecord('car');
      car.save();
    });
  }, /Your car record was saved to the server, but the response does not have an id and no id has been set client side. Records must have ids. Please update the server response to provide an id in the response or generate the id on the client side either before saving the record or while normalizing the response./);
});

module("integration/store - queryRecord", {
  beforeEach() {
    initializeStore(DS.Adapter.extend());
  }
});

testInDebug('store#queryRecord should assert when normalized payload of adapter has an array an data', function(assert) {
  env.adapter.queryRecord = function() {
    return {
      cars: [{ id: 1 }]
    };
  };

  env.serializer.normalizeQueryRecordResponse = function() {
    return {
      data: [{ id: 1, type: 'car' }]
    };
  };

  assert.expectAssertion(() => {
    run(() => store.queryRecord('car', {}));
  }, /Expected the primary data returned by the serializer for a 'queryRecord' response to be a single object or null but instead it was an array./);
});


