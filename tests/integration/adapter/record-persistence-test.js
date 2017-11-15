import { set, get } from '@ember/object';
import { run } from '@ember/runloop';
import RSVP, { resolve } from 'rsvp';
import setupStore from 'dummy/tests/helpers/store';

import { module, test } from 'qunit';
import DS from 'ember-data';

const { all, hash } = RSVP;
const { attr } = DS;

let Person, env, store;

module("integration/adapter/record_persistence - Persisting Records", {
  beforeEach() {
    Person = DS.Model.extend({
      updatedAt: attr('string'),
      name: attr('string'),
      firstName: attr('string'),
      lastName: attr('string')
    });

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

    return run(RSVP, 'resolve');
  };

  run(() => {
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

  let tom;

  return run(() => {
    return env.store.findRecord('person', 1).then(person => {
      tom = person;
      set(tom, "name", "Tom Dale");
      return tom.save();
    });
  });
});

test("When a store is committed, the adapter's `commit` method should be called with records that have been created.", function(assert) {
  assert.expect(2);
  let tom;

  env.adapter.createRecord = function(store, type, snapshot) {
    assert.equal(type, Person, "the type is correct");
    assert.equal(snapshot.record, tom, "the record is correct");

    return resolve({ data: { id: 1, type: "person", attributes: { name: "Tom Dale" } } });
  };

  return run(() => {
    tom = env.store.createRecord('person', { name: "Tom Dale" });
    return tom.save();
  });
});

test("After a created record has been assigned an ID, finding a record by that ID returns the original record.", function(assert) {
  assert.expect(1);
  let tom;

  env.adapter.createRecord = function(store, type, snapshot) {
    return resolve({ data: { id: 1, type: "person", attributes: { name: "Tom Dale" } } });
  };

  return run(() => {
    tom = env.store.createRecord('person', { name: "Tom Dale" });
    return tom.save();
  }).then(tom => {
    return env.store.find('person', 1).then(nextTom => {
      assert.equal(tom, nextTom, "the retrieved record is the same as the created record");
    });
  });
});

test("when a store is committed, the adapter's `commit` method should be called with records that have been deleted.", function(assert) {
  env.adapter.deleteRecord = function(store, type, snapshot) {
    assert.equal(type, Person, "the type is correct");
    assert.equal(snapshot.record, tom, "the record is correct");

    return run(RSVP, 'resolve');
  };

  let tom;

  run(() => {
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

  return env.store.findRecord('person', 1).then(person => {
    tom = person;
    tom.deleteRecord();
    return tom.save();
  }).then(tom => {
    assert.equal(get(tom, 'isDeleted'), true, "record is marked as deleted");
  });
});

test("An adapter can notify the store that records were updated by calling `didSaveRecords`.", function(assert) {
  assert.expect(6);

  let tom, yehuda;

  env.adapter.updateRecord = function(store, type, snapshot) {
    return resolve();
  };

  run(() => {
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

  return all([
    env.store.findRecord('person', 1),
    env.store.findRecord('person', 2)
  ])
    .then(array => {
      tom = array[0];
      yehuda = array[1];

      tom.set('name', "Michael Phelps");
      yehuda.set('name', "Usain Bolt");

      assert.ok(tom.get('hasDirtyAttributes'), "tom is dirty");
      assert.ok(yehuda.get('hasDirtyAttributes'), "yehuda is dirty");

      let savedTom = assert.assertClean(tom.save()).then(record => {
        assert.equal(record, tom, "The record is correct");
      });

      let savedYehuda = assert.assertClean(yehuda.save()).then(record => {
        assert.equal(record, yehuda, "The record is correct");
      });

      return all([
        savedTom,
        savedYehuda
      ]);
    });
});

test("An adapter can notify the store that records were updated and provide new data by calling `didSaveRecords`.", function(assert) {
  env.adapter.updateRecord = function(store, type, snapshot) {
    if (snapshot.id === "1") {
      return resolve({ data: { id: 1, type: "person", attributes: { name: "Tom Dale", "updated-at": "now" } } });
    } else if (snapshot.id === "2") {
      return resolve({ data: { id: 2, type: "person", attributes: { name: "Yehuda Katz", "updated-at": "now!" } } });
    }
  };

  run(() => {
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

  return hash({
    tom: env.store.findRecord('person', 1),
    yehuda: env.store.findRecord('person', 2)
  }).then(people => {
    people.tom.set('name', "Draaaaaahm Dale");
    people.yehuda.set('name', "Goy Katz");

    return hash({
      tom: people.tom.save(),
      yehuda: people.yehuda.save()
    });
  }).then(people => {
    assert.equal(people.tom.get('name'), "Tom Dale", "name attribute should reflect value of hash passed to didSaveRecords");
    assert.equal(people.tom.get('updatedAt'), "now", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
    assert.equal(people.yehuda.get('name'), "Yehuda Katz", "name attribute should reflect value of hash passed to didSaveRecords");
    assert.equal(people.yehuda.get('updatedAt'), "now!", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
  });
});

test("An adapter can notify the store that a record was updated by calling `didSaveRecord`.", function(assert) {
  env.adapter.updateRecord = function(store, type, snapshot) {
    return resolve();
  };

  run(() => {
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

  return hash({
    tom: store.findRecord('person', 1),
    yehuda: store.findRecord('person', 2)
  }).then(people => {
    people.tom.set('name', "Tom Dale");
    people.yehuda.set('name', "Yehuda Katz");

    assert.ok(people.tom.get('hasDirtyAttributes'), "tom is dirty");
    assert.ok(people.yehuda.get('hasDirtyAttributes'), "yehuda is dirty");

    assert.assertClean(people.tom.save());
    assert.assertClean(people.yehuda.save());
  });
});

test("An adapter can notify the store that a record was updated and provide new data by calling `didSaveRecord`.", function(assert) {
  env.adapter.updateRecord = function(store, type, snapshot) {
    switch (snapshot.id) {
      case "1":
        return resolve({ data: { id: 1, type: "person", attributes: { name: "Tom Dale", "updated-at": "now" } } });
      case "2":
        return resolve({ data: { id: 2, type: "person", attributes: { name: "Yehuda Katz", "updated-at": "now!" } } });
    }
  };

  run(() => {
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

  return hash({
    tom: store.findRecord('person', 1),
    yehuda: store.findRecord('person', 2)
  }).then(people => {
    people.tom.set('name', "Draaaaaahm Dale");
    people.yehuda.set('name', "Goy Katz");

    return hash({
      tom: people.tom.save(),
      yehuda: people.yehuda.save()
    });
  }).then(people => {
    assert.equal(people.tom.get('name'), "Tom Dale", "name attribute should reflect value of hash passed to didSaveRecords");
    assert.equal(people.tom.get('updatedAt'), "now", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
    assert.equal(people.yehuda.get('name'), "Yehuda Katz", "name attribute should reflect value of hash passed to didSaveRecords");
    assert.equal(people.yehuda.get('updatedAt'), "now!", "updatedAt attribute should reflect value of hash passed to didSaveRecords");
  });
});

test("An adapter can notify the store that records were deleted by calling `didSaveRecords`.", function(assert) {
  env.adapter.deleteRecord = function(store, type, snapshot) {
    return resolve();
  };

  run(() => {
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

  return hash({
    tom: store.findRecord('person', 1),
    yehuda: store.findRecord('person', 2)
  }).then(people => {
    people.tom.deleteRecord();
    people.yehuda.deleteRecord();

    assert.assertClean(people.tom.save());
    assert.assertClean(people.yehuda.save());
  });
});
