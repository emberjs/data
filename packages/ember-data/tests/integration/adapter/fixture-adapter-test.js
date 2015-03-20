var get = Ember.get;
var env, Person, Phone;
var run = Ember.run;

module("integration/adapter/fixture_adapter - DS.FixtureAdapter", {
  setup: function() {
    Person = DS.Model.extend({
      firstName: DS.attr('string'),
      lastName: DS.attr('string'),

      height: DS.attr('number'),

      phones: DS.hasMany('phone', { async: true })
    });

    Phone = DS.Model.extend({
      person: DS.belongsTo('person', { async: true })
    });

    env = setupStore({ person: Person, phone: Phone, adapter: DS.FixtureAdapter });
    env.adapter.simulateRemoteResponse = true;
    env.adapter.latency = 50;

    // Enable setTimeout.
    Ember.testing = false;

    Person.FIXTURES = [];
    Phone.FIXTURES = [];
  },
  teardown: function() {
    Ember.testing = true;

    run(env.container, 'destroy');
  }
});

test("should load data for a type asynchronously when it is requested", function() {
  Person.FIXTURES = [{
    id: 'wycats',
    firstName: "Yehuda",
    lastName: "Katz",

    height: 65
  },

  {
    id: 'ebryn',
    firstName: "Erik",
    lastName: "Brynjolffsosysdfon",

    height: 70,
    phones: [1, 2]
  }];

  Phone.FIXTURES = [{
    id: 1,
    person: 'ebryn'
  }, {
    id: 2,
    person: 'ebryn'
  }];

  run(env.store, 'find', 'person', 'ebryn').then(async(function(ebryn) {
    equal(get(ebryn, 'isLoaded'), true, "data loads asynchronously");
    equal(get(ebryn, 'height'), 70, "data from fixtures is loaded correctly");

    return Ember.RSVP.hash({ ebryn: ebryn, wycats: env.store.find('person', 'wycats') });
  }, 1000)).then(async(function(records) {
    equal(get(records.wycats, 'isLoaded'), true, "subsequent requests for records are returned asynchronously");
    equal(get(records.wycats, 'height'), 65, "subsequent requested records contain correct information");

    return get(records.ebryn, 'phones');
  }, 1000)).then(async(function(phones) {
    equal(get(phones, 'length'), 2, "relationships from fixtures is loaded correctly");
  }, 1000));
});

test("should load data asynchronously at the end of the runloop when simulateRemoteResponse is false", function() {
  Person.FIXTURES = [{
    id: 'wycats',
    firstName: "Yehuda"
  }];

  env.adapter.simulateRemoteResponse = false;

  var wycats;

  Ember.run(function() {
    env.store.find('person', 'wycats').then(function(person) {
      wycats = person;
    });
  });

  ok(get(wycats, 'isLoaded'), 'isLoaded is true after runloop finishes');
  equal(get(wycats, 'firstName'), 'Yehuda', 'record properties are defined after runloop finishes');
});

test("should create record asynchronously when it is committed", function() {
  var paul;
  equal(Person.FIXTURES.length, 0, "Fixtures is empty");

  run(function() {
    paul = env.store.createRecord('person', { firstName: 'Paul', lastName: 'Chavard', height: 70 });
  });

  paul.on('didCreate', async(function() {
    equal(get(paul, 'isNew'), false, "data loads asynchronously");
    equal(get(paul, 'isDirty'), false, "data loads asynchronously");
    equal(get(paul, 'height'), 70, "data from fixtures is saved correctly");

    equal(Person.FIXTURES.length, 1, "Record added to FIXTURES");

    var fixture = Person.FIXTURES[0];

    ok(typeof fixture.id === 'string', "The fixture has an ID generated for it");
    equal(fixture.firstName, 'Paul');
    equal(fixture.lastName, 'Chavard');
    equal(fixture.height, 70);
  }));

  paul.save();
});

test("should update record asynchronously when it is committed", function() {
  equal(Person.FIXTURES.length, 0, "Fixtures is empty");

  var paul = env.store.push('person', { id: 1, firstName: 'Paul', lastName: 'Chavard', height: 70 });

  paul.set('height', 80);

  paul.on('didUpdate', async(function() {
    equal(get(paul, 'isDirty'), false, "data loads asynchronously");
    equal(get(paul, 'height'), 80, "data from fixtures is saved correctly");

    equal(Person.FIXTURES.length, 1, "Record FIXTURES updated");

    var fixture = Person.FIXTURES[0];

    equal(fixture.firstName, 'Paul');
    equal(fixture.lastName, 'Chavard');
    equal(fixture.height, 80);
  }, 1000));

  paul.save();
});

