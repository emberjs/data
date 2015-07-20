/*
 This is an integration test that tests the communication between a store
 and its adapter.

 Typically, when a method is invoked on the store, it calls a related
 method on its adapter. The adapter notifies the store that it has
 completed the assigned task, either synchronously or asynchronously,
 by calling a method on the store.

 These tests ensure that the proper methods get called, and, if applicable,
 the given record or record array changes state appropriately.
*/

var get = Ember.get;
var set = Ember.set;
var run = Ember.run;
var Person, Dog, env, store, adapter;

module("integration/adapter/store_adapter - DS.Store and DS.Adapter integration test", {
  setup: function() {
    Person = DS.Model.extend({
      updatedAt: DS.attr('string'),
      name: DS.attr('string'),
      firstName: DS.attr('string'),
      lastName: DS.attr('string')
    });

    Dog = DS.Model.extend({
      name: DS.attr('string')
    });

    env = setupStore({ person: Person, dog: Dog });
    store = env.store;
    adapter = env.adapter;
  },

  teardown: function() {
    run(env.container, 'destroy');
  }
});

test("Records loaded multiple times and retrieved in recordArray are ready to send state events", function() {
  adapter.query = function(store, type, query, recordArray) {
    return Ember.RSVP.resolve([{
      id: 1,
      name: "Mickael Ramírez"
    }, {
      id: 2,
      name: "Johny Fontana"
    }]);
  };

  run(store, 'query', 'person', { q: 'bla' }).then(async(function(people) {
    var people2 = store.query('person', { q: 'bla2' });

    return Ember.RSVP.hash({ people: people, people2: people2 });
  })).then(async(function(results) {
    equal(results.people2.get('length'), 2, 'return the elements');
    ok(results.people2.get('isLoaded'), 'array is loaded');

    var person = results.people.objectAt(0);
    ok(person.get('isLoaded'), 'record is loaded');

    // delete record will not throw exception
    person.deleteRecord();
  }));

});

test("by default, createRecords calls createRecord once per record", function() {
  var count = 1;

  adapter.createRecord = function(store, type, snapshot) {
    equal(type, Person, "the type is correct");

    if (count === 1) {
      equal(snapshot.attr('name'), "Tom Dale");
    } else if (count === 2) {
      equal(snapshot.attr('name'), "Yehuda Katz");
    } else {
      ok(false, "should not have invoked more than 2 times");
    }

    var hash = snapshot.attributes();
    hash.id = count;
    hash.updatedAt = "now";

    count++;
    return Ember.RSVP.resolve(hash);
  };
  var tom, yehuda;

  run(function() {
    tom = store.createRecord('person', { name: "Tom Dale" });
    yehuda = store.createRecord('person', { name: "Yehuda Katz" });
  });

  var promise = run(function() {
    return Ember.RSVP.hash({
      tom: tom.save(),
      yehuda: yehuda.save()
    });
  });
  promise.then(async(function(records) {
    tom = records.tom;
    yehuda = records.yehuda;

    asyncEqual(tom, store.findRecord('person', 1), "Once an ID is in, find returns the same object");
    asyncEqual(yehuda, store.findRecord('person', 2), "Once an ID is in, find returns the same object");
    equal(get(tom, 'updatedAt'), "now", "The new information is received");
    equal(get(yehuda, 'updatedAt'), "now", "The new information is received");
  }));
});

test("by default, updateRecords calls updateRecord once per record", function() {
  var count = 0;

  adapter.updateRecord = function(store, type, snapshot) {
    equal(type, Person, "the type is correct");

    if (count === 0) {
      equal(snapshot.attr('name'), "Tom Dale");
    } else if (count === 1) {
      equal(snapshot.attr('name'), "Yehuda Katz");
    } else {
      ok(false, "should not get here");
    }

    count++;

    equal(snapshot.record.get('isSaving'), true, "record is saving");

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
          name: 'Brohuda Katz'
        }
      }]
    });
  });

  var promise = run(function() {
    return Ember.RSVP.hash({
      tom: store.findRecord('person', 1),
      yehuda: store.findRecord('person', 2)
    });
  });

  promise.then(async(function(records) {
    var tom = records.tom;
    var yehuda = records.yehuda;

    set(tom, "name", "Tom Dale");
    set(yehuda, "name", "Yehuda Katz");

    return Ember.RSVP.hash({ tom: tom.save(), yehuda: yehuda.save() });
  })).then(async(function(records) {
    var tom = records.tom;
    var yehuda = records.yehuda;

    equal(tom.get('isSaving'), false, "record is no longer saving");
    equal(tom.get('isLoaded'), true, "record is loaded");

    equal(yehuda.get('isSaving'), false, "record is no longer saving");
    equal(yehuda.get('isLoaded'), true, "record is loaded");
  }));
});

