/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "(adam|dave|cersei)" }]*/

import EmberObject, { get } from '@ember/object';
import { run } from '@ember/runloop';
import { settled } from '@ember/test-helpers';

import { module, test } from 'qunit';
import { all, Promise as EmberPromise } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import { InvalidError } from '@ember-data/adapter/error';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import { recordIdentifierFor } from '@ember-data/store';

module('integration/deletedRecord - Deleting Records', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const Person = Model.extend({
      name: attr('string'),
      toString: () => 'Person',
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  test('Updates to the remote state of a locally-deleted (not persisted deletion) should not error', async function (assert) {
    const { owner } = this;
    owner.register(
      'model:user',
      class extends Model {
        @attr name;
      }
    );
    owner.register(
      'adapter:application',
      class extends EmberObject {
        findRecord() {
          return { data: { type: 'user', id: '1', attributes: { name: 'James' } } };
        }
      }
    );
    const store = owner.lookup('service:store');
    const record = store.push({ data: { type: 'user', id: '1', attributes: { name: 'Chris' } } });
    record.deleteRecord();
    await store.findRecord('user', '1', { reload: true });
    assert.strictEqual(record.name, 'James');
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
    assert.strictEqual(all.length, 2, 'pre-condition: 2 records in array');

    adam.deleteRecord();

    assert.strictEqual(all.length, 2, '2 records in array after deleteRecord');

    await adam.save();

    assert.strictEqual(all.length, 1, '1 record in array after deleteRecord and save');
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
    assert.strictEqual(group.people.length, 2, 'expected 2 related records before delete');
    assert.strictEqual(person.name, 'Adam Sunderland', 'expected related records to be loaded');

    await person.destroyRecord();

    assert.strictEqual(group.people.length, 1, 'expected 1 related records after delete');
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
    assert.strictEqual(all.length, 2, 'expected 2 records');
    let destroys = 0;

    run(function () {
      all.forEach(function (record) {
        destroys++;
        record.destroyRecord();
      });
    });

    assert.strictEqual(destroys, 2, 'we destroyed 2 records');
    assert.strictEqual(all.length, 0, 'expected 0 records');
    assert.strictEqual(all.at(0), undefined, "can't get any records");
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
    assert.strictEqual(
      record.currentState.stateName,
      'root.loaded.created.invalid',
      'records should start in the created.invalid state'
    );
    assert.strictEqual(get(store.peekAll('person'), 'length'), 1, 'The new person should be in the store');

    let identifier = recordIdentifierFor(record);
    let recordData = store._instanceCache.getRecordData(identifier);

    record.deleteRecord();

    assert.true(recordData.isEmpty(identifier), 'new person state is empty');
    assert.strictEqual(get(store.peekAll('person'), 'length'), 0, 'The new person should be removed from the store');
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
    assert.strictEqual(
      get(record, 'currentState.stateName'),
      'root.loaded.created.invalid',
      'records should start in the created.invalid state'
    );
    assert.strictEqual(get(store.peekAll('person'), 'length'), 1, 'The new person should be in the store');

    let identifier = recordIdentifierFor(record);
    let recordData = store._instanceCache.getRecordData(identifier);

    await record.destroyRecord();

    assert.true(recordData.isEmpty(identifier), 'new person state is empty');
    assert.strictEqual(get(store.peekAll('person'), 'length'), 0, 'The new person should be removed from the store');
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
          id: '123',
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

    assert.strictEqual(get(store.peekAll('person'), 'length'), 1, 'The new person should be in the store');

    let identifier = recordIdentifierFor(record);
    let recordData = store._instanceCache.getRecordData(identifier);

    record.deleteRecord();

    assert.true(recordData.isEmpty(identifier), 'We reached the correct persisted saved state');
    assert.strictEqual(get(store.peekAll('person'), 'length'), 0, 'The new person should be removed from the store');
    assert.strictEqual(
      store._instanceCache.peek({ identifier, bucket: 'recordData' }),
      undefined,
      'The recordData is destroyed'
    );

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

    assert.strictEqual(get(store.peekAll('person'), 'length'), 1, 'The new person should be in the store');

    let identifier = recordIdentifierFor(record);
    let recordData = store._instanceCache.getRecordData(identifier);

    record.deleteRecord();
    await settled();

    assert.true(recordData.isEmpty(identifier), 'We reached the correct persisted saved state');
    assert.strictEqual(get(store.peekAll('person'), 'length'), 0, 'The new person should be removed from the store');
    assert.strictEqual(
      store._instanceCache.peek({ identifier, bucket: 'recordData' }),
      undefined,
      'The recordData is destroyed'
    );

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
      @belongsTo('company', { async: true, inverse: null }) company;
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
    const groupCompany = await group.company;

    // Sanity Check
    assert.ok(group, 'expected group to be found');
    assert.strictEqual(groupCompany.name, 'Inc.', 'group belongs to our company');
    assert.strictEqual(group.employees.length, 1, 'expected 1 related record before delete');
    const employees = await group.employees;
    employee = employees.at(0);
    assert.strictEqual(employee.name, 'Adam Sunderland', 'expected related records to be loaded');

    await group.destroyRecord();
    await employee.destroyRecord();

    assert.strictEqual(store.peekAll('employee').length, 0, 'no employee record loaded');
    assert.strictEqual(store.peekAll('group').length, 0, 'no group record loaded');

    // Server pushes the same group and employee once more after they have been destroyed client-side. (The company is a long-lived record)
    store.push(jsonEmployee);
    store.push(jsonGroup);

    group = store.peekRecord('group', '1');
    assert.strictEqual(group.employees.length, 1, 'expected 1 related record after delete and restore');
  });
});
