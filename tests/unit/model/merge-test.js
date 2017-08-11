import { resolve, Promise as EmberPromise } from 'rsvp';
import { run } from '@ember/runloop';
import { createStore } from 'dummy/tests/helpers/store';

import { module, test } from 'qunit';

import DS from 'ember-data';

let Person;

module('unit/model/merge - Merging', {
  beforeEach() {
    Person = DS.Model.extend({
      name: DS.attr(),
      city: DS.attr()
    });
  }
});

test('When a record is in flight, changes can be made', function(assert) {
  assert.expect(3);

  const Adapter = DS.Adapter.extend({
    createRecord(store, type, snapshot) {
      return { data: { id: 1, type: 'person', attributes: { name: 'Tom Dale' } } };
    }
  });

  let store = createStore({
    adapter: Adapter,
    person: Person
  });

  let person = run(() => store.createRecord('person', { name: 'Tom Dale' }));

  // Make sure saving isn't resolved synchronously
  return run(() => {
    let save = person.save();

    assert.equal(person.get('name'), 'Tom Dale');

    person.set('name', 'Thomas Dale');

    return save.then(person => {
      assert.equal(person.get('hasDirtyAttributes'), true, 'The person is still dirty');
      assert.equal(person.get('name'), 'Thomas Dale', 'The changes made still apply');
    });
  });
});

test('Make sure snapshot is created at save time not at flush time', function(assert) {
  assert.expect(5);

  const Adapter = DS.Adapter.extend({
    updateRecord(store, type, snapshot) {
      assert.equal(snapshot.attr('name'), 'Thomas Dale');

      return resolve();
    }
  });

  let store = createStore({ adapter: Adapter, person: Person });

  let person;
  run(() => {
    person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: "Tom"
        }
      }
    });
    person.set('name', 'Thomas Dale');
  });

  return run(() => {
    let promise = person.save();

    assert.equal(person.get('name'), 'Thomas Dale');

    person.set('name', 'Tomasz Dale');

    assert.equal(person.get('name'), 'Tomasz Dale', 'the local changes applied on top');

    return promise.then(person => {
      assert.equal(person.get('hasDirtyAttributes'), true, 'The person is still dirty');
      assert.equal(person.get('name'), "Tomasz Dale", 'The local changes apply');
    });
  });
});

test("When a record is in flight, pushes are applied underneath the in flight changes", function(assert) {
  assert.expect(6);

  const Adapter = DS.Adapter.extend({
    updateRecord(store, type, snapshot) {
      // Make sure saving isn't resolved synchronously
      return new EmberPromise(resolve =>  {
        run.next(null, resolve, { data: { id: 1, type: 'person', attributes: { name: 'Senor Thomas Dale, Esq.', city: 'Portland' } } });
      });
    }
  });

  let store = createStore({
    adapter: Adapter,
    person: Person
  });
  let person;

  run(() => {
    person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: "Tom"
        }
      }
    });
    person.set('name', 'Thomas Dale');
  });

  return run(() => {
    var promise = person.save();

    assert.equal(person.get('name'), 'Thomas Dale');

    person.set('name', 'Tomasz Dale');

    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: "Tommy Dale",
          city: "PDX"
        }
      }
    });

    assert.equal(person.get('name'), 'Tomasz Dale', 'the local changes applied on top');
    assert.equal(person.get('city'), 'PDX', 'the pushed change is available');

    return promise.then(person => {
      assert.equal(person.get('hasDirtyAttributes'), true, 'The person is still dirty');
      assert.equal(person.get('name'), 'Tomasz Dale', 'The local changes apply');
      assert.equal(person.get('city'), 'Portland', 'The updates from the server apply on top of the previous pushes');
    });
  });
});

test('When a record is dirty, pushes are overridden by local changes', function(assert) {
  let store = createStore({
    adapter: DS.Adapter,
    person: Person
  });
  let person;

  run(() => {
    person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale',
          city: 'San Francisco'
        }
      }
    });
    person.set('name', 'Tomasz Dale');
  });

  assert.equal(person.get('hasDirtyAttributes'), true, 'the person is currently dirty');
  assert.equal(person.get('name'), 'Tomasz Dale', 'the update was effective');
  assert.equal(person.get('city'), 'San Francisco', 'the original data applies');

  run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: "Thomas Dale",
          city: "Portland"
        }
      }
    });
  });

  assert.equal(person.get('hasDirtyAttributes'), true, 'the local changes are reapplied');
  assert.equal(person.get('name'), 'Tomasz Dale', 'the local changes are reapplied');
  assert.equal(person.get('city'), 'Portland', 'if there are no local changes, the new data applied');
});

test('When a record is invalid, pushes are overridden by local changes', function(assert) {
  let store = createStore({
    adapter: DS.Adapter,
    person: Person
  });
  let person;

  run(() => {
    person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Brendan McLoughlin',
          city: 'Boston'
        }
      }
    });
    person.set('name', 'Brondan McLoughlin');
    person.send('becameInvalid');
  });

  assert.equal(person.get('hasDirtyAttributes'), true, 'the person is currently dirty');
  assert.equal(person.get('isValid'), false, 'the person is currently invalid');
  assert.equal(person.get('name'), 'Brondan McLoughlin', 'the update was effective');
  assert.equal(person.get('city'), 'Boston', 'the original data applies');

  run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'bmac',
          city: 'Prague'
        }
      }
    });
  });

  assert.equal(person.get('hasDirtyAttributes'), true, 'the local changes are reapplied');
  assert.equal(person.get('isValid'), false, 'record is still invalid');
  assert.equal(person.get('name'), 'Brondan McLoughlin', 'the local changes are reapplied');
  assert.equal(person.get('city'), 'Prague', 'if there are no local changes, the new data applied');
});

test('A record with no changes can still be saved', function(assert) {
  assert.expect(1);

  const Adapter = DS.Adapter.extend({
    updateRecord(store, type, snapshot) {
      return { data: { id: 1, type: 'person', attributes: { name: 'Thomas Dale' } } };
    }
  });

  let store = createStore({
    adapter: Adapter,
    person: Person
  });
  let person = run(() => {
    return store.push({
      data: {
        type: 'person',
        id: '1',
        attributeS: {
          name: 'Tom Dale'
        }
      }
    });
  });

  return run(() => {
    return person.save().then(() => {
      assert.equal(person.get('name'), 'Thomas Dale', 'the updates occurred');
    });
  });
});

test('A dirty record can be reloaded', function(assert) {
  assert.expect(3);

  const Adapter = DS.Adapter.extend({
    findRecord(store, type, id, snapshot) {
      return { data: { id: 1, type: 'person', attributes: { name: 'Thomas Dale', city: 'Portland' } } };
    }
  });

  let store = createStore({
    adapter: Adapter,
    person: Person
  });

  let person;

  run(() => {
    person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale'
        }
      }
    });
    person.set('name', 'Tomasz Dale');
  });

  return run(() => {
    return person.reload().then(() => {
      assert.equal(person.get('hasDirtyAttributes'), true, 'the person is dirty');
      assert.equal(person.get('name'), "Tomasz Dale", 'the local changes remain');
      assert.equal(person.get('city'), "Portland", 'the new changes apply');
    });
  });
});
