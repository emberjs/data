import { resolve, reject } from 'rsvp';
import { get } from '@ember/object';
import { run } from '@ember/runloop';
import { createStore } from 'dummy/tests/helpers/store';

import { module, test } from 'qunit';

import DS from 'ember-data';

module('unit/model/lifecycle_callbacks - Lifecycle Callbacks');

test('a record receives a didLoad callback when it has finished loading', function(assert) {
  assert.expect(3);

  const Person = DS.Model.extend({
    name: DS.attr(),
    didLoad() {
      assert.ok('The didLoad callback was called');
    }
  });

  const Adapter = DS.Adapter.extend({
    findRecord(store, type, id, snapshot) {
      return { data: { id: 1, type: 'person', attributes: { name: 'Foo' } } };
    }
  });

  let store = createStore({
    adapter: Adapter,
    person: Person
  });

  return run(() => {
    return store.findRecord('person', 1).then(person => {
      assert.equal(person.get('id'), '1', `The person's ID is available`);
      assert.equal(person.get('name'), 'Foo', `The person's properties are availablez`);
    });
  });
});

test(`TEMPORARY: a record receives a didLoad callback once it materializes if it wasn't materialized when loaded`, function(assert) {
  assert.expect(2);
  let didLoadCalled = 0;
  const Person = DS.Model.extend({
    name: DS.attr(),
    didLoad() {
      didLoadCalled++;
    }
  });

  let store = createStore({
    person: Person
  });

  run(() => {
    store._pushInternalModel({ id: 1, type: 'person' });
    assert.equal(didLoadCalled, 0, "didLoad was not called");
  });
  run(() => store.peekRecord('person', 1));
  assert.equal(didLoadCalled, 1, "didLoad was called");
});

test('a record receives a didUpdate callback when it has finished updating', function(assert) {
  assert.expect(5);

  let callCount = 0;

  const Person = DS.Model.extend({
    bar: DS.attr('string'),
    name: DS.attr('string'),

    didUpdate() {
      callCount++;
      assert.equal(get(this, 'isSaving'), false, 'record should be saving');
      assert.equal(get(this, 'hasDirtyAttributes'), false, 'record should not be dirty');
    }
  });

  const Adapter = DS.Adapter.extend({
    findRecord(store, type, id, snapshot) {
      return { data: { id: 1, type: 'person', attributes: { name: 'Foo' } } };
    },

    updateRecord(store, type, snapshot) {
      assert.equal(callCount, 0, 'didUpdate callback was not called until didSaveRecord is called');

      return resolve();
    }
  });

  let store = createStore({
    adapter: Adapter,
    person: Person
  });

  let asyncPerson = run(() => store.findRecord('person', 1));

  assert.equal(callCount, 0, 'precond - didUpdate callback was not called yet');

  return run(() => {
    return asyncPerson.then(person => {
      return run(() => {
        person.set('bar', "Bar");
        return person.save();
      });
    }).then(() => {
      assert.equal(callCount, 1, 'didUpdate called after update');
    });
  });
});

test('a record receives a didCreate callback when it has finished updating', function(assert) {
  assert.expect(5);

  let callCount = 0;

  const Person = DS.Model.extend({
    didCreate() {
      callCount++;
      assert.equal(get(this, 'isSaving'), false, 'record should not be saving');
      assert.equal(get(this, 'hasDirtyAttributes'), false, 'record should not be dirty');
    }
  });

  const Adapter = DS.Adapter.extend({
    createRecord(store, type, snapshot) {
      assert.equal(callCount, 0, 'didCreate callback was not called until didSaveRecord is called');

      return resolve();
    }
  });

  let store = createStore({
    adapter: Adapter,
    person: Person
  });

  assert.equal(callCount, 0, 'precond - didCreate callback was not called yet');
  let person = run(() => store.createRecord('person', { id: 69, name: 'Newt Gingrich' }));


  return run(() => {
    return person.save().then(() => {
      assert.equal(callCount, 1, 'didCreate called after commit');
    });
  });
});

