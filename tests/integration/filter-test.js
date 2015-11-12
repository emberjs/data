import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

import customAdapter from 'dummy/tests/helpers/custom-adapter';

var get = Ember.get;
var set = Ember.set;
var run = Ember.run;

var Person, store, env, array, recordArray;

module("integration/filter - DS.Model updating", {
  beforeEach: function() {
    array = [{
      id: '1',
      type: 'person',
      attributes: {
        name: 'Scumbag Dale'
      },
      relationships: {
        bestFriend: {
          data: {
            id: '2',
            type: 'person'
          }
        }
      }
    }, {
      id: '2',
      type: 'person',
      attributes: {
        name: 'Scumbag Katz'
      }
    }, {
      id: '3',
      type: 'person',
      attributes: {
        name: 'Scumbag Bryn'
      }
    }];
    Person = DS.Model.extend({ name: DS.attr('string'), bestFriend: DS.belongsTo('person', { inverse: null, async: false }) });

    env = setupStore({ person: Person });
    store = env.store;
  },
  afterEach: function() {
    run(store, 'destroy');
    Person = null;
    array = null;
  }
});

function tapFn(fn, callback) {
  var old_fn = fn;

  var new_fn = function() {
    var result = old_fn.apply(this, arguments);
    if (callback) {
      callback.apply(fn, arguments);
    }
    new_fn.summary.called.push(arguments);
    return result;
  };
  new_fn.summary = { called: [] };

  return new_fn;
}


test("when a DS.Model updates its attributes, its changes affect its filtered Array membership", function(assert) {
  run(function() {
    store.push({ data: array });
  });
  var people;

  run(function() {
    people = store.filter('person', function(hash) {
      if (hash.get('name').match(/Katz$/)) { return true; }
    });
  });

  run(function() {
    assert.equal(get(people, 'length'), 1, "precond - one item is in the RecordArray");
  });

  var person = people.objectAt(0);

  assert.equal(get(person, 'name'), "Scumbag Katz", "precond - the item is correct");

  run(function() {
    set(person, 'name', "Yehuda Katz");
  });

  assert.equal(get(people, 'length'), 1, "there is still one item");
  assert.equal(get(person, 'name'), "Yehuda Katz", "it has the updated item");

  run(function() {
    set(person, 'name', "Yehuda Katz-Foo");
  });

  assert.equal(get(people, 'query'), null, 'expected no query object set');
  assert.equal(get(people, 'length'), 0, "there are now no items");
});

test("when a DS.Model updates its relationships, its changes affect its filtered Array membership", function(assert) {
  run(function() {
    store.push({ data: array });
  });
  var people;

  run(function() {
    people = store.filter('person', function(person) {
      if (person.get('bestFriend') && person.get('bestFriend.name').match(/Katz$/)) { return true; }
    });
  });

  run(function() {
    assert.equal(get(people, 'length'), 1, "precond - one item is in the RecordArray");
  });

  var person = people.objectAt(0);

  assert.equal(get(person, 'name'), "Scumbag Dale", "precond - the item is correct");

  run(function() {
    set(person, 'bestFriend', null);
  });

  assert.equal(get(people, 'length'), 0, "there are now 0 items");

  var erik = store.peekRecord('person', 3);
  var yehuda = store.peekRecord('person', 2);
  run(function() {
    erik.set('bestFriend', yehuda);
  });

  person = people.objectAt(0);
  assert.equal(get(people, 'length'), 1, "there is now 1 item");
  assert.equal(get(person, 'name'), "Scumbag Bryn", "precond - the item is correct");
});


test("a record array can have a filter on it", function(assert) {
  run(function() {
    store.push({ data: array });
  });
  var recordArray;

  run(function() {
    recordArray = store.filter('person', function(hash) {
      if (hash.get('name').match(/Scumbag [KD]/)) { return true; }
    });
  });

  assert.equal(get(recordArray, 'length'), 2, "The Record Array should have the filtered objects on it");

  run(function () {
    store.push({
      data: [{
        id: '4',
        type: 'person',
        attributes: {
          name: 'Scumbag Koz'
        }
      }]
    });
  });

  assert.equal(get(recordArray, 'length'), 3, "The Record Array should be updated as new items are added to the store");

  run(function () {
    store.push({
      data: [{
        id: '1',
        type: 'person',
        attributes: {
          name: 'Scumbag Tom'
        }
      }]
    });
  });

  assert.equal(get(recordArray, 'length'), 2, "The Record Array should be updated as existing members are updated");
});

