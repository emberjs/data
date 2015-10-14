const keysFunc = Object.keys || Ember.keys;

var env, store, Person, Dog;
var run = Ember.run;

module("unit/model/rollbackAttributes - model.rollbackAttributes()", {
  setup: function() {
    Person = DS.Model.extend({
      firstName: DS.attr(),
      lastName: DS.attr()
    });

    env = setupStore({ person: Person });
    store = env.store;
  }
});

test("changes to attributes can be rolled back", function() {
  var person;
  run(function() {
    person = store.push('person', { id: 1, firstName: "Tom", lastName: "Dale" });
    person.set('firstName', "Thomas");
  });

  equal(person.get('firstName'), "Thomas");

  run(function() {
    person.rollbackAttributes();
  });

  equal(person.get('firstName'), "Tom");
  equal(person.get('hasDirtyAttributes'), false);
});

test("changes to unassigned attributes can be rolled back", function() {
  var person;
  run(function() {
    person = store.push('person', { id: 1, lastName: "Dale" });
    person.set('firstName', "Thomas");
  });

  equal(person.get('firstName'), "Thomas");

  run(function() {
    person.rollbackAttributes();
  });

  equal(person.get('firstName'), undefined);
  equal(person.get('hasDirtyAttributes'), false);
});

test("changes to attributes made after a record is in-flight only rolls back the local changes", function() {
  env.adapter.updateRecord = function(store, type, snapshot) {
    // Make sure the save is async
    return new Ember.RSVP.Promise(function(resolve, reject) {
      Ember.run.later(null, resolve, 15);
    });
  };
  var person;

  run(function() {
    person = store.push('person', { id: 1, firstName: "Tom", lastName: "Dale" });
    person.set('firstName', "Thomas");
  });

  Ember.run(function() {
    var saving = person.save();

    equal(person.get('firstName'), "Thomas");

    person.set('lastName', "Dolly");

    equal(person.get('lastName'), "Dolly");

    person.rollbackAttributes();

    equal(person.get('firstName'), "Thomas");
    equal(person.get('lastName'), "Dale");
    equal(person.get('isSaving'), true);

    saving.then(async(function() {
      equal(person.get('hasDirtyAttributes'), false, "The person is now clean");
    }));
  });
});

test("a record's changes can be made if it fails to save", function() {
  env.adapter.updateRecord = function(store, type, snapshot) {
    return Ember.RSVP.reject();
  };
  var person;

  run(function() {
    person = store.push('person', { id: 1, firstName: "Tom", lastName: "Dale" });
    person.set('firstName', "Thomas");
  });

  deepEqual(person.changedAttributes().firstName, ["Tom", "Thomas"]);

  run(function() {
    person.save().then(null, function() {
      equal(person.get('isError'), true);
      deepEqual(person.changedAttributes().firstName, ["Tom", "Thomas"]);

      person.rollbackAttributes();

      equal(person.get('firstName'), "Tom");
      equal(person.get('isError'), false);
      equal(keysFunc(person.changedAttributes()).length, 0);
    });
  });
});

test("a deleted record's attributes can be rollbacked if it fails to save, record arrays are updated accordingly", function() {
  expect(8);
  env.adapter.deleteRecord = function(store, type, snapshot) {
    return Ember.RSVP.reject();
  };
  var person, people;

  run(function() {
    person = store.push('person', { id: 1, firstName: "Tom", lastName: "Dale" });
    people = store.peekAll('person');
  });

  run(function() {
    person.deleteRecord();
  });
  equal(people.get('length'), 0, "a deleted record does not appear in record array anymore");
  equal(people.objectAt(0), null, "a deleted record does not appear in record array anymore");

  run(function() {
    person.save().then(null, function() {
      equal(person.get('isError'), true);
      equal(person.get('isDeleted'), true);
      run(function() {
        person.rollbackAttributes();
      });
      equal(person.get('isDeleted'), false);
      equal(person.get('isError'), false);
      equal(person.get('hasDirtyAttributes'), false, "must be not dirty");
    }).then(function() {
      equal(people.get('length'), 1, "the underlying record array is updated accordingly in an asynchronous way");
    });
  });
});