test("calling store.didSaveRecord can provide an optional hash", function() {
  var count = 0;

  adapter.updateRecord = function(store, type, snapshot) {
    equal(type, Person, "the type is correct");

    count++;
    if (count === 1) {
      equal(snapshot.attr('name'), "Tom Dale");
      return Ember.RSVP.resolve({ id: 1, name: "Tom Dale", updatedAt: "now" });
    } else if (count === 2) {
      equal(snapshot.attr('name'), "Yehuda Katz");
      return Ember.RSVP.resolve({ id: 2, name: "Yehuda Katz", updatedAt: "now!" });
    } else {
      ok(false, "should not get here");
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
          name: 'Brohuda Katz'
        }
      }]
    });
  });

  var promise = run(function() {
    return Ember.RSVP.hash({
      tom: store.findRecord('person', 1),
      yehuda: store.findRecord('person', 2)
    });
  });
  promise.then(async(function(records) {
    var tom = records.tom;
    var yehuda = records.yehuda;

    set(tom, "name", "Tom Dale");
    set(yehuda, "name", "Yehuda Katz");

    return Ember.RSVP.hash({ tom: tom.save(), yehuda: yehuda.save() });
  })).then(async(function(records) {
    var tom = records.tom;
    var yehuda = records.yehuda;

    equal(get(tom, 'hasDirtyAttributes'), false, "the record should not be dirty");
    equal(get(tom, 'updatedAt'), "now", "the hash was updated");

    equal(get(yehuda, 'hasDirtyAttributes'), false, "the record should not be dirty");
    equal(get(yehuda, 'updatedAt'), "now!", "the hash was updated");
  }));
});

test("by default, deleteRecord calls deleteRecord once per record", function() {
  expect(4);

  var count = 0;

  adapter.deleteRecord = function(store, type, snapshot) {
    equal(type, Person, "the type is correct");

    if (count === 0) {
      equal(snapshot.attr('name'), "Tom Dale");
    } else if (count === 1) {
      equal(snapshot.attr('name'), "Yehuda Katz");
    } else {
      ok(false, "should not get here");
    }

    count++;

    return Ember.RSVP.resolve();
  };

  run(function() {
    env.store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Yehuda Katz'
        }
      }]
    });
  });

  var promise = run(function() {
    return Ember.RSVP.hash({
      tom: store.findRecord('person', 1),
      yehuda: store.findRecord('person', 2)
    });
  });

  promise.then(async(function(records) {
    var tom = records.tom;
    var yehuda = records.yehuda;

    tom.deleteRecord();
    yehuda.deleteRecord();

    tom.save();
    yehuda.save();
  }));
});

test("by default, destroyRecord calls deleteRecord once per record without requiring .save", function() {
  expect(4);

  var count = 0;

  adapter.deleteRecord = function(store, type, snapshot) {
    equal(type, Person, "the type is correct");

    if (count === 0) {
      equal(snapshot.attr('name'), "Tom Dale");
    } else if (count === 1) {
      equal(snapshot.attr('name'), "Yehuda Katz");
    } else {
      ok(false, "should not get here");
    }

    count++;

    return Ember.RSVP.resolve();
  };

  run(function() {
    env.store.push({
      data: [{
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        }
      }, {
        type: 'person',
        id: '2',
        attributes: {
          name: 'Yehuda Katz'
        }
      }]
    });
  });

  var promise = run(function() {
    return Ember.RSVP.hash({
      tom: store.findRecord('person', 1),
      yehuda: store.findRecord('person', 2)
    });
  });

  promise.then(async(function(records) {
    var tom = records.tom;
    var yehuda = records.yehuda;

    tom.destroyRecord();
    yehuda.destroyRecord();
  }));
});