test("a filtered record array includes created elements", function(assert) {
  run(function() {
    store.push({ data: array });
  });
  var recordArray;

  run(function() {
    recordArray = store.filter('person', function(hash) {
      if (hash.get('name').match(/Scumbag [KD]/)) { return true; }
    });
  });

  assert.equal(get(recordArray, 'length'), 2, "precond - The Record Array should have the filtered objects on it");

  run(function() {
    store.createRecord('person', { name: "Scumbag Koz" });
  });

  assert.equal(get(recordArray, 'length'), 3, "The record array has the new object on it");
});

test("a Record Array can update its filter", function(assert) {
  customAdapter(env, DS.Adapter.extend({
    deleteRecord: function(store, type, snapshot) {
      return Ember.RSVP.resolve();
    },
    shouldBackgroundReloadRecord: () => false
  }));

  run(function() {
    store.push({ data: array });
  });

  var dickens = run(function() {
    var record = store.createRecord('person', { id: 4, name: "Scumbag Dickens" });
    record.deleteRecord();
    return record;
  });
  var asyncDale, asyncKatz, asyncBryn;

  run(function() {
    asyncDale = store.findRecord('person', 1);
    asyncKatz = store.findRecord('person', 2);
    asyncBryn = store.findRecord('person', 3);
  });

  store.filter('person', function(hash) {
    if (hash.get('name').match(/Scumbag [KD]/)) { return true; }
  }).then(assert.wait(function(recordArray) {

    Ember.RSVP.hash({ dale: asyncDale, katz: asyncKatz, bryn: asyncBryn }).then(assert.wait(function(records) {
      assert.contains(recordArray, records.dale);
      assert.contains(recordArray, records.katz);
      assert.without(recordArray, records.bryn);
      assert.without(recordArray, dickens);

      Ember.run(function() {
        recordArray.set('filterFunction', function(hash) {
          if (hash.get('name').match(/Katz/)) { return true; }
        });
      });

      assert.equal(get(recordArray, 'length'), 1, "The Record Array should have one object on it");

      Ember.run(function () {
        store.push({
          data: [{
            id: '5',
            type: 'person',
            attributes: {
              name: 'Other Katz'
            }
          }]
        });
      });

      assert.equal(get(recordArray, 'length'), 2, "The Record Array now has the new object matching the filter");

      Ember.run(function () {
        store.push({
          data: [{
            id: '6',
            type: 'person',
            attributes: {
              name: 'Scumbag Demon'
            }
          }]
        });
      });

      assert.equal(get(recordArray, 'length'), 2, "The Record Array doesn't have objects matching the old filter");
    }));
  }));
});

