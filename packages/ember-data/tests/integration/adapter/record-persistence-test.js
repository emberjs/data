var get = Ember.get;
var set = Ember.set;
var attr = DS.attr;
var Person, env, store;
var run = Ember.run;

var all = Ember.RSVP.all;
var hash = Ember.RSVP.hash;

function assertClean(promise) {
  return promise.then(async(function(record) {
    equal(record.get('hasDirtyAttributes'), false, "The record is now clean");
    return record;
  }));
}


module("integration/adapter/record_persistence - Persisting Records", {
  setup: function() {
    Person = DS.Model.extend({
      updatedAt: attr('string'),
      name: attr('string'),
      firstName: attr('string'),
      lastName: attr('string')
    });
    Person.toString = function() { return "Person"; };

    env = setupStore({
      adapter: DS.Adapter.extend({
        shouldBackgroundReloadRecord: () => false
      }),
      person: Person
    });
    store = env.store;
  },

  teardown: function() {
    run(env.container, 'destroy');
  }
});

test("When a store is committed, the adapter's `commit` method should be called with records that have been changed.", function() {
  expect(2);

  env.adapter.updateRecord = function(store, type, snapshot) {
    equal(type, Person, "the type is correct");
    equal(snapshot.record, tom, "the record is correct");

    return run(Ember.RSVP, 'resolve');
  };

  run(function() {
    env.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Braaaahm Dale'
        }
      }
    });
  });

  var tom;

  run(function() {
    env.store.findRecord('person', 1).then(async(function(person) {
      tom = person;
      set(tom, "name", "Tom Dale");
      tom.save();
    }));
  });
});

test("When a store is committed, the adapter's `commit` method should be called with records that have been created.", function() {
  expect(2);
  var tom;

  env.adapter.createRecord = function(store, type, snapshot) {
    equal(type, Person, "the type is correct");
    equal(snapshot.record, tom, "the record is correct");

    return Ember.RSVP.resolve({ id: 1, name: "Tom Dale" });
  };

  run(function() {
    tom = env.store.createRecord('person', { name: "Tom Dale" });
    tom.save();
  });
});

test("After a created record has been assigned an ID, finding a record by that ID returns the original record.", function() {
  expect(1);
  var tom;

  env.adapter.createRecord = function(store, type, snapshot) {
    return Ember.RSVP.resolve({ id: 1, name: "Tom Dale" });
  };

  run(function() {
    tom = env.store.createRecord('person', { name: "Tom Dale" });
    tom.save();
  });

  asyncEqual(tom, env.store.find('person', 1), "the retrieved record is the same as the created record");
});

test("when a store is committed, the adapter's `commit` method should be called with records that have been deleted.", function() {
  env.adapter.deleteRecord = function(store, type, snapshot) {
    equal(type, Person, "the type is correct");
    equal(snapshot.record, tom, "the record is correct");

    return run(Ember.RSVP, 'resolve');
  };

  var tom;

  run(function() {
    env.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: "Tom Dale"
        }
      }
    });
  });
  env.store.find('person', 1).then(async(function(person) {
    tom = person;
    tom.deleteRecord();
    return tom.save();
  })).then(async(function(tom) {
    equal(get(tom, 'isDeleted'), true, "record is marked as deleted");
  }));
});

test("An adapter can notify the store that records were updated by calling `didSaveRecords`.", function() {
  expect(6);

  var tom, yehuda;

  env.adapter.updateRecord = function(store, type, snapshot) {
    return Ember.RSVP.resolve();
  };

  run(function() {
    env.store.push({
      data: [{
        type: 'person',
        id: '1'
      }, {
        type: 'person',
        id: '2'
      }]
    });
  });

  all([env.store.find('person', 1), env.store.find('person', 2)])
    .then(async(function(array) {
      tom = array[0];
      yehuda = array[1];

      tom.set('name', "Michael Phelps");
      yehuda.set('name', "Usain Bolt");

      ok(tom.get('hasDirtyAttributes'), "tom is dirty");
      ok(yehuda.get('hasDirtyAttributes'), "yehuda is dirty");

      assertClean(tom.save()).then(async(function(record) {
        equal(record, tom, "The record is correct");
      }));

      assertClean(yehuda.save()).then(async(function(record) {
        equal(record, yehuda, "The record is correct");
      }));
    }));
});