test("should delete record asynchronously when it is committed", function() {
  stop();

  var timer = setTimeout(function() {
    start();
    ok(false, "timeout exceeded waiting for fixture data");
  }, 1000);

  equal(Person.FIXTURES.length, 0, "Fixtures empty");

  var paul = env.store.push('person', { id: 'paul', firstName: 'Paul', lastName: 'Chavard', height: 70 });

  paul.save().then(function() {
    paul.deleteRecord();
    paul.save();
  });

  paul.on('didDelete', function() {
    clearTimeout(timer);
    start();

    equal(get(paul, 'isDeleted'), true, "data deleted asynchronously");
    equal(get(paul, 'isDirty'), false, "data deleted asynchronously");

    equal(Person.FIXTURES.length, 0, "Record removed from FIXTURES");
  });

});

test("should follow isUpdating semantics", function() {
  var timer = setTimeout(function() {
    start();
    ok(false, "timeout exceeded waiting for fixture data");
  }, 1000);

  stop();

  Person.FIXTURES = [{
    id: "twinturbo",
    firstName: "Adam",
    lastName: "Hawkins",
    height: 65
  }];

  var result = env.store.findAll('person');

  result.then(function(all) {
    clearTimeout(timer);
    start();
    equal(get(all, 'isUpdating'), false, "isUpdating is set when it shouldn't be");
  });
});

test("should coerce integer ids into string", function() {
  Person.FIXTURES = [{
    id: 1,
    firstName: "Adam",
    lastName: "Hawkins",
    height: 65
  }];

  env.store.find('person', 1).then(async(function(result) {
    strictEqual(get(result, 'id'), "1", "should load integer model id as string");
  }));
});

test("should coerce belongsTo ids into string", function() {
  Person.FIXTURES = [{
    id: 1,
    firstName: "Adam",
    lastName: "Hawkins",

    phones: [1]
  }];

  Phone.FIXTURES = [{
    id: 1,
    person: 1
  }];

  env.store.find('phone', 1).then(async(function(result) {
    get(result, 'person').then(async(function(person) {
      strictEqual(get(person, 'id'), "1", "should load integer belongsTo id as string");
      strictEqual(get(person, 'firstName'), "Adam", "resolved relationship with an integer belongsTo id");
    }));
  }));
});

test("only coerce belongsTo ids to string if id is defined and not null", function() {
  Person.FIXTURES = [];

  Phone.FIXTURES = [{
    id: 1
  }];

  env.store.find('phone', 1).then(async(function(phone) {
    phone.get('person').then(async(function(person) {
      equal(person, null);
    }));
  }));
});

test("should throw if ids are not defined in the FIXTURES", function() {
  Person.FIXTURES = [{
    firstName: "Adam",
    lastName: "Hawkins",
    height: 65
  }];

  raises(function() {
    run(function() {
      env.store.find('person', 1);
    });
  }, /the id property must be defined as a number or string for fixture/);
});

test("0 is an acceptable ID in FIXTURES", function() {
  Person.FIXTURES = [{
    id: 0
  }];

  env.store.find('person', 0).then(async(function() {
    ok(true, "0 is an acceptable ID, so no exception was thrown");
  }), function() {
    ok(false, "should not get here");
  });
});

asyncTest("copies fixtures instead of passing the direct reference", function() {
  var returnedFixture;

  expect(2);

  Person.FIXTURES = [{
    id: '1',
    firstName: 'Katie',
    lastName: 'Gengler'
  }];

  var PersonAdapter = DS.FixtureAdapter.extend({
    find: function(store, type, id) {
      return this._super(store, type, id).then(function(fixture) {
        return returnedFixture = fixture;
      });
    }
  });

  Ember.run(function() {
    env.registry.register('adapter:person', PersonAdapter);
  });

  env.store.find('person', 1).then(function() {
    start();
    ok(Person.FIXTURES[0] !== returnedFixture, 'returnedFixture does not have object identity with defined fixture');
    deepEqual(Person.FIXTURES[0], returnedFixture);
  }, function(err) {
    ok(false, 'got error' + err);
  });
});

test("should save hasMany records", function() {
  var createPhone, savePerson, assertPersonPhones;

  expect(3);

  Person.FIXTURES = [{ id: 'tomjerry', firstName: "Tom", lastName: "Jerry", height: 3 }];

  createPhone = async(function(tom) {
    env.store.createRecord('phone', { person: tom });

    return tom.get('phones').then(async(function(p) {
      equal(p.get('length'), 1, "hasMany relationships are created in the store");
      return tom;
    }));
  });

  savePerson = async(function(tom) {
    return tom.save();
  });

  assertPersonPhones = async(function(record) {
    var phonesPromise = record.get('phones');

    return phonesPromise.then(async(function(phones) {
      equal(phones.get('length'), 1, "hasMany relationship saved correctly");
    }));
  });

  var ensureFixtureAdapterDoesNotLeak = async(function() {
    env.store.destroy();
    env = setupStore({ person: Person, phone: Phone, adapter: DS.FixtureAdapter });
    return env.store.find('phone').then(async(function(phones) {
      equal(phones.get('length'), 0, "the fixture adapter should not leak after destroying the store");
    }));
  });
  env.store.find('person', 'tomjerry').then(createPhone)
                                      .then(savePerson)
                                      .then(assertPersonPhones)
                                      .then(ensureFixtureAdapterDoesNotLeak);

});