test("if an existing model is edited then deleted, deleteRecord is called on the adapter", function() {
  expect(5);

  var count = 0;

  adapter.deleteRecord = function(store, type, snapshot) {
    count++;
    equal(snapshot.id, 'deleted-record', "should pass correct record to deleteRecord");
    equal(count, 1, "should only call deleteRecord method of adapter once");

    return Ember.RSVP.resolve();
  };

  adapter.updateRecord = function() {
    ok(false, "should not have called updateRecord method of adapter");
  };

  // Load data for a record into the store.
  run(function() {
    env.store.push({
      data: {
        type: 'person',
        id: 'deleted-record',
        attributes: {
          name: 'Tom Dale'
        }
      }
    });
  });

  // Retrieve that loaded record and edit it so it becomes dirty
  run(store, 'findRecord', 'person', 'deleted-record').then(async(function(tom) {
    tom.set('name', "Tom Mothereffin' Dale");

    equal(get(tom, 'hasDirtyAttributes'), true, "precond - record should be dirty after editing");

    tom.deleteRecord();
    return tom.save();
  })).then(async(function(tom) {
    equal(get(tom, 'hasDirtyAttributes'), false, "record should not be dirty");
    equal(get(tom, 'isDeleted'), true, "record should be considered deleted");
  }));
});

test("if a deleted record errors, it enters the error state", function() {
  var count = 0;
  var error = new DS.AdapterError();

  adapter.deleteRecord = function(store, type, snapshot) {
    if (count++ === 0) {
      return Ember.RSVP.reject(error);
    } else {
      return Ember.RSVP.resolve();
    }
  };

  run(function() {
    env.store.push({
      data: {
        type: 'person',
        id: 'deleted-record',
        attributes: {
          name: 'Tom Dale'
        }
      }
    });
  });

  var tom;

  run(function() {
    store.findRecord('person', 'deleted-record').then(async(function(person) {
      tom = person;
      person.deleteRecord();
      return person.save();
    })).then(null, async(function() {
      equal(tom.get('isError'), true, "Tom is now errored");
      equal(tom.get('adapterError'), error, "error object is exposed");

      // this time it succeeds
      return tom.save();
    })).then(async(function() {
      equal(tom.get('isError'), false, "Tom is not errored anymore");
      equal(tom.get('adapterError'), null, "error object is discarded");
    }));
  });
});

test("if a created record is marked as invalid by the server, it enters an error state", function() {
  adapter.createRecord = function(store, type, snapshot) {
    equal(type, Person, "the type is correct");

    if (snapshot.attr('name').indexOf('Bro') === -1) {
      return Ember.RSVP.reject(new DS.InvalidError({ name: ['common... name requires a "bro"'] }));
    } else {
      return Ember.RSVP.resolve();
    }
  };

  var yehuda = run(function() {
    return store.createRecord('person', { id: 1, name: "Yehuda Katz" });
  });
  // Wrap this in an Ember.run so that all chained async behavior is set up
  // before flushing any scheduled behavior.
  Ember.run(function() {
    yehuda.save().then(null, async(function(error) {
      equal(get(yehuda, 'isValid'), false, "the record is invalid");
      ok(get(yehuda, 'errors.name'), "The errors.name property exists");

      set(yehuda, 'updatedAt', true);
      equal(get(yehuda, 'isValid'), false, "the record is still invalid");

      set(yehuda, 'name', "Brohuda Brokatz");

      equal(get(yehuda, 'isValid'), true, "the record is no longer invalid after changing");
      equal(get(yehuda, 'hasDirtyAttributes'), true, "the record has outstanding changes");

      equal(get(yehuda, 'isNew'), true, "precond - record is still new");

      return yehuda.save();
    })).then(async(function(person) {
      strictEqual(person, yehuda, "The promise resolves with the saved record");

      equal(get(yehuda, 'isValid'), true, "record remains valid after committing");
      equal(get(yehuda, 'isNew'), false, "record is no longer new");
    }));
  });
});