test("new record's attributes can be rollbacked", function() {
  var person;

  run(function() {
    person = store.createRecord('person', { id: 1 });
  });

  equal(person.get('isNew'), true, "must be new");
  equal(person.get('hasDirtyAttributes'), true, "must be dirty");

  Ember.run(person, 'rollbackAttributes');

  equal(person.get('isNew'), false, "must not be new");
  equal(person.get('hasDirtyAttributes'), false, "must not be dirty");
  equal(person.get('isDeleted'), true, "must be deleted");
});

test("invalid new record's attributes can be rollbacked", function() {
  var person;
  var error = new DS.InvalidError([
    {
      detail: 'is invalid',
      source: { pointer: 'data/attributes/name' }
    }
  ]);
  var adapter = DS.RESTAdapter.extend({
    ajax: function(url, type, hash) {
      return new Ember.RSVP.Promise(function(resolve, reject) {
        /* If InvalidError is passed back in the reject it will throw the
           exception which will bubble up the call stack (crashing the test)
           instead of hitting the failure route of the promise.
           So wrapping the reject in an Ember.run.next makes it so save
           completes without failure and the failure hits the failure route
           of the promise instead of crashing the save. */
        Ember.run.next(function() {
          reject(error);
        });
      });
    }
  });

  env = setupStore({ person: Person, adapter: adapter });

  run(function() {
    person = env.store.createRecord('person', { id: 1 });
  });

  equal(person.get('isNew'), true, "must be new");
  equal(person.get('hasDirtyAttributes'), true, "must be dirty");

  run(function() {
    person.save().then(null, async(function() {
      equal(person.get('isValid'), false);
      person.rollbackAttributes();

      equal(person.get('isNew'), false, "must not be new");
      equal(person.get('hasDirtyAttributes'), false, "must not be dirty");
      equal(person.get('isDeleted'), true, "must be deleted");
    }));
  });
});

test("invalid record's attributes can be rollbacked after multiple failed calls - #3677", function() {
  var person;

  var adapter = DS.RESTAdapter.extend({
    ajax: function(url, type, hash) {
      var error = new DS.InvalidError();
      return Ember.RSVP.reject(error);
    }
  });

  env = setupStore({ person: Person, adapter: adapter });

  run(function() {
    person = env.store.push({
      data: {
        type: 'person',
        id: 1,
        attributes: {
          firstName: 'original name'
        }
      }
    });

    person.set('firstName', 'updated name');
  });

  run(function() {
    equal(person.get('firstName'), 'updated name', "precondition: firstName is changed");

    person.save().then(null, async(function() {
      equal(person.get('hasDirtyAttributes'), true, "has dirty attributes");
      equal(person.get('firstName'), 'updated name', "firstName is still changed");

      return person.save();
    })).then(null, async(function() {
      person.rollbackAttributes();

      equal(person.get('hasDirtyAttributes'), false, "has no dirty attributes");
      equal(person.get('firstName'), 'original name', "after rollbackAttributes() firstName has the original value");
    }));
  });
});

test("deleted record's attributes can be rollbacked", function() {
  var person, people;

  run(function() {
    person = store.push('person', { id: 1 });
    people = store.peekAll('person');
    person.deleteRecord();
  });

  equal(people.get('length'), 0, "a deleted record does not appear in record array anymore");
  equal(people.objectAt(0), null, "a deleted record does not appear in record array anymore");

  equal(person.get('isDeleted'), true, "must be deleted");

  run(function() {
    person.rollbackAttributes();
  });
  equal(people.get('length'), 1, "the rollbacked record should appear again in the record array");
  equal(person.get('isDeleted'), false, "must not be deleted");
  equal(person.get('hasDirtyAttributes'), false, "must not be dirty");
});

