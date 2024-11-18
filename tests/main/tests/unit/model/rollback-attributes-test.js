import { addObserver } from '@ember/object/observers';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import { InvalidError } from '@ember-data/adapter/error';
import RESTAdapter from '@ember-data/adapter/rest';
import Model, { attr } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import RESTSerializer from '@ember-data/serializer/rest';

module('unit/model/rollbackAttributes - model.rollbackAttributes()', function (hooks) {
  setupTest(hooks);

  module('rolledBack hook', function (hooks) {
    hooks.beforeEach(function () {
      const Person = Model.extend({
        firstName: attr(),
        lastName: attr(),
      });

      this.owner.register('model:person', Person);
      this.owner.register('adapter:application', Adapter.extend());
      this.owner.register('serializer:application', class extends JSONAPISerializer {});
    });

    test('changes to attributes can be rolled back', function (assert) {
      const store = this.owner.lookup('service:store');
      const person = store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            firstName: 'Tom',
            lastName: 'Dale',
          },
        },
      });
      person.set('firstName', 'Thomas');

      assert.strictEqual(person.firstName, 'Thomas', 'PreCond: we mutated firstName');

      person.rollbackAttributes();

      assert.strictEqual(person.firstName, 'Tom', 'We rolled back firstName');
      assert.false(person.hasDirtyAttributes, 'We expect the record to be clean');
    });

    test('changes to unassigned attributes can be rolled back', function (assert) {
      const store = this.owner.lookup('service:store');

      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            lastName: 'Dale',
          },
        },
      });
      const person = store.peekRecord('person', 1);
      person.set('firstName', 'Thomas');

      assert.strictEqual(person.firstName, 'Thomas');

      person.rollbackAttributes();

      assert.strictEqual(person.firstName, undefined);
      assert.false(person.hasDirtyAttributes);
    });

    test('changes to attributes made after a record is in-flight only rolls back the local changes', async function (assert) {
      const store = this.owner.lookup('service:store');
      const adapter = store.adapterFor('application');

      let resolve;
      const trap = new Promise((r) => (resolve = r));
      adapter.updateRecord = async function (store, type, snapshot) {
        resolve();
        await trap;
        // Make sure the save is async
        return new Promise((resolve) => setTimeout(resolve, 1));
      };

      const person = store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            firstName: 'Tom',
            lastName: 'Dale',
          },
        },
      });

      person.firstName = 'Thomas';

      const promise = person.save();
      assert.strictEqual(person.firstName, 'Thomas');
      assert.true(person.isSaving, 'correct state after save');
      await trap;
      assert.strictEqual(person.firstName, 'Thomas');
      assert.true(person.isSaving, 'correct state after save');

      person.lastName = 'Dolly';

      assert.strictEqual(person.lastName, 'Dolly');

      person.rollbackAttributes();

      assert.strictEqual(person.firstName, 'Thomas', 'correct firstName after in-flight rollback');
      assert.strictEqual(person.lastName, 'Dale', 'correct last name after in-flight rollback');
      assert.true(person.isSaving, 'correct state after in-flight rollback');

      await promise;
      assert.false(person.hasDirtyAttributes, 'The person is now clean');
    });

    test("a record's changes can be made if it fails to save", async function (assert) {
      const store = this.owner.lookup('service:store');
      const adapter = store.adapterFor('application');

      adapter.updateRecord = function (store, type, snapshot) {
        return Promise.reject();
      };

      const person = store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            firstName: 'Tom',
            lastName: 'Dale',
          },
        },
      });
      person.set('firstName', 'Thomas');

      assert.deepEqual(person.changedAttributes().firstName, ['Tom', 'Thomas']);

      try {
        await person.save();
        assert.ok(false, 'expected reject');
      } catch {
        assert.true(person.isError, 'person is in error');
        assert.deepEqual(person.changedAttributes().firstName, ['Tom', 'Thomas'], 'changed attrs are correct');

        person.rollbackAttributes();

        assert.strictEqual(person.firstName, 'Tom', 'name is correct after rollback');
        assert.false(person.isError, 'error is removed');
        assert.strictEqual(Object.keys(person.changedAttributes()).length, 0, 'no more changed attrs');
      }
    });

    test(`a deleted record's attributes can be rollbacked if it fails to save, record arrays are updated accordingly`, async function (assert) {
      const store = this.owner.lookup('service:store');
      const adapter = store.adapterFor('application');

      adapter.deleteRecord = function (store, type, snapshot) {
        return Promise.reject();
      };

      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            firstName: 'Tom',
            lastName: 'Dale',
          },
        },
      });
      const person = store.peekRecord('person', 1);
      const people = store.peekAll('person');

      person.deleteRecord();

      assert.strictEqual(people.length, 1, 'a deleted record appears in record array until it is saved');
      assert.strictEqual(people.at(0), person, 'a deleted record appears in record array until it is saved');

      await person
        .save()
        .catch(() => {
          assert.true(person.isError);
          assert.true(person.isDeleted);

          person.rollbackAttributes();

          assert.false(person.isDeleted);
          assert.false(person.isError);
          assert.false(person.hasDirtyAttributes, 'must be not dirty');
        })
        .then(() => {
          assert.strictEqual(
            people.length,
            1,
            'the underlying record array is updated accordingly in an asynchronous way'
          );
        });
    });

    test(`new record's attributes can be rollbacked`, function (assert) {
      const store = this.owner.lookup('service:store');
      const person = store.createRecord('person', { id: '1' });

      assert.true(person.isNew, 'must be new');
      assert.true(person.hasDirtyAttributes, 'must be dirty');

      person.rollbackAttributes();

      assert.false(person.isNew, 'must not be new');
      assert.false(person.hasDirtyAttributes, 'must not be dirty');
      assert.true(person.isDeleted, 'must be deleted');
    });

    test(`invalid new record's attributes can be rollbacked`, async function (assert) {
      const error = new InvalidError([
        {
          detail: 'is invalid',
          source: { pointer: 'data/attributes/name' },
        },
      ]);

      const adapter = RESTAdapter.extend({
        ajax(url, type, hash) {
          return Promise.reject(error);
        },
      });

      this.owner.register('adapter:application', adapter);
      this.owner.register('serializer:application', RESTSerializer.extend());

      const store = this.owner.lookup('service:store');
      const person = store.createRecord('person', { id: '1' });

      assert.true(person.isNew, 'must be new');
      assert.true(person.hasDirtyAttributes, 'must be dirty');

      try {
        await person.save();
      } catch (reason) {
        assert.strictEqual(error, reason);
        assert.false(person.isValid);

        person.rollbackAttributes();

        assert.false(person.isNew, 'must not be new');
        assert.false(person.hasDirtyAttributes, 'must not be dirty');
        assert.true(person.isDeleted, 'must be deleted');
      }
    });

    test(`invalid record's attributes can be rollbacked after multiple failed calls - #3677`, async function (assert) {
      const adapter = RESTAdapter.extend({
        ajax(url, type, hash) {
          const error = new InvalidError();
          return Promise.reject(error);
        },
      });

      this.owner.register('adapter:application', adapter);
      this.owner.register('serializer:application', RESTSerializer.extend());

      const store = this.owner.lookup('service:store');

      const person = store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            firstName: 'original name',
          },
        },
      });

      person.set('firstName', 'updated name');

      assert.strictEqual(person.firstName, 'updated name', 'precondition: firstName is changed');

      await person
        .save()
        .catch(() => {
          assert.true(person.hasDirtyAttributes, 'has dirty attributes');
          assert.strictEqual(person.firstName, 'updated name', 'firstName is still changed');

          return person.save();
        })
        .catch(() => {
          person.rollbackAttributes();

          assert.false(person.hasDirtyAttributes, 'has no dirty attributes');
          assert.strictEqual(
            person.firstName,
            'original name',
            'after rollbackAttributes() firstName has the original value'
          );
        });
    });

    test(`deleted record's attributes can be rollbacked`, function (assert) {
      const store = this.owner.lookup('service:store');

      store.push({
        data: {
          type: 'person',
          id: '1',
        },
      });
      const person = store.peekRecord('person', 1);
      const people = store.peekAll('person');
      person.deleteRecord();

      assert.strictEqual(people.length, 1, 'a deleted record appears in the record array until it is saved');
      assert.strictEqual(people.at(0), person, 'a deleted record appears in the record array until it is saved');

      assert.true(person.isDeleted, 'must be deleted');

      person.rollbackAttributes();

      assert.strictEqual(people.length, 1, 'the rollbacked record should appear again in the record array');
      assert.false(person.isDeleted, 'must not be deleted');
      assert.false(person.hasDirtyAttributes, 'must not be dirty');
    });

    test("invalid record's attributes can be rollbacked", async function (assert) {
      class Dog extends Model {
        @attr() name;
      }
      const thrownAdapterError = new InvalidError([
        {
          detail: 'is invalid',
          source: { pointer: 'data/attributes/name' },
        },
      ]);
      class TestAdapter extends RESTAdapter {
        ajax() {
          return Promise.reject(thrownAdapterError);
        }
      }

      const { owner } = this;
      owner.register(`model:dog`, Dog);
      owner.register(`adapter:application`, TestAdapter);
      owner.register(`serializer:application`, RESTSerializer.extend());
      const store = owner.lookup(`service:store`);

      const dog = store.push({
        data: {
          type: 'dog',
          id: '1',
          attributes: {
            name: 'Pluto',
          },
        },
      });
      dog.set('name', 'is a dwarf planet');

      addObserver(dog, 'errors.name', function () {
        assert.ok(true, 'errors.name did change');
      });

      try {
        assert.ok(true, 'saving');
        await dog.save();
      } catch (reason) {
        assert.strictEqual(reason, thrownAdapterError, 'We threw the expected error during save');

        dog.rollbackAttributes();
        await settled();

        assert.false(dog.hasDirtyAttributes, 'must not be dirty');
        assert.strictEqual(dog.name, 'Pluto', 'Name is rolled back');
        assert.notOk(dog.errors.name, 'We have no errors for name anymore');
        assert.ok(dog.isValid, 'We are now in a valid state');
      }
    });
  });

  test(`invalid record's attributes rolled back to correct state after set`, async function (assert) {
    class Dog extends Model {
      @attr() name;
      @attr() breed;
    }
    const thrownAdapterError = new InvalidError([
      {
        detail: 'is invalid',
        source: { pointer: 'data/attributes/name' },
      },
    ]);
    class TestAdapter extends RESTAdapter {
      ajax() {
        return Promise.reject(thrownAdapterError);
      }
    }
    const { owner } = this;
    owner.register(`model:dog`, Dog);
    owner.register(`adapter:application`, TestAdapter);
    owner.register(`serializer:application`, RESTSerializer.extend());
    const store = owner.lookup(`service:store`);

    const dog = store.push({
      data: {
        type: 'dog',
        id: '1',
        attributes: {
          name: 'Pluto',
          breed: 'Disney',
        },
      },
    });

    dog.name = 'is a dwarf planet';
    dog.breed = 'planet';

    addObserver(dog, 'errors.name', function () {
      assert.ok(true, 'errors.name did change');
    });

    try {
      await dog.save();
    } catch (reason) {
      assert.strictEqual(reason, thrownAdapterError);
      assert.strictEqual(dog.name, 'is a dwarf planet');
      assert.strictEqual(dog.breed, 'planet');
      assert.strictEqual(dog.errors.get('name.length'), 1);

      dog.set('name', 'Seymour Asses');
      await settled();

      assert.strictEqual(dog.name, 'Seymour Asses');
      assert.strictEqual(dog.breed, 'planet');

      dog.rollbackAttributes();
      await settled();

      assert.strictEqual(dog.name, 'Pluto');
      assert.strictEqual(dog.breed, 'Disney');
      assert.false(dog.hasDirtyAttributes, 'must not be dirty');
      assert.notOk(dog.errors.get('name'));
      assert.ok(dog.isValid);
    }
  });

  test(`when destroying a record setup the record state to invalid, the record's attributes can be rollbacked`, async function (assert) {
    const Dog = Model.extend({
      name: attr(),
    });

    const error = new InvalidError([
      {
        detail: 'is invalid',
        source: { pointer: 'data/attributes/name' },
      },
    ]);

    const adapter = RESTAdapter.extend({
      ajax(url, type, hash) {
        return Promise.reject(error);
      },
    });

    this.owner.register('model:dog', Dog);
    this.owner.register('adapter:application', adapter);
    this.owner.register('serializer:application', RESTSerializer.extend());

    const store = this.owner.lookup('service:store');
    const dog = store.push({
      data: {
        type: 'dog',
        id: '1',
        attributes: {
          name: 'Pluto',
        },
      },
    });

    try {
      await dog.destroyRecord();
      assert.ok(false, 'expected reject');
    } catch (reason) {
      assert.strictEqual(reason, error);

      assert.false(dog.isError, 'must not be error');
      assert.true(dog.isDeleted, 'must be deleted');
      assert.false(dog.isValid, 'must not be valid');
      assert.ok(dog.errors.length > 0, 'must have errors');

      dog.rollbackAttributes();

      assert.false(dog.isError, 'must not be error after `rollbackAttributes`');
      assert.false(dog.isDeleted, 'must not be deleted after `rollbackAttributes`');
      assert.true(dog.isValid, 'must be valid after `rollbackAttributes`');
      assert.strictEqual(dog.errors.length, 0, 'must not have errors');
    }
  });
});