test("allows errors on arbitrary properties on create", function() {
  adapter.createRecord = function(store, type, snapshot) {
    if (snapshot.attr('name').indexOf('Bro') === -1) {
      return Ember.RSVP.reject(new DS.InvalidError({ base: ['is a generally unsavoury character'] }));
    } else {
      return Ember.RSVP.resolve();
    }
  };

  var yehuda = run(function () {
    return store.createRecord('person', { id: 1, name: "Yehuda Katz" });
  });

  // Wrap this in an Ember.run so that all chained async behavior is set up
  // before flushing any scheduled behavior.
  run(function() {
    yehuda.save().then(null, async(function(error) {
      equal(get(yehuda, 'isValid'), false, "the record is invalid");
      ok(get(yehuda, 'errors.base'), "The errors.base property exists");
      deepEqual(get(yehuda, 'errors').errorsFor('base'), [{ attribute: 'base', message: "is a generally unsavoury character" }]);

      set(yehuda, 'updatedAt', true);
      equal(get(yehuda, 'isValid'), false, "the record is still invalid");

      set(yehuda, 'name', "Brohuda Brokatz");

      equal(get(yehuda, 'isValid'), false, "the record is still invalid as far as we know");
      equal(get(yehuda, 'hasDirtyAttributes'), true, "the record has outstanding changes");

      equal(get(yehuda, 'isNew'), true, "precond - record is still new");

      return yehuda.save();
    })).then(async(function(person) {
      strictEqual(person, yehuda, "The promise resolves with the saved record");
      ok(!get(yehuda, 'errors.base'), "The errors.base property does not exist");
      deepEqual(get(yehuda, 'errors').errorsFor('base'), []);
      equal(get(yehuda, 'isValid'), true, "record remains valid after committing");
      equal(get(yehuda, 'isNew'), false, "record is no longer new");
    }));
  });
});

test("if a created record is marked as invalid by the server, you can attempt the save again", function() {
  var saveCount = 0;
  adapter.createRecord = function(store, type, snapshot) {
    equal(type, Person, "the type is correct");
    saveCount++;

    if (snapshot.attr('name').indexOf('Bro') === -1) {
      return Ember.RSVP.reject(new DS.InvalidError({ name: ['common... name requires a "bro"'] }));
    } else {
      return Ember.RSVP.resolve();
    }
  };

  var yehuda = run(function() {
    return store.createRecord('person', { id: 1, name: "Yehuda Katz" });
  });

  // Wrap this in an Ember.run so that all chained async behavior is set up
  // before flushing any scheduled behavior.
  Ember.run(function() {
    yehuda.save().then(null, async(function(reason) {
      equal(saveCount, 1, "The record has been saved once");
      ok(reason.message.match("The adapter rejected the commit because it was invalid"), "It should fail due to being invalid");
      equal(get(yehuda, 'isValid'), false, "the record is invalid");
      equal(get(yehuda, 'hasDirtyAttributes'), true, "the record has outstanding changes");
      ok(get(yehuda, 'errors.name'), "The errors.name property exists");
      equal(get(yehuda, 'isNew'), true, "precond - record is still new");
      return yehuda.save();
    })).then(null, async(function(reason) {
      equal(saveCount, 2, "The record has been saved twice");
      ok(reason.message.match("The adapter rejected the commit because it was invalid"), "It should fail due to being invalid");
      equal(get(yehuda, 'isValid'), false, "the record is still invalid");
      equal(get(yehuda, 'hasDirtyAttributes'), true, "the record has outstanding changes");
      ok(get(yehuda, 'errors.name'), "The errors.name property exists");
      equal(get(yehuda, 'isNew'), true, "precond - record is still new");
      set(yehuda, 'name', 'Brohuda Brokatz');
      return yehuda.save();
    })).then(async(function(person) {
      equal(saveCount, 3, "The record has been saved thrice");
      equal(get(yehuda, 'isValid'), true, "record is valid");
      equal(get(yehuda, 'hasDirtyAttributes'), false, "record is not dirty");
      equal(get(yehuda, 'errors.isEmpty'), true, "record has no errors");
    }));
  });
});

test("if a created record is marked as erred by the server, it enters an error state", function() {
  var error = new DS.AdapterError();

  adapter.createRecord = function(store, type, snapshot) {
    return Ember.RSVP.reject(error);
  };

  Ember.run(function() {
    var person = store.createRecord('person', { id: 1, name: "John Doe" });

    person.save().then(null, async(function() {
      ok(get(person, 'isError'), "the record is in the error state");
      equal(get(person, 'adapterError'), error, "error object is exposed");
    }));
  });
});

