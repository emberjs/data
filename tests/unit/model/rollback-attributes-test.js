import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';
import isEnabled from 'ember-data/-private/features';

var env, store, Person, Dog;
var run = Ember.run;

module("unit/model/rollbackAttributes - model.rollbackAttributes()", {
  beforeEach() {
    Person = DS.Model.extend({
      firstName: DS.attr(),
      lastName: DS.attr()
    });
    Person.reopenClass({ toString() { return 'Person'; } });

    env = setupStore({ person: Person });
    store = env.store;
  }
});

test("changes to attributes can be rolled back", function(assert) {
  var person;
  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          firstName: "Tom",
          lastName: "Dale"
        }
      }
    });
    person = store.peekRecord('person', 1);
    person.set('firstName', "Thomas");
  });

  assert.equal(person.get('firstName'), "Thomas");

  run(function() {
    person.rollbackAttributes();
  });

  assert.equal(person.get('firstName'), "Tom");
  assert.equal(person.get('hasDirtyAttributes'), false);
});

test("changes to unassigned attributes can be rolled back", function(assert) {
  var person;
  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          lastName: "Dale"
        }
      }
    });
    person = store.peekRecord('person', 1);
    person.set('firstName', "Thomas");
  });

  assert.equal(person.get('firstName'), "Thomas");

  run(function() {
    person.rollbackAttributes();
  });

  assert.equal(person.get('firstName'), undefined);
  assert.equal(person.get('hasDirtyAttributes'), false);
});

test("changes to attributes made after a record is in-flight only rolls back the local changes", function(assert) {
  env.adapter.updateRecord = function(store, type, snapshot) {
    // Make sure the save is async
    return new Ember.RSVP.Promise(function(resolve, reject) {
      Ember.run.later(null, resolve, 15);
    });
  };
  var person;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          firstName: "Tom",
          lastName: "Dale"
        }
      }
    });
    person = store.peekRecord('person', 1);
    person.set('firstName', "Thomas");
  });

  Ember.run(function() {
    var saving = person.save();

    assert.equal(person.get('firstName'), "Thomas");

    person.set('lastName', "Dolly");

    assert.equal(person.get('lastName'), "Dolly");

    person.rollbackAttributes();

    assert.equal(person.get('firstName'), "Thomas");
    assert.equal(person.get('lastName'), "Dale");
    assert.equal(person.get('isSaving'), true);

    saving.then(assert.wait(function() {
      assert.equal(person.get('hasDirtyAttributes'), false, "The person is now clean");
    }));
  });
});

test("a record's changes can be made if it fails to save", function(assert) {
  env.adapter.updateRecord = function(store, type, snapshot) {
    return Ember.RSVP.reject();
  };
  var person;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          firstName: "Tom",
          lastName: "Dale"
        }
      }
    });
    person = store.peekRecord('person', 1);
    person.set('firstName', "Thomas");
  });

  assert.deepEqual(person.changedAttributes().firstName, ["Tom", "Thomas"]);

  run(function() {
    person.save().then(null, function() {
      assert.equal(person.get('isError'), true);
      assert.deepEqual(person.changedAttributes().firstName, ["Tom", "Thomas"]);

      person.rollbackAttributes();

      assert.equal(person.get('firstName'), "Tom");
      assert.equal(person.get('isError'), false);
      assert.equal(Object.keys(person.changedAttributes()).length, 0);
    });
  });
});

test("a deleted record's attributes can be rollbacked if it fails to save, record arrays are updated accordingly", function(assert) {
  assert.expect(8);
  env.adapter.deleteRecord = function(store, type, snapshot) {
    return Ember.RSVP.reject();
  };
  var person, people;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          firstName: "Tom",
          lastName: "Dale"
        }
      }
    });
    person = store.peekRecord('person', 1);
    people = store.peekAll('person');
  });

  run(function() {
    person.deleteRecord();
  });
  assert.equal(people.get('length'), 1, "a deleted record appears in record array until it is saved");
  assert.equal(people.objectAt(0), person, "a deleted record appears in record array until it is saved");

  run(function() {
    person.save().then(null, function() {
      assert.equal(person.get('isError'), true);
      assert.equal(person.get('isDeleted'), true);
      run(function() {
        person.rollbackAttributes();
      });
      assert.equal(person.get('isDeleted'), false);
      assert.equal(person.get('isError'), false);
      assert.equal(person.get('hasDirtyAttributes'), false, "must be not dirty");
    }).then(function() {
      assert.equal(people.get('length'), 1, "the underlying record array is updated accordingly in an asynchronous way");
    });
  });
});

