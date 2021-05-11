/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "(adam|dave|cersei)" }]*/

import { get } from '@ember/object';
import { run } from '@ember/runloop';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';
import { all, Promise as EmberPromise } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import { InvalidError } from '@ember-data/adapter/error';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

module('integration/deletedRecord - Deleting Records', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const Person = Model.extend({
      name: attr('string'),
      toString: () => 'Person',
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', JSONAPISerializer.extend());
  });

  test('records should not be removed from record arrays just after deleting, but only after committing them', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.deleteRecord = function () {
      return EmberPromise.resolve();
    };

    store.push({
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Adam Sunderland',
          },
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Dave Sunderland',
          },
        },
      ],
    });
    let adam = store.peekRecord('person', 1);
    let all = store.peekAll('person');

    // pre-condition
    assert.equal(all.get('length'), 2, 'pre-condition: 2 records in array');

    run(adam, 'deleteRecord');

    assert.equal(all.get('length'), 2, '2 records in array after deleteRecord');

    run(adam, 'save');

    assert.equal(all.get('length'), 1, '1 record in array after deleteRecord and save');
  });

  test('deleting a record that is part of a hasMany removes it from the hasMany recordArray', async function (assert) {
    const Group = Model.extend({
      people: hasMany('person', { inverse: null, async: false }),
    });
    Group.toString = () => {
      return 'Group';
    };

    this.owner.register('model:group', Group);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.deleteRecord = function () {
      return EmberPromise.resolve();
    };

    store.push({
      data: {
        type: 'group',
        id: '1',
        relationships: {
          people: {
            data: [
              { type: 'person', id: '1' },
              { type: 'person', id: '2' },
            ],
          },
        },
      },
      included: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Adam Sunderland',
          },
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Dave Sunderland',
          },
        },
      ],
    });

    let group = store.peekRecord('group', '1');
    let person = store.peekRecord('person', '1');

    // Sanity Check we are in the correct state.
    assert.equal(group.get('people.length'), 2, 'expected 2 related records before delete');
    assert.equal(person.get('name'), 'Adam Sunderland', 'expected related records to be loaded');

    await person.destroyRecord();

    assert.equal(group.get('people.length'), 1, 'expected 1 related records after delete');
  });

  test('records can be deleted during record array enumeration', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.deleteRecord = function () {
      return EmberPromise.resolve();
    };

    run(function () {
      store.push({
        data: [
          {
            type: 'person',
            id: '1',
            attributes: {
              name: 'Adam Sunderland',
            },
          },
          {
            type: 'person',
            id: '2',
            attributes: {
              name: 'Dave Sunderland',
            },
          },
        ],
      });
    });
    var all = store.peekAll('person');

    // pre-condition
    assert.equal(all.get('length'), 2, 'expected 2 records');

    run(function () {
      all.forEach(function (record) {
        record.destroyRecord();
      });
    });

    assert.equal(all.get('length'), 0, 'expected 0 records');
    assert.equal(all.objectAt(0), null, "can't get any records");
  });

  test('Deleting an invalid newly created record should remove it from the store', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.createRecord = function () {
      return EmberPromise.reject(
        new InvalidError([
          {
            title: 'Invalid Attribute',
            detail: 'name is invalid',
            source: {
              pointer: '/data/attributes/name',
            },
          },
        ])
      );
    };

    let record = store.createRecord('person', { name: 'pablobm' });
    // Invalidate the record to put it in the `root.loaded.created.invalid` state
    await record.save().catch(() => {});

    // Preconditions
    assert.equal(
      record.currentState.stateName,
      'root.loaded.created.invalid',
      'records should start in the created.invalid state'
    );
    assert.equal(get(store.peekAll('person'), 'length'), 1, 'The new person should be in the store');

    let internalModel = record._internalModel;

    record.deleteRecord();

    assert.equal(internalModel.currentState.stateName, 'root.empty', 'new person state is empty');
    assert.equal(get(store.peekAll('person'), 'length'), 0, 'The new person should be removed from the store');
  });

  test('Destroying an invalid newly created record should remove it from the store', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.deleteRecord = function () {
      assert.fail("The adapter's deletedRecord method should not be called when the record was created locally.");
    };

    adapter.createRecord = function () {
      return EmberPromise.reject(
        new InvalidError([
          {
            title: 'Invalid Attribute',
            detail: 'name is invalid',
            source: {
              pointer: '/data/attributes/name',
            },
          },
        ])
      );
    };

    let record = store.createRecord('person', { name: 'pablobm' });
    // Invalidate the record to put it in the `root.loaded.created.invalid` state
    await record.save().catch(() => {});

    // Preconditions
    assert.equal(
      get(record, 'currentState.stateName'),
      'root.loaded.created.invalid',
      'records should start in the created.invalid state'
    );
    assert.equal(get(store.peekAll('person'), 'length'), 1, 'The new person should be in the store');

    let internalModel = record._internalModel;

    await record.destroyRecord();

    assert.equal(internalModel.currentState.stateName, 'root.empty', 'new person state is empty');
    assert.equal(get(store.peekAll('person'), 'length'), 0, 'The new person should be removed from the store');
  });

  test('Will resolve destroy and save in same loop', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let adam, dave;
    let promises;

    assert.expect(1);

    adapter.createRecord = function () {
      assert.ok(true, 'save operation resolves');
      return EmberPromise.resolve({
        data: {
          id: 123,
          type: 'person',
        },
      });
    };

    adam = store.createRecord('person', { name: 'Adam Sunderland' });
    dave = store.createRecord('person', { name: 'Dave Sunderland' });

    run(function () {
      promises = [adam.destroyRecord(), dave.save()];
    });

    return all(promises);
  });

  test('Calling save on a newly created then deleted record should not error', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.createRecord = function () {
      assert.fail('We should not call adapter.createRecord on save');
    };
    adapter.updateRecord = function () {
      assert.fail('We should not call adapter.updateRecord on save');
    };
    adapter.deleteRecord = function () {
      assert.fail('We should not call adapter.deleteRecord on save');
    };

    let record = store.createRecord('person', { name: 'pablobm' });

    assert.equal(get(store.peekAll('person'), 'length'), 1, 'The new person should be in the store');

    let internalModel = record._internalModel;

    record.deleteRecord();

    // it is uncertain that `root.empty` vs `root.deleted.saved` afterwards is correct
    //   but this is the expected result of `unloadRecord`. We may want a `root.deleted.saved.unloaded` state?
    assert.equal(internalModel.currentState.stateName, 'root.empty', 'We reached the correct persisted saved state');
    assert.equal(get(store.peekAll('person'), 'length'), 0, 'The new person should be removed from the store');

    // let cache = store._identityMap._map.person._models;

    // assert.ok(cache.indexOf(internalModel) === -1, 'The internal model is removed from the cache');
    assert.true(internalModel.isDestroyed, 'The internal model is destroyed');

    await record.save();
  });

  test('Calling unloadRecord on a newly created then deleted record should not error', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.createRecord = function () {
      assert.fail('We should not call adapter.createRecord on save');
    };
    adapter.updateRecord = function () {
      assert.fail('We should not call adapter.updateRecord on save');
    };
    adapter.deleteRecord = function () {
      assert.fail('We should not call adapter.deleteRecord on save');
    };

    let record = store.createRecord('person', { name: 'pablobm' });

    assert.equal(get(store.peekAll('person'), 'length'), 1, 'The new person should be in the store');

    let internalModel = record._internalModel;

    record.deleteRecord();
    await settled();

    // it is uncertain that `root.empty` vs `root.deleted.saved` afterwards is correct
    //   but this is the expected result of `unloadRecord`. We may want a `root.deleted.saved.unloaded` state?
    assert.equal(internalModel.currentState.stateName, 'root.empty', 'We reached the correct persisted saved state');
    assert.equal(get(store.peekAll('person'), 'length'), 0, 'The new person should be removed from the store');

    // let cache = store._identityMap._map.person._models;

    // assert.ok(cache.indexOf(internalModel) === -1, 'The internal model is removed from the cache');
    assert.true(internalModel.isDestroyed, 'The internal model is destroyed');

    record.unloadRecord();
    await settled();
  });

  test('Records with an async hasMany can be pushed again after they were destroyed on client side', async function (assert) {
    let group;
    let employee;

    class Company extends Model {
      @attr('string') name;
      toString() {
        return 'Company';
      }
    }
    class Group extends Model {
      @belongsTo('company', { async: true }) company;
      @hasMany('employee', { inverse: 'groups', async: true }) employees;
      toString() {
        return 'Group';
      }
    }
    class Employee extends Model {
      @hasMany('group', { inverse: 'employees', async: true }) groups;
      @attr('string') name;
    }

    this.owner.register('model:company', Company);
    this.owner.register('model:group', Group);
    this.owner.register('model:employee', Employee);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.deleteRecord = function () {
      return EmberPromise.resolve();
    };

    // Push the company as a long-lived record that will be referenced by the group
    store.push({
      data: {
        type: 'company',
        id: '1',
        attributes: {
          name: 'Inc.',
        },
      },
    });

    const jsonEmployee = {
      data: {
        type: 'employee',
        id: '1',
        attributes: {
          name: 'Adam Sunderland',
        },
        relationships: {
          groups: {
            data: [{ type: 'group', id: '1' }],
          },
        },
      },
    };

    const jsonGroup = {
      data: {
        type: 'group',
        id: '1',
        relationships: {
          company: {
            data: {
              id: '1',
              type: 'company',
            },
          },
        },
      },
    };

    // Server push with the group and employee
    store.push(jsonEmployee);
    store.push(jsonGroup);

    group = store.peekRecord('group', '1');

    // Sanity Check
    assert.ok(group, 'expected group to be found');
    assert.equal(group.get('company.name'), 'Inc.', 'group belongs to our company');
    assert.equal(group.get('employees.length'), 1, 'expected 1 related record before delete');
    employee = group.get('employees').objectAt(0);
    assert.equal(employee.get('name'), 'Adam Sunderland', 'expected related records to be loaded');

    await group.destroyRecord();
    await employee.destroyRecord();

    assert.equal(store.peekAll('employee').get('length'), 0, 'no employee record loaded');
    assert.equal(store.peekAll('group').get('length'), 0, 'no group record loaded');

    // Server pushes the same group and employee once more after they have been destroyed client-side. (The company is a long-lived record)
    store.push(jsonEmployee);
    store.push(jsonGroup);

    group = store.peekRecord('group', '1');
    assert.equal(group.get('employees.length'), 1, 'expected 1 related record after delete and restore');
  });
});