test("if an updated record is marked as invalid by the server, it enters an error state", function() {
  adapter.updateRecord = function(store, type, snapshot) {
    equal(type, Person, "the type is correct");

    if (snapshot.attr('name').indexOf('Bro') === -1) {
      return Ember.RSVP.reject(new DS.InvalidError({ name: ['common... name requires a "bro"'] }));
    } else {
      return Ember.RSVP.resolve();
    }
  };

  var yehuda = run(function() {
    env.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Brohuda Brokatz'
        }
      }
    });
    return store.peekRecord('person', 1);
  });

  Ember.run(function() {
    store.findRecord('person', 1).then(async(function(person) {
      equal(person, yehuda, "The same object is passed through");

      equal(get(yehuda, 'isValid'), true, "precond - the record is valid");
      set(yehuda, 'name', "Yehuda Katz");
      equal(get(yehuda, 'isValid'), true, "precond - the record is still valid as far as we know");

      equal(get(yehuda, 'hasDirtyAttributes'), true, "the record is dirty");

      return yehuda.save();
    })).then(null, async(function(reason) {
      equal(get(yehuda, 'hasDirtyAttributes'), true, "the record is still dirty");
      equal(get(yehuda, 'isValid'), false, "the record is invalid");

      set(yehuda, 'updatedAt', true);
      equal(get(yehuda, 'isValid'), false, "the record is still invalid");

      set(yehuda, 'name', "Brohuda Brokatz");
      equal(get(yehuda, 'isValid'), true, "the record is no longer invalid after changing");
      equal(get(yehuda, 'hasDirtyAttributes'), true, "the record has outstanding changes");

      return yehuda.save();
    })).then(async(function(yehuda) {
      equal(get(yehuda, 'isValid'), true, "record remains valid after committing");
      equal(get(yehuda, 'hasDirtyAttributes'), false, "record is no longer new");
    }));
  });
});


test("records can have errors on arbitrary properties after update", function() {
  adapter.updateRecord = function(store, type, snapshot) {
    if (snapshot.attr('name').indexOf('Bro') === -1) {
      return Ember.RSVP.reject(new DS.InvalidError({ base: ['is a generally unsavoury character'] }));
    } else {
      return Ember.RSVP.resolve();
    }
  };

  var yehuda = run(function() {
    env.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Brohuda Brokatz'
        }
      }
    });
    return store.peekRecord('person', 1);
  });

  run(function() {
    store.findRecord('person', 1).then(async(function(person) {
      equal(person, yehuda, "The same object is passed through");

      equal(get(yehuda, 'isValid'), true, "precond - the record is valid");
      set(yehuda, 'name', "Yehuda Katz");
      equal(get(yehuda, 'isValid'), true, "precond - the record is still valid as far as we know");

      equal(get(yehuda, 'hasDirtyAttributes'), true, "the record is dirty");

      return yehuda.save();
    })).then(null, async(function(reason) {
      equal(get(yehuda, 'hasDirtyAttributes'), true, "the record is still dirty");
      equal(get(yehuda, 'isValid'), false, "the record is invalid");
      ok(get(yehuda, 'errors.base'), "The errors.base property exists");
      deepEqual(get(yehuda, 'errors').errorsFor('base'), [{ attribute: 'base', message: "is a generally unsavoury character" }]);

      set(yehuda, 'updatedAt', true);
      equal(get(yehuda, 'isValid'), false, "the record is still invalid");

      set(yehuda, 'name', "Brohuda Brokatz");
      equal(get(yehuda, 'isValid'), false, "the record is still invalid after changing (only server can know if it's now valid)");
      equal(get(yehuda, 'hasDirtyAttributes'), true, "the record has outstanding changes");

      return yehuda.save();
    })).then(async(function(yehuda) {
      equal(get(yehuda, 'isValid'), true, "record remains valid after committing");
      equal(get(yehuda, 'hasDirtyAttributes'), false, "record is no longer new");
      ok(!get(yehuda, 'errors.base'), "The errors.base property does not exist");
      deepEqual(get(yehuda, 'errors').errorsFor('base'), []);
    }));
  });
});



