import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var get = Ember.get;
var set = Ember.set;
var attr = DS.attr;
var Person, env, store;
var run = Ember.run;

var all = Ember.RSVP.all;
var hash = Ember.RSVP.hash;

module("integration/adapter/record_persistence - Persisting Records", {
  beforeEach() {
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

  afterEach() {
    run(env.container, 'destroy');
  }
});

test("When a store is committed, the adapter's `commit` method should be called with records that have been changed.", function(assert) {
  assert.expect(2);

  env.adapter.updateRecord = function(store, type, snapshot) {
    assert.equal(type, Person, "the type is correct");
    assert.equal(snapshot.record, tom, "the record is correct");

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
    env.store.findRecord('person', 1).then(assert.wait(function(person) {
      tom = person;
      set(tom, "name", "Tom Dale");
      tom.save();
    }));
  });
});

test("When a store is committed, the adapter's `commit` method should be called with records that have been created.", function(assert) {
  assert.expect(2);
  var tom;

  env.adapter.createRecord = function(store, type, snapshot) {
    assert.equal(type, Person, "the type is correct");
    assert.equal(snapshot.record, tom, "the record is correct");

    return Ember.RSVP.resolve({ id: 1, name: "Tom Dale" });
  };

  run(function() {
    tom = env.store.createRecord('person', { name: "Tom Dale" });
    tom.save();
  });
});

test("After a created record has been assigned an ID, finding a record by that ID returns the original record.", function(assert) {
  assert.expect(1);
  var tom;

  env.adapter.createRecord = function(store, type, snapshot) {
    return Ember.RSVP.resolve({ id: 1, name: "Tom Dale" });
  };

  run(function() {
    tom = env.store.createRecord('person', { name: "Tom Dale" });
    tom.save();
  });

  assert.asyncEqual(tom, env.store.find('person', 1), "the retrieved record is the same as the created record");
});

test("when a store is committed, the adapter's `commit` method should be called with records that have been deleted.", function(assert) {
  env.adapter.deleteRecord = function(store, type, snapshot) {
    assert.equal(type, Person, "the type is correct");
    assert.equal(snapshot.record, tom, "the record is correct");

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
  env.store.find('person', 1).then(assert.wait(function(person) {
    tom = person;
    tom.deleteRecord();
    return tom.save();
  })).then(assert.wait(function(tom) {
    assert.equal(get(tom, 'isDeleted'), true, "record is marked as deleted");
  }));
});

test("An adapter can notify the store that records were updated by calling `didSaveRecords`.", function(assert) {
  assert.expect(6);

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
    .then(assert.wait(function(array) {
      tom = array[0];
      yehuda = array[1];

      tom.set('name', "Michael Phelps");
      yehuda.set('name', "Usain Bolt");

      assert.ok(tom.get('hasDirtyAttributes'), "tom is dirty");
      assert.ok(yehuda.get('hasDirtyAttributes'), "yehuda is dirty");

      assert.assertClean(tom.save()).then(assert.wait(function(record) {
        assert.equal(record, tom, "The record is correct");
      }));

      assert.assertClean(yehuda.save()).then(assert.wait(function(record) {
        assert.equal(record, yehuda, "The record is correct");
      }));
    }));
});

test("An adapter can notify the store that records were updated and provide new data by calling `didSaveRecords`.", function(assert) {
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

  hash({ tom: env.store.find('person', 1), yehuda: env.store.find('person', 2) }).then(assert.wait(function(people) {
    people.tom.set('name', "Draaaaaahm Dale");
    people.yehuda.set('name', "Goy Katz");

    return hash({ tom: people.tom.save(), yehuda: people.yehuda.save() });
  })).then(assert.wait(function(people) {
    assert.equal(people.tom.get('name'), "Tom Dale", "name attribute should reflect value of hash passed to didSaveRecords");
    assert.equal(people.tom.get('updatedAt'), "now", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
    assert.equal(people.yehuda.get('name'), "Yehuda Katz", "name attribute should reflect value of hash passed to didSaveRecords");
    assert.equal(people.yehuda.get('updatedAt'), "now!", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
  }));
});

test("An adapter can notify the store that a record was updated by calling `didSaveRecord`.", function(assert) {
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

  hash({ tom: store.find('person', 1), yehuda: store.find('person', 2) }).then(assert.wait(function(people) {
    people.tom.set('name', "Tom Dale");
    people.yehuda.set('name', "Yehuda Katz");

    assert.ok(people.tom.get('hasDirtyAttributes'), "tom is dirty");
    assert.ok(people.yehuda.get('hasDirtyAttributes'), "yehuda is dirty");

    assert.assertClean(people.tom.save());
    assert.assertClean(people.yehuda.save());
  }));

});

test("An adapter can notify the store that a record was updated and provide new data by calling `didSaveRecord`.", function(assert) {
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

  hash({ tom: store.find('person', 1), yehuda: store.find('person', 2) }).then(assert.wait(function(people) {
    people.tom.set('name', "Draaaaaahm Dale");
    people.yehuda.set('name', "Goy Katz");

    return hash({ tom: people.tom.save(), yehuda: people.yehuda.save() });
  })).then(assert.wait(function(people) {
    assert.equal(people.tom.get('name'), "Tom Dale", "name attribute should reflect value of hash passed to didSaveRecords");
    assert.equal(people.tom.get('updatedAt'), "now", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
    assert.equal(people.yehuda.get('name'), "Yehuda Katz", "name attribute should reflect value of hash passed to didSaveRecords");
    assert.equal(people.yehuda.get('updatedAt'), "now!", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
  }));

});

test("An adapter can notify the store that records were deleted by calling `didSaveRecords`.", function(assert) {
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

  hash({ tom: store.find('person', 1), yehuda: store.find('person', 2) }).then(assert.wait(function(people) {
    people.tom.deleteRecord();
    people.yehuda.deleteRecord();

    assert.assertClean(people.tom.save());
    assert.assertClean(people.yehuda.save());
  }));
});