test("a Record Array can update its filter and notify array observers", function(assert) {
  customAdapter(env, DS.Adapter.extend({
    deleteRecord: function(store, type, snapshot) {
      return Ember.RSVP.resolve();
    },
    shouldBackgroundReloadRecord: () => false
  }));

  run(function() {
    store.push({ data: array });
  });
  var dickens;

  run(function() {
    dickens = store.createRecord('person', { id: 4, name: "Scumbag Dickens" });
    dickens.deleteRecord();
  });

  var asyncDale, asyncKatz, asyncBryn;

  run(function() {
    asyncDale = store.findRecord('person', 1);
    asyncKatz = store.findRecord('person', 2);
    asyncBryn = store.findRecord('person', 3);
  });

  store.filter('person', function(hash) {
    if (hash.get('name').match(/Scumbag [KD]/)) { return true; }
  }).then(assert.wait(function(recordArray) {

    var didChangeIdx;
    var didChangeRemoved = 0;
    var didChangeAdded = 0;

    var arrayObserver = {
      arrayWillChange: Ember.K,

      arrayDidChange: function(array, idx, removed, added) {
        didChangeIdx = idx;
        didChangeRemoved += removed;
        didChangeAdded += added;
      }
    };

    recordArray.addArrayObserver(arrayObserver);

    Ember.run(function() {
      recordArray.set('filterFunction', function(hash) {
        if (hash.get('name').match(/Katz/)) { return true; }
      });
    });

    Ember.RSVP.all([asyncDale, asyncKatz, asyncBryn]).then(assert.wait(function() {
      assert.equal(didChangeRemoved, 1, "removed one item from array");
      didChangeRemoved = 0;

      Ember.run(function () {
        store.push({
          data: [{
            id: '5',
            type: 'person',
            attributes: {
              name: 'Other Katz'
            }
          }]
        });
      });

      assert.equal(didChangeAdded, 1, "one item was added");
      didChangeAdded = 0;

      assert.equal(recordArray.objectAt(didChangeIdx).get('name'), "Other Katz");

      Ember.run(function () {
        store.push({
          data: [{
            id: '6',
            type: 'person',
            attributes: {
              name: 'Scumbag Demon'
            }
          }]
        });
      });

      assert.equal(didChangeAdded, 0, "did not get called when an object that doesn't match is added");

      Ember.run(function() {
        recordArray.set('filterFunction', function(hash) {
          if (hash.get('name').match(/Scumbag [KD]/)) { return true; }
        });
      });

      assert.equal(didChangeAdded, 2, "one item is added when going back");
      assert.equal(recordArray.objectAt(didChangeIdx).get('name'), "Scumbag Demon");
      assert.equal(recordArray.objectAt(didChangeIdx-1).get('name'), "Scumbag Dale");
    }));
  }));
});

test("it is possible to filter by computed properties", function(assert) {
  customAdapter(env, DS.Adapter.extend({
    shouldBackgroundReloadRecord: () => false
  }));
  Person.reopen({
    name: DS.attr('string'),
    upperName: Ember.computed(function() {
      return this.get('name').toUpperCase();
    }).property('name')
  });
  var filter;

  run(function() {
    filter = store.filter('person', function(person) {
      return person.get('upperName') === "TOM DALE";
    });
  });

  assert.equal(filter.get('length'), 0, "precond - the filter starts empty");

  run(function () {
    store.push({
      data: [{
        id: '1',
        type: 'person',
        attributes: {
          name: 'Tom Dale'
        }
      }]
    });
  });

  assert.equal(filter.get('length'), 1, "the filter now has a record in it");

  store.findRecord('person', 1).then(assert.wait(function(person) {
    Ember.run(function() {
      person.set('name', "Yehuda Katz");
    });

    assert.equal(filter.get('length'), 0, "the filter is empty again");
  }));
});

test("a filter created after a record is already loaded works", function(assert) {
  customAdapter(env, DS.Adapter.extend({
    shouldBackgroundReloadRecord: () => false
  }));
  Person.reopen({
    name: DS.attr('string'),
    upperName: Ember.computed(function() {
      return this.get('name').toUpperCase();
    }).property('name')
  });

  run(function () {
    store.push({
      data: [{
        id: '1',
        type: 'person',
        attributes: {
          name: 'Tom Dale'
        }
      }]
    });
  });
  var filter;

  run(function() {
    filter = store.filter('person', function(person) {
      return person.get('upperName') === "TOM DALE";
    });
  });

  assert.equal(filter.get('length'), 1, "the filter now has a record in it");
  assert.asyncEqual(filter.objectAt(0), store.findRecord('person', 1));
});

test("filter with query persists query on the resulting filteredRecordArray", function(assert) {
  customAdapter(env, DS.Adapter.extend({
    query: function(store, type, id) {
      return Ember.RSVP.resolve([{
        id: id,
        name: "Tom Dale"
      }]);
    }
  }));

  var filter;

  run(function() {
    filter = store.filter('person', { foo: 1 }, function(person) {
      return true;
    });
  });

  Ember.run(function() {
    filter.then(function(array) {
      assert.deepEqual(get(array, 'query'), { foo: 1 }, 'has expected query');
    });
  });
});