test("if an updated record is marked as invalid by the server, you can attempt the save again", function() {
  var saveCount = 0;
  adapter.updateRecord = function(store, type, snapshot) {
    equal(type, Person, "the type is correct");
    saveCount++;
    if (snapshot.attr('name').indexOf('Bro') === -1) {
      return Ember.RSVP.reject(new DS.InvalidError({ name: ['common... name requires a "bro"'] }));
    } else {
      return Ember.RSVP.resolve();
    }
  };

  var yehuda = run(function() {
    env.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Brohuda Brokatz'
        }
      }
    });
    return store.peekRecord('person', 1);
  });

  Ember.run(function() {
    store.findRecord('person', 1).then(async(function(person) {
      equal(person, yehuda, "The same object is passed through");

      equal(get(yehuda, 'isValid'), true, "precond - the record is valid");
      set(yehuda, 'name', "Yehuda Katz");
      equal(get(yehuda, 'isValid'), true, "precond - the record is still valid as far as we know");

      equal(get(yehuda, 'hasDirtyAttributes'), true, "the record is dirty");

      return yehuda.save();
    })).then(null, async(function(reason) {
      equal(saveCount, 1, "The record has been saved once");
      ok(reason.message.match("The adapter rejected the commit because it was invalid"), "It should fail due to being invalid");
      equal(get(yehuda, 'hasDirtyAttributes'), true, "the record is still dirty");
      equal(get(yehuda, 'isValid'), false, "the record is invalid");
      return yehuda.save();
    })).then(null, async(function(reason) {
      equal(saveCount, 2, "The record has been saved twice");
      ok(reason.message.match("The adapter rejected the commit because it was invalid"), "It should fail due to being invalid");
      equal(get(yehuda, 'isValid'), false, "record is still invalid");
      equal(get(yehuda, 'hasDirtyAttributes'), true, "record is still dirty");
      set(yehuda, 'name', 'Brohuda Brokatz');
      return yehuda.save();
    })).then(async(function(person) {
      equal(saveCount, 3, "The record has been saved thrice");
      equal(get(yehuda, 'isValid'), true, "record is valid");
      equal(get(yehuda, 'hasDirtyAttributes'), false, "record is not dirty");
      equal(get(yehuda, 'errors.isEmpty'), true, "record has no errors");
    }));
  });
});


test("if a updated record is marked as erred by the server, it enters an error state", function() {
  var error = new DS.AdapterError();

  adapter.updateRecord = function(store, type, snapshot) {
    return Ember.RSVP.reject(error);
  };

  var person = run(function() {
    env.store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Doe'
        }
      }
    });
    return store.peekRecord('person', 1);
  });

  run(store, 'findRecord', 'person', 1).then(async(function(record) {
    equal(record, person, "The person was resolved");
    person.set('name', "Jonathan Doe");
    return person.save();
  })).then(null, async(function(reason) {
    ok(get(person, 'isError'), "the record is in the error state");
    equal(get(person, 'adapterError'), error, "error object is exposed");
  }));
});

test("can be created after the DS.Store", function() {
  expect(1);

  adapter.findRecord = function(store, type, id, snapshot) {
    equal(type, Person, "the type is correct");
    return Ember.RSVP.resolve({ id: 1 });
  };

  run(function() {
    store.findRecord('person', 1);
  });
});

test("the filter method can optionally take a server query as well", function() {
  adapter.query = function(store, type, query, array) {
    return Ember.RSVP.resolve([
      { id: 1, name: "Yehuda Katz" },
      { id: 2, name: "Tom Dale" }
    ]);
  };

  var asyncFilter = store.filter('person', { page: 1 }, function(data) {
    return data.get('name') === "Tom Dale";
  });

  var loadedFilter;

  asyncFilter.then(async(function(filter) {
    loadedFilter = filter;
    return store.findRecord('person', 2);
  })).then(async(function(tom) {
    equal(get(loadedFilter, 'length'), 1, "The filter has an item in it");
    deepEqual(loadedFilter.toArray(), [tom], "The filter has a single entry in it");
  }));
});

test("relationships returned via `commit` do not trigger additional findManys", function() {
  Person.reopen({
    dogs: DS.hasMany('dog', { async: false })
  });

  run(function() {
    env.store.push({
      data: {
        type: 'dog',
        id: '1',
        attributes: {
          name: 'Scruffy'
        }
      }
    });
  });

  adapter.findRecord = function(store, type, id, snapshot) {
    return Ember.RSVP.resolve({ id: 1, name: "Tom Dale", dogs: [1] });
  };

  adapter.updateRecord = function(store, type, snapshot) {
    return new Ember.RSVP.Promise(function(resolve, reject) {
      env.store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Tom Dale'
          },
          relationships: {
            dogs: {
              data: [
                { type: 'dog', id: '1' },
                { type: 'dog', id: '2' }
              ]
            }
          }
        },
        included: [{
          type: 'dog',
          id: '2',
          attributes: {
            name: 'Scruffles'
          }
        }]
      });

      resolve({ id: 1, name: "Scruffy" });
    });
  };

  adapter.findMany = function(store, type, ids, snapshots) {
    ok(false, "Should not get here");
  };

  run(function() {
    store.findRecord('person', 1).then(async(function(person) {
      return Ember.RSVP.hash({ tom: person, dog: store.findRecord('dog', 1) });
    })).then(async(function(records) {
      records.tom.get('dogs');
      return records.dog.save();
    })).then(async(function(tom) {
      ok(true, "Tom was saved");
    }));
  });
});