test('a record receives a didDelete callback when it has finished deleting', function(assert) {
  assert.expect(5);

  let callCount = 0;

  const Person = DS.Model.extend({
    bar: DS.attr('string'),
    name: DS.attr('string'),

    didDelete() {
      callCount++;

      assert.equal(get(this, 'isSaving'), false, 'record should not be saving');
      assert.equal(get(this, 'hasDirtyAttributes'), false, 'record should not be dirty');
    }
  });

  const Adapter = DS.Adapter.extend({
    findRecord(store, type, id, snapshot) {
      return { data: { id: 1, type: 'person', attributes: { name: 'Foo' } } };
    },

    deleteRecord(store, type, snapshot) {
      assert.equal(callCount, 0, 'didDelete callback was not called until didSaveRecord is called');

      return resolve();
    }
  });

  let store = createStore({
    adapter: Adapter,
    person: Person
  });
  let asyncPerson = run(() => store.findRecord('person', 1));

  assert.equal(callCount, 0, 'precond - didDelete callback was not called yet');

  return run(() => {
    return asyncPerson.then(person => {
      return run(() => {
        person.deleteRecord();
        return person.save();
      });
    }).then(() => {
      assert.equal(callCount, 1, 'didDelete called after delete');
    });
  });
});

test('an uncommited record also receives a didDelete callback when it is deleted', function(assert) {
  assert.expect(4);

  let callCount = 0;

  const Person = DS.Model.extend({
    bar: DS.attr('string'),
    name: DS.attr('string'),

    didDelete() {
      callCount++;
      assert.equal(get(this, 'isSaving'), false, 'record should not be saving');
      assert.equal(get(this, 'hasDirtyAttributes'), false, 'record should not be dirty');
    }
  });

  let store = createStore({
    adapter: DS.Adapter.extend(),
    person: Person
  });

  let person = run(() => store.createRecord('person', { name: 'Tomster' }));

  assert.equal(callCount, 0, 'precond - didDelete callback was not called yet');

  run(() => person.deleteRecord());

  assert.equal(callCount, 1, 'didDelete called after delete');
});

test('a record receives a becameInvalid callback when it became invalid', function(assert) {
  assert.expect(8);

  let callCount = 0;

  const Person = DS.Model.extend({
    bar: DS.attr('string'),
    name: DS.attr('string'),

    becameInvalid() {
      callCount++;

      assert.equal(get(this, 'isSaving'), false, 'record should not be saving');
      assert.equal(get(this, 'hasDirtyAttributes'), true, 'record should be dirty');
    }
  });

  const Adapter = DS.Adapter.extend({
    findRecord(store, type, id, snapshot) {
      return { data: { id: 1, type: 'person', attributes: { name: 'Foo' } } };
    },

    updateRecord(store, type, snapshot) {
      assert.equal(callCount, 0, 'becameInvalid callback was not called until recordWasInvalid is called');

      return reject(new DS.InvalidError([
        {
          title: 'Invalid Attribute',
          detail: 'error',
          source: {
            pointer: '/data/attributes/bar'
          }
        }
      ]));
    }
  });

  let store = createStore({
    adapter: Adapter,
    person: Person
  });

  let asyncPerson = run(() => store.findRecord('person', 1));
  assert.equal(callCount, 0, 'precond - becameInvalid callback was not called yet');

  // Make sure that the error handler has a chance to attach before
  // save fails.
  return run(() => {
    return asyncPerson.then(person => {
      return run(() => {
        person.set('bar', 'Bar');
        return person.save();
      });
    }).catch(reason => {
      assert.ok(reason.isAdapterError, 'reason should have been an adapter error');
      assert.equal(reason.errors.length, 1, 'reason should have one error');
      assert.equal(reason.errors[0].title, 'Invalid Attribute');
      assert.equal(callCount, 1, 'becameInvalid called after invalidating');
    });
  });
});

test('an ID of 0 is allowed', function(assert) {
  const Person = DS.Model.extend({
    name: DS.attr('string')
  });

  let store = createStore({
    person: Person
  });

  run(() => {
    store.push({
      data: {
        type: 'person',
        id: '0',
        attributes: {
          name: 'Tom Dale'
        }
      }
    });
  });

  assert.equal(store.peekAll('person').objectAt(0).get('name'), 'Tom Dale', 'found record with id 0');
});