test("it is possible to filter by state flags", function(assert) {
  var filter;

  customAdapter(env, DS.Adapter.extend({
    findRecord: function(store, type, id, snapshot) {
      return Ember.RSVP.resolve({ id: id, name: "Tom Dale" });
    }
  }));

  run(function() {
    filter = store.filter('person', function(person) {
      return person.get('isLoaded');
    });
  });

  assert.equal(filter.get('length'), 0, "precond - there are no records yet");

  Ember.run(function() {
    var asyncPerson = store.findRecord('person', 1);

    // Ember.run will block `find` from being synchronously
    // resolved in test mode

    assert.equal(filter.get('length'), 0, "the unloaded record isn't in the filter");

    asyncPerson.then(assert.wait(function(person) {
      assert.equal(filter.get('length'), 1, "the now-loaded record is in the filter");
      assert.asyncEqual(filter.objectAt(0), store.findRecord('person', 1));
    }));
  });
});

test("it is possible to filter loaded records by dirtiness", function(assert) {
  customAdapter(env, DS.Adapter.extend({
    updateRecord: function() {
      return Ember.RSVP.resolve();
    },
    shouldBackgroundReloadRecord: () => false
  }));

  var filter = store.filter('person', function(person) {
    return !person.get('hasDirtyAttributes');
  });

  run(function () {
    store.push({
      data: [{
        id: '1',
        type: 'person',
        attributes: {
          name: 'Tom Dale'
        }
      }]
    });
  });

  store.findRecord('person', 1).then(assert.wait(function(person) {
    assert.equal(filter.get('length'), 1, "the clean record is in the filter");

    // Force synchronous update of the filter, even though
    // we're already inside a run loop
    Ember.run(function() {
      person.set('name', "Yehuda Katz");
    });

    assert.equal(filter.get('length'), 0, "the now-dirty record is not in the filter");

    return person.save();
  })).then(assert.wait(function(person) {
    assert.equal(filter.get('length'), 1, "the clean record is back in the filter");
  }));
});

test("it is possible to filter created records by dirtiness", function(assert) {
  run(function() {
    customAdapter(env, DS.Adapter.extend({
      createRecord: function() {
        return Ember.RSVP.resolve();
      },
      shouldBackgroundReloadRecord: () => false
    }));
  });

  var filter;

  run(function() {
    filter = store.filter('person', function(person) {
      return !person.get('hasDirtyAttributes');
    });
  });

  var person;

  run(function() {
    person = store.createRecord('person', {
      id: 1,
      name: "Tom Dale"
    });
  });

  assert.equal(filter.get('length'), 0, "the dirty record is not in the filter");

  run(function() {
    person.save().then(function(person) {
      assert.equal(filter.get('length'), 1, "the clean record is in the filter");
    });
  });
});

test("it is possible to filter created records by isReloading", function(assert) {
  customAdapter(env, DS.Adapter.extend({
    findRecord: function(store, type, id, snapshot) {
      return Ember.RSVP.resolve({
        id: 1,
        name: "Tom Dalle"
      });
    }
  }));

  var filter = store.filter('person', function(person) {
    return !person.get('isReloading');
  });

  var person = store.createRecord('person', {
    id: 1,
    name: "Tom Dale"
  });

  person.reload().then(assert.wait(function(person) {
    assert.equal(filter.get('length'), 1, "the filter correctly returned a reloaded object");
  }));
});


// SERVER SIDE TESTS
var edited;

var clientEdits = function(ids) {
  edited = [];

  ids.forEach((id) => {
    // wrap in an Ember.run to guarantee coalescence of the
    // iterated `set` calls and promise resolution.
    Ember.run(function() {
      store.findRecord('person', id).then(function(person) {
        edited.push(person);
        person.set('name', 'Client-side ' + id );
      });
    });
  });
};

var clientCreates = function(names) {
  edited = [];

  // wrap in an Ember.run to guarantee coalescence of the
  // iterated `set` calls.
  Ember.run(function() {
    names.forEach(function(name) {
      edited.push(store.createRecord('person', { name: 'Client-side ' + name }));
    });
  });
};

var serverResponds = function() {
  edited.forEach(function(person) { run(person, 'save'); });
};

var setup = function(assert, serverCallbacks) {
  run(function() {
    customAdapter(env, DS.Adapter.extend(serverCallbacks));

    store.push({ data: array });

    recordArray = store.filter('person', function(hash) {
      if (hash.get('name').match(/Scumbag/)) { return true; }
    });
  });

  assert.equal(get(recordArray, 'length'), 3, "The filter function should work");
};