test("new record's attributes can be rollbacked", function(assert) {
  var person;

  run(function() {
    person = store.createRecord('person', { id: 1 });
  });

  assert.equal(person.get('isNew'), true, "must be new");
  assert.equal(person.get('hasDirtyAttributes'), true, "must be dirty");

  Ember.run(person, 'rollbackAttributes');

  assert.equal(person.get('isNew'), false, "must not be new");
  assert.equal(person.get('hasDirtyAttributes'), false, "must not be dirty");
  assert.equal(person.get('isDeleted'), true, "must be deleted");
});

test("invalid new record's attributes can be rollbacked", function(assert) {
  var person;
  var error = new DS.InvalidError([
    {
      detail: 'is invalid',
      source: { pointer: 'data/attributes/name' }
    }
  ]);

  var adapter;
  if (isEnabled('ds-improved-ajax')) {
    adapter = DS.RESTAdapter.extend({
      _makeRequest() {
        return Ember.RSVP.reject(error);
      }
    });
  } else {
    adapter = DS.RESTAdapter.extend({
      ajax(url, type, hash) {
        return Ember.RSVP.reject(error);
      }
    });
  }

  env = setupStore({ person: Person, adapter: adapter });

  run(function() {
    person = env.store.createRecord('person', { id: 1 });
  });

  assert.equal(person.get('isNew'), true, "must be new");
  assert.equal(person.get('hasDirtyAttributes'), true, "must be dirty");

  run(function() {
    person.save().then(null, assert.wait(function() {
      assert.equal(person.get('isValid'), false);
      person.rollbackAttributes();

      assert.equal(person.get('isNew'), false, "must not be new");
      assert.equal(person.get('hasDirtyAttributes'), false, "must not be dirty");
      assert.equal(person.get('isDeleted'), true, "must be deleted");
    }));
  });
});

test("invalid record's attributes can be rollbacked after multiple failed calls - #3677", function(assert) {
  var person;

  var adapter;
  if (isEnabled('ds-improved-ajax')) {
    adapter = DS.RESTAdapter.extend({
      _makeRequest() {
        var error = new DS.InvalidError();
        return Ember.RSVP.reject(error);
      }
    });
  } else {
    adapter = DS.RESTAdapter.extend({
      ajax(url, type, hash) {
        var error = new DS.InvalidError();
        return Ember.RSVP.reject(error);
      }
    });
  }

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
    assert.equal(person.get('firstName'), 'updated name', "precondition: firstName is changed");

    person.save().then(null, assert.wait(function() {
      assert.equal(person.get('hasDirtyAttributes'), true, "has dirty attributes");
      assert.equal(person.get('firstName'), 'updated name', "firstName is still changed");

      return person.save();
    })).then(null, assert.wait(function() {
      person.rollbackAttributes();

      assert.equal(person.get('hasDirtyAttributes'), false, "has no dirty attributes");
      assert.equal(person.get('firstName'), 'original name', "after rollbackAttributes() firstName has the original value");
    }));
  });
});

test("deleted record's attributes can be rollbacked", function(assert) {
  var person, people;

  run(function() {
    store.push({
      data: {
        type: 'person',
        id: '1'
      }
    });
    person = store.peekRecord('person', 1);
    people = store.peekAll('person');
    person.deleteRecord();
  });

  assert.equal(people.get('length'), 1, "a deleted record appears in the record array until it is saved");
  assert.equal(people.objectAt(0), person, "a deleted record appears in the record array until it is saved");

  assert.equal(person.get('isDeleted'), true, "must be deleted");

  run(function() {
    person.rollbackAttributes();
  });
  assert.equal(people.get('length'), 1, "the rollbacked record should appear again in the record array");
  assert.equal(person.get('isDeleted'), false, "must not be deleted");
  assert.equal(person.get('hasDirtyAttributes'), false, "must not be dirty");
});