test("relationships don't get reset if the links is the same", function() {
  Person.reopen({
    dogs: DS.hasMany({ async: true })
  });

  var count = 0;

  adapter.findHasMany = function(store, snapshot, link, relationship) {
    ok(count++ === 0, "findHasMany is only called once");

    return Ember.RSVP.resolve([{ id: 1, name: "Scruffy" }]);
  };

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        },
        relationships: {
          dogs: {
            links: {
              related: '/dogs'
            }
          }
        }
      }
    });
  });

  var tom, dogs;

  run(store, 'findRecord', 'person', 1).then(async(function(person) {
    tom = person;
    dogs = tom.get('dogs');
    return dogs;
  })).then(async(function(dogs) {
    equal(dogs.get('length'), 1, "The dogs are loaded");
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        },
        relationships: {
          dogs: {
            links: {
              related: '/dogs'
            }
          }
        }
      }
    });
    ok(tom.get('dogs') instanceof DS.PromiseArray, 'dogs is a promise');
    return tom.get('dogs');
  })).then(async(function(dogs) {
    equal(dogs.get('length'), 1, "The same dogs are loaded");
  }));
});

test("async hasMany always returns a promise", function() {
  Person.reopen({
    dogs: DS.hasMany({ async: true })
  });

  adapter.createRecord = function(store, type, snapshot) {
    var hash = { name: "Tom Dale" };
    hash.dogs = [];
    hash.id = 1;
    return Ember.RSVP.resolve(hash);
  };
  var tom;

  run(function() {
    tom = store.createRecord('person', { name: "Tom Dale" });
  });

  ok(tom.get('dogs') instanceof DS.PromiseArray, "dogs is a promise before save");

  run(function() {
    tom.save().then(async(function() {
      ok(tom.get('dogs') instanceof DS.PromiseArray, "dogs is a promise after save");
    }));
  });
});

test("createRecord receives a snapshot", function() {
  expect(1);

  adapter.createRecord = function(store, type, snapshot) {
    ok(snapshot instanceof DS.Snapshot, "snapshot is an instance of DS.Snapshot");
    return Ember.RSVP.resolve();
  };

  var person;

  run(function() {
    person = store.createRecord('person', { name: "Tom Dale" });
    person.save();
  });
});

test("updateRecord receives a snapshot", function() {
  expect(1);

  adapter.updateRecord = function(store, type, snapshot) {
    ok(snapshot instanceof DS.Snapshot, "snapshot is an instance of DS.Snapshot");
    return Ember.RSVP.resolve();
  };

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

  run(function() {
    set(person, "name", "Tomster");
    person.save();
  });
});

test("deleteRecord receives a snapshot", function() {
  expect(1);

  adapter.deleteRecord = function(store, type, snapshot) {
    ok(snapshot instanceof DS.Snapshot, "snapshot is an instance of DS.Snapshot");
    return Ember.RSVP.resolve();
  };

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

  run(function() {
    person.deleteRecord();
    person.save();
  });
});

test("find receives a snapshot", function() {
  expect(1);

  adapter.findRecord = function(store, type, id, snapshot) {
    ok(snapshot instanceof DS.Snapshot, "snapshot is an instance of DS.Snapshot");
    return Ember.RSVP.resolve({ id: 1 });
  };

  run(function() {
    store.findRecord('person', 1);
  });
});

test("findMany receives an array of snapshots", function() {
  expect(2);

  Person.reopen({
    dogs: DS.hasMany({ async: true })
  });

  adapter.coalesceFindRequests = true;
  adapter.findMany = function(store, type, ids, snapshots) {
    ok(snapshots[0] instanceof DS.Snapshot, "snapshots[0] is an instance of DS.Snapshot");
    ok(snapshots[1] instanceof DS.Snapshot, "snapshots[1] is an instance of DS.Snapshot");
    return Ember.RSVP.resolve([{ id: 2 }, { id: 3 }]);
  };

  var person;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          dogs: {
            data: [
              { type: 'dog', id: '2' },
              { type: 'dog', id: '3' }
            ]
          }
        }
      }
    });
    person = store.peekRecord('person', 1);
  });

  run(function() {
    person.get('dogs');
  });
});