test("a Record Array can update its filter after server-side updates one record", function(assert) {
  setup(assert, {
    updateRecord: function(store, type, snapshot) {
      return Ember.RSVP.resolve({ id: 1, name: "Scumbag Server-side Dale" });
    },
    shouldBackgroundReloadRecord: () => false
  });

  clientEdits([1]);
  assert.equal(get(recordArray, 'length'), 2, "The record array updates when the client changes records");

  serverResponds();
  assert.equal(get(recordArray, 'length'), 3, "The record array updates when the server changes one record");
});

test("a Record Array can update its filter after server-side updates multiple records", function(assert) {
  setup(assert, {
    updateRecord: function(store, type, snapshot) {
      switch (snapshot.id) {
        case "1":
          return Ember.RSVP.resolve({ id: 1, name: "Scumbag Server-side Dale" });
        case "2":
          return Ember.RSVP.resolve({ id: 2, name: "Scumbag Server-side Katz" });
      }
    },
    shouldBackgroundReloadRecord: () => false
  });

  clientEdits([1,2]);
  assert.equal(get(recordArray, 'length'), 1, "The record array updates when the client changes records");

  serverResponds();
  assert.equal(get(recordArray, 'length'), 3, "The record array updates when the server changes multiple records");
});

test("a Record Array can update its filter after server-side creates one record", function(assert) {
  setup(assert, {
    createRecord: function(store, type, snapshot) {
      return Ember.RSVP.resolve({ id: 4, name: "Scumbag Server-side Tim" });
    }
  });

  clientCreates(["Tim"]);
  assert.equal(get(recordArray, 'length'), 3, "The record array does not include non-matching records");

  serverResponds();
  assert.equal(get(recordArray, 'length'), 4, "The record array updates when the server creates a record");
});

test("a Record Array can update its filter after server-side creates multiple records", function(assert) {
  setup(assert, {
    createRecord: function(store, type, snapshot) {
      switch (snapshot.attr('name')) {
        case "Client-side Mike":
          return Ember.RSVP.resolve({ id: 4, name: "Scumbag Server-side Mike" });
        case "Client-side David":
          return Ember.RSVP.resolve({ id: 5, name: "Scumbag Server-side David" });
      }
    }
  });

  clientCreates(["Mike", "David"]);
  assert.equal(get(recordArray, 'length'), 3, "The record array does not include non-matching records");

  serverResponds();
  assert.equal(get(recordArray, 'length'), 5, "The record array updates when the server creates multiple records");
});

test("a Record Array can update its filter after server-side creates multiple records", function(assert) {
  setup(assert, {
    createRecord: function(store, type, snapshot) {
      switch (snapshot.attr('name')) {
        case "Client-side Mike":
          return Ember.RSVP.resolve({ id: 4, name: "Scumbag Server-side Mike" });
        case "Client-side David":
          return Ember.RSVP.resolve({ id: 5, name: "Scumbag Server-side David" });
      }
    }
  });

  clientCreates(["Mike", "David"]);
  assert.equal(get(recordArray, 'length'), 3, "The record array does not include non-matching records");

  serverResponds();
  assert.equal(get(recordArray, 'length'), 5, "The record array updates when the server creates multiple records");
});

test("destroying filteredRecordArray unregisters models from being filtered", function(assert) {
  var filterFn = tapFn(function() { return true; });
  customAdapter(env, DS.Adapter.extend({
    shouldBackgroundReloadRecord: () => false
  }));
  run(function () {
    store.push({
      data: [{
        id: '1',
        type: 'person',
        attributes: {
          name: 'Tom Dale'
        }
      }]
    });
  });

  var recordArray;

  run(function() {
    recordArray = store.filter('person', filterFn);
  });

  assert.equal(filterFn.summary.called.length, 1);

  Ember.run(function() {
    recordArray.then(function(array) {
      array.destroy();
    });
  });
  clientEdits([1]);

  assert.equal(filterFn.summary.called.length, 1, 'expected the filter function not being called anymore');
});