test("An adapter can notify the store that records were updated and provide new data by calling `didSaveRecords`.", function() {
  env.adapter.updateRecord = function(store, type, snapshot) {
    if (snapshot.id === "1") {
      return Ember.RSVP.resolve({ id: 1, name: "Tom Dale", updatedAt: "now" });
    } else if (snapshot.id === "2") {
      return Ember.RSVP.resolve({ id: 2, name: "Yehuda Katz", updatedAt: "now!" });
    }
  };

  run(function() {
    env.store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Braaaahm Dale'
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Gentile Katz'
        }
      }]
    });
  });

  hash({ tom: env.store.find('person', 1), yehuda: env.store.find('person', 2) }).then(async(function(people) {
    people.tom.set('name', "Draaaaaahm Dale");
    people.yehuda.set('name', "Goy Katz");

    return hash({ tom: people.tom.save(), yehuda: people.yehuda.save() });
  })).then(async(function(people) {
    equal(people.tom.get('name'), "Tom Dale", "name attribute should reflect value of hash passed to didSaveRecords");
    equal(people.tom.get('updatedAt'), "now", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
    equal(people.yehuda.get('name'), "Yehuda Katz", "name attribute should reflect value of hash passed to didSaveRecords");
    equal(people.yehuda.get('updatedAt'), "now!", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
  }));
});

test("An adapter can notify the store that a record was updated by calling `didSaveRecord`.", function() {
  env.adapter.updateRecord = function(store, type, snapshot) {
    return Ember.RSVP.resolve();
  };

  run(function() {
    store.push({
      data: [{
        type: 'person',
        id: '1'
      }, {
        type: 'person',
        id: '2'
      }]
    });
  });

  hash({ tom: store.find('person', 1), yehuda: store.find('person', 2) }).then(async(function(people) {
    people.tom.set('name', "Tom Dale");
    people.yehuda.set('name', "Yehuda Katz");

    ok(people.tom.get('hasDirtyAttributes'), "tom is dirty");
    ok(people.yehuda.get('hasDirtyAttributes'), "yehuda is dirty");

    assertClean(people.tom.save());
    assertClean(people.yehuda.save());
  }));

});

test("An adapter can notify the store that a record was updated and provide new data by calling `didSaveRecord`.", function() {
  env.adapter.updateRecord = function(store, type, snapshot) {
    switch (snapshot.id) {
      case "1":
        return Ember.RSVP.resolve({ id: 1, name: "Tom Dale", updatedAt: "now" });
      case "2":
        return Ember.RSVP.resolve({ id: 2, name: "Yehuda Katz", updatedAt: "now!" });
    }
  };

  run(function() {
    env.store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Braaaahm Dale'
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Gentile Katz'
        }
      }]
    });
  });

  hash({ tom: store.find('person', 1), yehuda: store.find('person', 2) }).then(async(function(people) {
    people.tom.set('name', "Draaaaaahm Dale");
    people.yehuda.set('name', "Goy Katz");

    return hash({ tom: people.tom.save(), yehuda: people.yehuda.save() });
  })).then(async(function(people) {
    equal(people.tom.get('name'), "Tom Dale", "name attribute should reflect value of hash passed to didSaveRecords");
    equal(people.tom.get('updatedAt'), "now", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
    equal(people.yehuda.get('name'), "Yehuda Katz", "name attribute should reflect value of hash passed to didSaveRecords");
    equal(people.yehuda.get('updatedAt'), "now!", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
  }));

});

test("An adapter can notify the store that records were deleted by calling `didSaveRecords`.", function() {
  env.adapter.deleteRecord = function(store, type, snapshot) {
    return Ember.RSVP.resolve();
  };

  run(function() {
    env.store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Braaaahm Dale'
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Gentile Katz'
        }
      }]
    });
  });

  hash({ tom: store.find('person', 1), yehuda: store.find('person', 2) }).then(async(function(people) {
    people.tom.deleteRecord();
    people.yehuda.deleteRecord();

    assertClean(people.tom.save());
    assertClean(people.yehuda.save());
  }));
});
