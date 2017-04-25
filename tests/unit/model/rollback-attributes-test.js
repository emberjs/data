import setupStore from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';
import { isEnabled } from 'ember-data/-private';

let env, store, Person;
const { run  } = Ember;

module('unit/model/rollbackAttributes - model.rollbackAttributes()', {
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

test('changes to attributes can be rolled back', function(assert) {
  let person = run(() => {
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
    return person;
  });

  assert.equal(person.get('firstName'), "Thomas");

  run(() => person.rollbackAttributes());

  assert.equal(person.get('firstName'), "Tom");
  assert.equal(person.get('hasDirtyAttributes'), false);
});

test('changes to unassigned attributes can be rolled back', function(assert) {
  let person = run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          lastName: 'Dale'
        }
      }
    });
    person = store.peekRecord('person', 1);
    person.set('firstName', "Thomas");

    return person;
  });

  assert.equal(person.get('firstName'), "Thomas");

  run(() => person.rollbackAttributes());

  assert.equal(person.get('firstName'), undefined);
  assert.equal(person.get('hasDirtyAttributes'), false);
});

test('changes to attributes made after a record is in-flight only rolls back the local changes', function(assert) {
  env.adapter.updateRecord = function(store, type, snapshot) {
    // Make sure the save is async
    return new Ember.RSVP.Promise(resolve => Ember.run.later(null, resolve, 15));
  };

  let person = run(() => {
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

    let person = store.peekRecord('person', 1);
    person.set('firstName', "Thomas");

    return person;
  });

  return run(() => {
    let saving = person.save();

    assert.equal(person.get('firstName'), "Thomas");

    person.set('lastName', "Dolly");

    assert.equal(person.get('lastName'), "Dolly");

    person.rollbackAttributes();

    assert.equal(person.get('firstName'), "Thomas");
    assert.equal(person.get('lastName'), "Dale");
    assert.equal(person.get('isSaving'), true);

    return saving.then(() => {
      assert.equal(person.get('hasDirtyAttributes'), false, 'The person is now clean');
    });
  });
});