test("invalid record's attributes can be rollbacked", function(assert) {
  assert.expect(10);
  Dog = DS.Model.extend({
    name: DS.attr()
  });

  var error = new DS.InvalidError([
    {
      detail: 'is invalid',
      source: { pointer: 'data/attributes/name' }
    }
  ]);

  var adapter;
  if (isEnabled('ds-improved-ajax')) {
    adapter = DS.RESTAdapter.extend({
      _makeRequest() {
        return Ember.RSVP.reject(error);
      }
    });
  } else {
    adapter = DS.RESTAdapter.extend({
      ajax(url, type, hash) {
        return Ember.RSVP.reject(error);
      }
    });
  }


  env = setupStore({ dog: Dog, adapter: adapter });
  var dog;
  run(function() {
    env.store.push({
      data: {
        type: 'dog',
        id: '1',
        attributes: {
          name: "Pluto"
        }
      }
    });
    dog = env.store.peekRecord('dog', 1);
    dog.set('name', "is a dwarf planet");
  });

  run(function() {
    Ember.addObserver(dog, 'errors.name', function() {
      assert.ok(true, 'errors.name did change');
    });

    dog.get('errors').addArrayObserver({}, {
      willChange() {
        assert.ok(true, 'errors will change');
      },
      didChange() {
        assert.ok(true, 'errors did change');
      }
    });

    dog.save().then(null, assert.wait(function() {
      dog.rollbackAttributes();

      assert.equal(dog.get('hasDirtyAttributes'), false, "must not be dirty");
      assert.equal(dog.get('name'), "Pluto");
      assert.ok(Ember.isEmpty(dog.get('errors.name')));
      assert.ok(dog.get('isValid'));
    }));
  });
});

test("invalid record's attributes rolled back to correct state after set", function(assert) {
  assert.expect(13);
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

  var adapter;
  if (isEnabled('ds-improved-ajax')) {
    adapter = DS.RESTAdapter.extend({
      _makeRequest() {
        return Ember.RSVP.reject(error);
      }
    });
  } else {
    adapter = DS.RESTAdapter.extend({
      ajax(url, type, hash) {
        return Ember.RSVP.reject(error);
      }
    });
  }

  env = setupStore({ dog: Dog, adapter: adapter });
  var dog;
  run(function() {
    env.store.push({
      data: {
        type: 'dog',
        id: '1',
        attributes: {
          name: "Pluto",
          breed: "Disney"
        }
      }
    });
    dog = env.store.peekRecord('dog', 1);
    dog.set('name', "is a dwarf planet");
    dog.set('breed', 'planet');
  });

  run(function() {
    Ember.addObserver(dog, 'errors.name', function() {
      assert.ok(true, 'errors.name did change');
    });

    dog.save().then(null, assert.wait(function() {
      assert.equal(dog.get('name'), "is a dwarf planet");
      assert.equal(dog.get('breed'), "planet");
      assert.ok(Ember.isPresent(dog.get('errors.name')));
      assert.equal(dog.get('errors.name.length'), 1);

      run(function() {
        dog.set('name', 'Seymour Asses');
      });

      assert.equal(dog.get('name'), "Seymour Asses");
      assert.equal(dog.get('breed'), "planet");

      run(function() {
        dog.rollbackAttributes();
      });

      assert.equal(dog.get('name'), "Pluto");
      assert.equal(dog.get('breed'), "Disney");
      assert.equal(dog.get('hasDirtyAttributes'), false, "must not be dirty");
      assert.ok(Ember.isEmpty(dog.get('errors.name')));
      assert.ok(dog.get('isValid'));
    }));
  });
});

test("when destroying a record setup the record state to invalid, the record's attributes can be rollbacked", function(assert) {
  Dog = DS.Model.extend({
    name: DS.attr()
  });

  var error = new DS.InvalidError([
    {
      detail: 'is invalid',
      source: { pointer: 'data/attributes/name' }
    }
  ]);

  var adapter;
  if (isEnabled('ds-improved-ajax')) {
    adapter = DS.RESTAdapter.extend({
      _makeRequest() {
        return Ember.RSVP.reject(error);
      }
    });
  } else {
    adapter = DS.RESTAdapter.extend({
      ajax(url, type, hash) {
        return Ember.RSVP.reject(error);
      }
    });
  }

  env = setupStore({ dog: Dog, adapter: adapter });
  var dog;
  run(function() {
    env.store.push({
      data: {
        type: 'dog',
        id: '1',
        attributes: {
          name: "Pluto"
        }
      }
    });
    dog = env.store.peekRecord('dog', 1);
  });

  run(function() {
    dog.destroyRecord().then(null, assert.wait(function() {


      assert.equal(dog.get('isError'), false, "must not be error");
      assert.equal(dog.get('isDeleted'), true, "must be deleted");
      assert.equal(dog.get('isValid'), false, "must not be valid");
      assert.ok(dog.get('errors.length') > 0, "must have errors");

      dog.rollbackAttributes();

      assert.equal(dog.get('isError'), false, "must not be error after `rollbackAttributes`");
      assert.equal(dog.get('isDeleted'), false, "must not be deleted after `rollbackAttributes`");
      assert.equal(dog.get('isValid'), true, "must be valid after `rollbackAttributes`");
      assert.ok(dog.get('errors.length') === 0, "must not have errors");
    }));
  });
});