test("invalid record's attributes can be rollbacked", function() {
  expect(10);
  Dog = DS.Model.extend({
    name: DS.attr()
  });

  var error = new DS.InvalidError([
    {
      detail: 'is invalid',
      source: { pointer: 'data/attributes/name' }
    }
  ]);

  var adapter = DS.RESTAdapter.extend({
    ajax: function(url, type, hash) {
      return new Ember.RSVP.Promise(function(resolve, reject) {
        /* If InvalidError is passed back in the reject it will throw the
           exception which will bubble up the call stack (crashing the test)
           instead of hitting the failure route of the promise.
           So wrapping the reject in an Ember.run.next makes it so save
           completes without failure and the failure hits the failure route
           of the promise instead of crashing the save. */
        Ember.run.next(function() {
          reject(error);
        });
      });
    }
  });

  env = setupStore({ dog: Dog, adapter: adapter });
  var dog;
  run(function() {
    dog = env.store.push('dog', { id: 1, name: "Pluto" });
    dog.set('name', "is a dwarf planet");
  });

  run(function() {
    Ember.addObserver(dog, 'errors.name', function() {
      ok(true, 'errors.name did change');
    });

    dog.get('errors').addArrayObserver({}, {
      willChange: function() {
        ok(true, 'errors will change');
      },
      didChange: function() {
        ok(true, 'errors did change');
      }
    });

    dog.save().then(null, async(function() {
      dog.rollbackAttributes();

      equal(dog.get('hasDirtyAttributes'), false, "must not be dirty");
      equal(dog.get('name'), "Pluto");
      ok(Ember.isEmpty(dog.get('errors.name')));
      ok(dog.get('isValid'));
    }));
  });
});

test("invalid record's attributes rolled back to correct state after set", function() {
  expect(13);
  Dog = DS.Model.extend({
    name: DS.attr(),
    breed: DS.attr()
  });

  var error = new DS.InvalidError([
    {
      detail: 'is invalid',
      source: { pointer: 'data/attributes/name' }
    }
  ]);

  var adapter = DS.RESTAdapter.extend({
    ajax: function(url, type, hash) {
      return new Ember.RSVP.Promise(function(resolve, reject) {
        /* If InvalidError is passed back in the reject it will throw the
           exception which will bubble up the call stack (crashing the test)
           instead of hitting the failure route of the promise.
           So wrapping the reject in an Ember.run.next makes it so save
           completes without failure and the failure hits the failure route
           of the promise instead of crashing the save. */
        Ember.run.next(function() {
          reject(error);
        });
      });
    }
  });

  env = setupStore({ dog: Dog, adapter: adapter });
  var dog;
  run(function() {
    dog = env.store.push('dog', { id: 1, name: "Pluto", breed: "Disney" });
    dog.set('name', "is a dwarf planet");
    dog.set('breed', 'planet');
  });

  run(function() {
    Ember.addObserver(dog, 'errors.name', function() {
      ok(true, 'errors.name did change');
    });

    dog.save().then(null, async(function() {
      equal(dog.get('name'), "is a dwarf planet");
      equal(dog.get('breed'), "planet");
      ok(Ember.isPresent(dog.get('errors.name')));
      equal(dog.get('errors.name.length'), 1);

      run(function() {
        dog.set('name', 'Seymour Asses');
      });

      equal(dog.get('name'), "Seymour Asses");
      equal(dog.get('breed'), "planet");

      run(function() {
        dog.rollbackAttributes();
      });

      equal(dog.get('name'), "Pluto");
      equal(dog.get('breed'), "Disney");
      equal(dog.get('hasDirtyAttributes'), false, "must not be dirty");
      ok(Ember.isEmpty(dog.get('errors.name')));
      ok(dog.get('isValid'));
    }));
  });
});

test("when destroying a record setup the record state to invalid, the record's attributes can be rollbacked", function() {
  Dog = DS.Model.extend({
    name: DS.attr()
  });

  var error = new DS.InvalidError([
    {
      detail: 'is invalid',
      source: { pointer: 'data/attributes/name' }
    }
  ]);

  var adapter = DS.RESTAdapter.extend({
    ajax: function(url, type, hash) {
      return new Ember.RSVP.Promise(function(resolve, reject) {
        Ember.run.next(function() {
          reject(error);
        });
      });
    }
  });

  env = setupStore({ dog: Dog, adapter: adapter });
  var dog;
  run(function() {
    dog = env.store.push('dog', { id: 1, name: "Pluto" });
  });

  run(function() {
    dog.destroyRecord().then(null, async(function() {


      equal(dog.get('isError'), false, "must not be error");
      equal(dog.get('isDeleted'), true, "must be deleted");
      equal(dog.get('isValid'), false, "must not be valid");
      ok(dog.get('errors.length') > 0, "must have errors");

      dog.rollbackAttributes();

      equal(dog.get('isError'), false, "must not be error after `rollbackAttributes`");
      equal(dog.get('isDeleted'), false, "must not be deleted after `rollbackAttributes`");
      equal(dog.get('isValid'), true, "must be valid after `rollbackAttributes`");
      ok(dog.get('errors.length') === 0, "must not have errors");
    }));
  });
});