test("a record's changes can be made if it fails to save", function(assert) {
  env.adapter.updateRecord = function(store, type, snapshot) {
    return Ember.RSVP.reject();
  };

  let person = run(() => {
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

    let person = store.peekRecord('person', 1);
    person.set('firstName', "Thomas");

    return person;
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

test(`a deleted record's attributes can be rollbacked if it fails to save, record arrays are updated accordingly`, function(assert) {
  assert.expect(8);
  env.adapter.deleteRecord = function(store, type, snapshot) {
    return Ember.RSVP.reject();
  };

  let person, people;

  run(() => {
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

  run(() => person.deleteRecord());

  assert.equal(people.get('length'), 1, 'a deleted record appears in record array until it is saved');
  assert.equal(people.objectAt(0), person, 'a deleted record appears in record array until it is saved');

  return run(() => {
    return person.save().catch(() => {
      assert.equal(person.get('isError'), true);
      assert.equal(person.get('isDeleted'), true);
      run(() => person.rollbackAttributes());
      assert.equal(person.get('isDeleted'), false);
      assert.equal(person.get('isError'), false);
      assert.equal(person.get('hasDirtyAttributes'), false, 'must be not dirty');
    }).then(() => {
      assert.equal(people.get('length'), 1, 'the underlying record array is updated accordingly in an asynchronous way');
    });
  });
});

test(`new record's attributes can be rollbacked`, function(assert) {
  let person = run(() => store.createRecord('person', { id: 1 }));

  assert.equal(person.get('isNew'), true, 'must be new');
  assert.equal(person.get('hasDirtyAttributes'), true, 'must be dirty');

  Ember.run(person, 'rollbackAttributes');

  assert.equal(person.get('isNew'), false, 'must not be new');
  assert.equal(person.get('hasDirtyAttributes'), false, 'must not be dirty');
  assert.equal(person.get('isDeleted'), true, 'must be deleted');
});

test(`invalid new record's attributes can be rollbacked`, function(assert) {
  let error = new DS.InvalidError([
    {
      detail: 'is invalid',
      source: { pointer: 'data/attributes/name' }
    }
  ]);

  let adapter;
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

  let person = run(() => env.store.createRecord('person', { id: 1 }));

  assert.equal(person.get('isNew'), true, 'must be new');
  assert.equal(person.get('hasDirtyAttributes'), true, 'must be dirty');

  return run(() => {
    return person.save().catch(reason => {
      assert.equal(error, reason);
      assert.equal(person.get('isValid'), false);
      person.rollbackAttributes();

      assert.equal(person.get('isNew'), false, 'must not be new');
      assert.equal(person.get('hasDirtyAttributes'), false, 'must not be dirty');
      assert.equal(person.get('isDeleted'), true, 'must be deleted');
    });
  });
});

test(`invalid record's attributes can be rollbacked after multiple failed calls - #3677`, function(assert) {

  let adapter;
  if (isEnabled('ds-improved-ajax')) {
    adapter = DS.RESTAdapter.extend({
      _makeRequest() {
        let error = new DS.InvalidError();
        return Ember.RSVP.reject(error);
      }
    });
  } else {
    adapter = DS.RESTAdapter.extend({
      ajax(url, type, hash) {
        let error = new DS.InvalidError();
        return Ember.RSVP.reject(error);
      }
    });
  }

  env = setupStore({ person: Person, adapter: adapter });

  let person;
  run(() => {
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

  return run(() => {
    assert.equal(person.get('firstName'), 'updated name', 'precondition: firstName is changed');

    return person.save().catch(() => {
      assert.equal(person.get('hasDirtyAttributes'), true, 'has dirty attributes');
      assert.equal(person.get('firstName'), 'updated name', 'firstName is still changed');

      return person.save();
    }).catch(() => {
      person.rollbackAttributes();

      assert.equal(person.get('hasDirtyAttributes'), false, 'has no dirty attributes');
      assert.equal(person.get('firstName'), 'original name', 'after rollbackAttributes() firstName has the original value');
    });
  });
});

test(`deleted record's attributes can be rollbacked`, function(assert) {
  let person, people;

  run(() => {
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

  assert.equal(people.get('length'), 1, 'a deleted record appears in the record array until it is saved');
  assert.equal(people.objectAt(0), person, 'a deleted record appears in the record array until it is saved');

  assert.equal(person.get('isDeleted'), true, 'must be deleted');

  run(() => person.rollbackAttributes());

  assert.equal(people.get('length'), 1, 'the rollbacked record should appear again in the record array');
  assert.equal(person.get('isDeleted'), false, 'must not be deleted');
  assert.equal(person.get('hasDirtyAttributes'), false, 'must not be dirty');
});

test("invalid record's attributes can be rollbacked", function(assert) {
  assert.expect(11);
  const Dog = DS.Model.extend({
    name: DS.attr()
  });

  let error = new DS.InvalidError([
    {
      detail: 'is invalid',
      source: { pointer: 'data/attributes/name' }
    }
  ]);

  let adapter;
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
  let dog;
  run(() => {
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

  return run(() => {
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

    return dog.save().catch(reason => {
      assert.equal(reason, error);

      dog.rollbackAttributes();

      assert.equal(dog.get('hasDirtyAttributes'), false, 'must not be dirty');
      assert.equal(dog.get('name'), 'Pluto');
      assert.ok(Ember.isEmpty(dog.get('errors.name')));
      assert.ok(dog.get('isValid'));
    });
  });
});

test(`invalid record's attributes rolled back to correct state after set`, function(assert) {
  assert.expect(14);
  const Dog = DS.Model.extend({
    name: DS.attr(),
    breed: DS.attr()
  });

  let error = new DS.InvalidError([
    {
      detail: 'is invalid',
      source: { pointer: 'data/attributes/name' }
    }
  ]);

  let adapter;
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
  let dog;
  run(() => {
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

  return run(() => {
    Ember.addObserver(dog, 'errors.name', function() {
      assert.ok(true, 'errors.name did change');
    });

    return dog.save().catch(reason => {
      assert.equal(reason, error);
      assert.equal(dog.get('name'), 'is a dwarf planet');
      assert.equal(dog.get('breed'), 'planet');
      assert.ok(Ember.isPresent(dog.get('errors.name')));
      assert.equal(dog.get('errors.name.length'), 1);

      run(() => dog.set('name', 'Seymour Asses'));

      assert.equal(dog.get('name'), 'Seymour Asses');
      assert.equal(dog.get('breed'), 'planet');

      run(() => dog.rollbackAttributes());

      assert.equal(dog.get('name'), 'Pluto');
      assert.equal(dog.get('breed'), 'Disney');
      assert.equal(dog.get('hasDirtyAttributes'), false, 'must not be dirty');
      assert.ok(Ember.isEmpty(dog.get('errors.name')));
      assert.ok(dog.get('isValid'));
    });
  });
});

test(`when destroying a record setup the record state to invalid, the record's attributes can be rollbacked`, function(assert) {
  const Dog = DS.Model.extend({
    name: DS.attr()
  });

  let error = new DS.InvalidError([
    {
      detail: 'is invalid',
      source: { pointer: 'data/attributes/name' }
    }
  ]);

  let adapter;
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
  let dog = run(() => {
    env.store.push({
      data: {
        type: 'dog',
        id: '1',
        attributes: {
          name: "Pluto"
        }
      }
    });
    return env.store.peekRecord('dog', 1);
  });

  return run(() => {
    return dog.destroyRecord().catch(reason  => {
      assert.equal(reason, error);

      assert.equal(dog.get('isError'), false, 'must not be error');
      assert.equal(dog.get('isDeleted'), true, 'must be deleted');
      assert.equal(dog.get('isValid'), false, 'must not be valid');
      assert.ok(dog.get('errors.length') > 0, 'must have errors');

      dog.rollbackAttributes();

      assert.equal(dog.get('isError'), false, 'must not be error after `rollbackAttributes`');
      assert.equal(dog.get('isDeleted'), false, 'must not be deleted after `rollbackAttributes`');
      assert.equal(dog.get('isValid'), true, 'must be valid after `rollbackAttributes`');
      assert.ok(dog.get('errors.length') === 0, 'must not have errors');
    })
  });
});