test("findHasMany receives a snapshot", function() {
  expect(1);

  Person.reopen({
    dogs: DS.hasMany({ async: true })
  });

  env.adapter.findHasMany = function(store, snapshot, link, relationship) {
    ok(snapshot instanceof DS.Snapshot, "snapshot is an instance of DS.Snapshot");
    return Ember.RSVP.resolve([{ id: 2 }, { id: 3 }]);
  };

  var person;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          dogs: {
            links: {
              related: 'dogs'
            }
          }
        }
      }
    });
    person = store.peekRecord('person', 1);
  });

  run(function() {
    person.get('dogs');
  });
});

test("findBelongsTo receives a snapshot", function() {
  expect(1);

  Person.reopen({
    dog: DS.belongsTo({ async: true })
  });

  env.adapter.findBelongsTo = async(function(store, snapshot, link, relationship) {
    ok(snapshot instanceof DS.Snapshot, "snapshot is an instance of DS.Snapshot");
    return Ember.RSVP.resolve({ id: 2 });
  });

  var person;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          dog: {
            links: {
              related: 'dog'
            }
          }
        }
      }
    });
    person = store.peekRecord('person', 1);
  });

  run(function() {
    person.get('dog');
  });
});

test("record.save should pass adapterOptions to the updateRecord method", function() {
  expect(1);

  env.adapter.updateRecord = async(function(store, type, snapshot) {
    deepEqual(snapshot.adapterOptions, { subscribe: true });
    return Ember.RSVP.resolve({ id: 1 });
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom'
        }
      }
    });
    var person = store.peekRecord('person', 1);
    person.save({ adapterOptions: { subscribe: true } });
  });
});

test("record.save should pass adapterOptions to the createRecord method", function() {
  expect(1);

  env.adapter.createRecord = async(function(store, type, snapshot) {
    deepEqual(snapshot.adapterOptions, { subscribe: true });
    return Ember.RSVP.resolve({ id: 1 });
  });

  run(function() {
    var person = store.createRecord('person', { name: 'Tom' });
    person.save({ adapterOptions: { subscribe: true } });
  });
});

test("record.save should pass adapterOptions to the deleteRecord method", function() {
  expect(1);

  env.adapter.deleteRecord = async(function(store, type, snapshot) {
    deepEqual(snapshot.adapterOptions, { subscribe: true });
    return Ember.RSVP.resolve({ id: 1 });
  });

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom'
        }
      }
    });
    var person = store.peekRecord('person', 1);
    person.destroyRecord({ adapterOptions: { subscribe: true } });
  });
});


test("findRecord should pass adapterOptions to the find method", function() {
  expect(1);

  env.adapter.findRecord = async(function(store, type, id, snapshot) {
    deepEqual(snapshot.adapterOptions, { query: { embed: true } });
    return Ember.RSVP.resolve({ id: 1 });
  });

  run(function() {
    store.findRecord('person', 1, { adapterOptions: { query: { embed: true } } });
  });
});


test("findAll should pass adapterOptions to the findAll method", function() {
  expect(1);

  env.adapter.findAll = async(function(store, type, sinceToken, arraySnapshot) {
    var adapterOptions = arraySnapshot.adapterOptions;
    deepEqual(adapterOptions, { query: { embed: true } });
    return Ember.RSVP.resolve([{ id: 1 }]);
  });

  run(function() {
    store.findAll('person', { adapterOptions: { query: { embed: true } } });
  });
});


test("An async hasMany relationship with links should not trigger shouldBackgroundReloadRecord", function() {
  var Post = DS.Model.extend({
    name: DS.attr("string"),
    comments: DS.hasMany('comment', { async: true })
  });

  var Comment = DS.Model.extend({
    name: DS.attr("string")
  });

  env = setupStore({
    post: Post,
    comment: Comment,
    adapter: DS.RESTAdapter.extend({
      findRecord: function() {
        return {
          posts: {
            id: 1,
            name: "Rails is omakase",
            links: { comments: '/posts/1/comments' }
          }
        };
      },
      findHasMany: function() {
        return Ember.RSVP.resolve({
          comments: [
            { id: 1, name: "FIRST" },
            { id: 2, name: "Rails is unagi" },
            { id: 3, name: "What is omakase?" }
          ]
        });
      },
      shouldBackgroundReloadRecord: function() {
        ok(false, 'shouldBackgroundReloadRecord should not be called');
      }
    })
  });

  store = env.store;

  run(store, 'find', 'post', '1').then(async(function(post) {
    return post.get('comments');
  })).then(async(function(comments) {
    equal(comments.get('length'), 3);
  }));
});
