import { next, run } from '@ember/runloop';

import { module, test } from 'qunit';
import { Promise as EmberPromise, reject, resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import { InvalidError } from '@ember-data/adapter/error';
import Model, { attr } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

module('unit/model/merge - Merging', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const Person = Model.extend({
      name: attr(),
      city: attr(),
    });

    this.owner.register('model:person', Person);
    this.owner.register('serializer:application', class extends JSONAPISerializer {});

    this.store = this.owner.lookup('service:store');
  });

  test('When a record is in flight, changes can be made', function (assert) {
    assert.expect(3);

    const ApplicationAdapter = Adapter.extend({
      createRecord(store, type, snapshot) {
        return { data: { id: '1', type: 'person', attributes: { name: 'Tom Dale' } } };
      },
    });

    this.owner.register('adapter:application', ApplicationAdapter);

    let person = this.store.createRecord('person', { name: 'Tom Dale' });

    // Make sure saving isn't resolved synchronously
    return run(() => {
      let save = person.save();

      assert.strictEqual(person.name, 'Tom Dale');

      person.set('name', 'Thomas Dale');

      return save.then((person) => {
        assert.true(person.hasDirtyAttributes, 'The person is still dirty');
        assert.strictEqual(person.name, 'Thomas Dale', 'The changes made still apply');
      });
    });
  });

  test('Make sure snapshot is created at save time not at flush time', function (assert) {
    assert.expect(5);

    const ApplicationAdapter = Adapter.extend({
      updateRecord(store, type, snapshot) {
        assert.strictEqual(snapshot.attr('name'), 'Thomas Dale');

        return resolve();
      },
    });

    this.owner.register('adapter:application', ApplicationAdapter);

    let person;
    run(() => {
      person = this.store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Tom',
          },
        },
      });
      person.set('name', 'Thomas Dale');
    });

    return run(() => {
      let promise = person.save();

      assert.strictEqual(person.name, 'Thomas Dale');

      person.set('name', 'Tomasz Dale');

      assert.strictEqual(person.name, 'Tomasz Dale', 'the local changes applied on top');

      return promise.then((person) => {
        assert.true(person.hasDirtyAttributes, 'The person is still dirty');
        assert.strictEqual(person.name, 'Tomasz Dale', 'The local changes apply');
      });
    });
  });

  test('When a record is in flight, pushes are applied underneath the in flight changes', function (assert) {
    assert.expect(6);

    const ApplicationAdapter = Adapter.extend({
      updateRecord(store, type, snapshot) {
        // Make sure saving isn't resolved synchronously
        return new EmberPromise((resolve) => {
          next(null, resolve, {
            data: {
              id: '1',
              type: 'person',
              attributes: { name: 'Senor Thomas Dale, Esq.', city: 'Portland' },
            },
          });
        });
      },
    });

    this.owner.register('adapter:application', ApplicationAdapter);

    let person;

    run(() => {
      person = this.store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Tom',
          },
        },
      });
      person.set('name', 'Thomas Dale');
    });

    return run(() => {
      var promise = person.save();

      assert.strictEqual(person.name, 'Thomas Dale');

      person.set('name', 'Tomasz Dale');

      this.store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Tommy Dale',
            city: 'PDX',
          },
        },
      });

      assert.strictEqual(person.name, 'Tomasz Dale', 'the local changes applied on top');
      assert.strictEqual(person.city, 'PDX', 'the pushed change is available');

      return promise.then((person) => {
        assert.true(person.hasDirtyAttributes, 'The person is still dirty');
        assert.strictEqual(person.name, 'Tomasz Dale', 'The local changes apply');
        assert.strictEqual(person.city, 'Portland', 'The updates from the server apply on top of the previous pushes');
      });
    });
  });

  test('When a record is dirty, pushes are overridden by local changes', function (assert) {
    let person;

    run(() => {
      person = this.store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Tom Dale',
            city: 'San Francisco',
          },
        },
      });
      person.set('name', 'Tomasz Dale');
    });

    assert.true(person.hasDirtyAttributes, 'the person is currently dirty');
    assert.strictEqual(person.name, 'Tomasz Dale', 'the update was effective');
    assert.strictEqual(person.city, 'San Francisco', 'the original data applies');

    run(() => {
      this.store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Thomas Dale',
            city: 'Portland',
          },
        },
      });
    });

    assert.true(person.hasDirtyAttributes, 'the local changes are reapplied');
    assert.strictEqual(person.name, 'Tomasz Dale', 'the local changes are reapplied');
    assert.strictEqual(person.city, 'Portland', 'if there are no local changes, the new data applied');
  });

  test('When a record is invalid, pushes are overridden by local changes', async function (assert) {
    const ApplicationAdapter = Adapter.extend({
      updateRecord() {
        return reject(new InvalidError());
      },
    });

    this.owner.register('adapter:application', ApplicationAdapter);

    let person;

    run(() => {
      person = this.store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Brendan McLoughlin',
            city: 'Boston',
          },
        },
      });
    });

    person.set('name', 'Brondan McLoughlin');

    try {
      await person.save();
      assert.ok(false, 'We should throw during save');
    } catch (e) {
      assert.ok(true, 'We rejected the save');
    }
    assert.false(person.isValid, 'the person is currently invalid');
    assert.true(person.hasDirtyAttributes, 'the person is currently dirty');
    assert.strictEqual(person.name, 'Brondan McLoughlin', 'the update was effective');
    assert.strictEqual(person.city, 'Boston', 'the original data applies');

    run(() => {
      this.store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'bmac',
            city: 'Prague',
          },
        },
      });
    });

    assert.true(person.hasDirtyAttributes, 'the local changes are reapplied');
    assert.false(person.isValid, 'record is still invalid');
    assert.strictEqual(person.name, 'Brondan McLoughlin', 'the local changes are reapplied');
    assert.strictEqual(person.city, 'Prague', 'if there are no local changes, the new data applied');
  });

  test('A record with no changes can still be saved', function (assert) {
    assert.expect(1);

    const ApplicationAdapter = Adapter.extend({
      updateRecord(store, type, snapshot) {
        return { data: { id: '1', type: 'person', attributes: { name: 'Thomas Dale' } } };
      },
    });

    this.owner.register('adapter:application', ApplicationAdapter);

    let person = run(() => {
      return this.store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Tom Dale',
          },
        },
      });
    });

    return run(() => {
      return person.save().then((foo) => {
        assert.strictEqual(person.name, 'Thomas Dale', 'the updates occurred');
      });
    });
  });

  test('A dirty record can be reloaded', function (assert) {
    assert.expect(3);

    const ApplicationAdapter = Adapter.extend({
      findRecord(store, type, id, snapshot) {
        return {
          data: { id: '1', type: 'person', attributes: { name: 'Thomas Dale', city: 'Portland' } },
        };
      },
    });

    this.owner.register('adapter:application', ApplicationAdapter);

    let person;

    run(() => {
      person = this.store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Tom Dale',
          },
        },
      });
      person.set('name', 'Tomasz Dale');
    });

    return run(() => {
      return person.reload().then(() => {
        assert.true(person.hasDirtyAttributes, 'the person is dirty');
        assert.strictEqual(person.name, 'Tomasz Dale', 'the local changes remain');
        assert.strictEqual(person.city, 'Portland', 'the new changes apply');
      });
    });
  });
});
