var store, env;

var Person = DS.Model.extend({
  name: DS.attr('string'),
  cars: DS.hasMany('car')
});

Person.toString = function() { return "Person"; };

var Car = DS.Model.extend({
  make: DS.attr('string'),
  model: DS.attr('string'),
  person: DS.belongsTo('person')
});

Car.toString = function() { return "Car"; };

initializeStore = function(adapter) {
  env = setupStore({
    adapter: adapter
  });
  store = env.store;

  env.container.register('model:car', Car);
  env.container.register('model:person', Person);
}

module("integration/store - destroy", {
  setup: function(){
    initializeStore(DS.FixtureAdapter.extend());
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

  var TestAdapter = DS.FixtureAdapter.extend({
    find: function() {
      return new Ember.RSVP.Promise(function(resolve, reject) {
        Ember.run.next(function() {
          store.unloadAll(type);
          reject();
        });
      });
    }
  });

  initializeStore(TestAdapter);

  var type = "car";
  var id = 1

  done = function() {
    start();
  };

  store.find(type, id).then(done, done);
});

asyncTest("find calls do not resolve when the store is destroyed", function() {
  expect(0);

  var TestAdapter = DS.FixtureAdapter.extend({
    find: function() {
      store.destroy();
      Ember.RSVP.resolve(null);
    }
  });

  initializeStore(TestAdapter);


  var type = "car";
  var id = 1;

  store.push = function() {
    Ember.assert("The test should have destroyed the store by now", store.get("isDestroyed"));

    throw "We shouldn't be pushing data into the store when it is destroyed"
  }

  store.find(type, id);

  setTimeout(function() {
    start();
  }, 500);
});


test("destroying the store correctly cleans everything up", function() {
  var car = store.push('car', {
    id: 1,
    make: 'BMC',
    model: 'Mini',
    person: 1
  });

  var person = store.push('person', {
    id: 1,
    name: 'Tom Dale',
    cars: [1]
  });

  var personWillDestroy = tap(person, 'willDestroy');
  var carWillDestroy = tap(car, 'willDestroy');
  var carsWillDestroy = tap(car.get('person.cars'), 'willDestroy');

  env.adapter.findQuery = function() {
    return [{
      id: 2,
      name: 'Yehuda'
    }];
  };

  var adapterPopulatedPeople = store.find('person', {
    someCrazy: 'query'
  });

  var filterdPeople = store.filter('person', function(){ return true; });

  var filterdPeopleWillDestroy =  tap(filterdPeople.content, 'willDestroy');
  var adapterPopulatedPeopleWillDestroy = tap(adapterPopulatedPeople.content, 'willDestroy');

  var adapterPopulatedPerson = store.find('person', 2);

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
  equal(person.get('cars'), undefined, "expected person.cars to be empty");

  equal(personWillDestroy.called.length, 1, 'expected person to have recieved willDestroy once');
  equal(carWillDestroy.called.length, 1, 'expected car to recieve willDestroy once');
  equal(carsWillDestroy.called.length, 1, 'expected cars to recieve willDestroy once');
  equal(adapterPopulatedPeopleWillDestroy.called.length, 1, 'expected adapterPopulatedPeople to recieve willDestroy once');
  equal(filterdPeopleWillDestroy.called.length, 1, 'expected filterdPeople.willDestroy to have been called once');
});
