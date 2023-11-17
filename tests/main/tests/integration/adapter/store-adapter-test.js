import { get, set } from '@ember/object';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import AdapterError, { InvalidError } from '@ember-data/adapter/error';
import JSONAPIAdapter from '@ember-data/adapter/json-api';
import RESTAdapter from '@ember-data/adapter/rest';
import { Snapshot } from '@ember-data/legacy-compat/-private';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import RESTSerializer from '@ember-data/serializer/rest';
import { recordIdentifierFor } from '@ember-data/store';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

function moveRecordOutOfInFlight(record) {
  // move record out of the inflight state so the tests can clean up
  // correctly
  const { store } = record;
  const identifier = recordIdentifierFor(record);

  // TODO this would be made nicer by a cancellation API
  const pending = store.getRequestStateService().getPendingRequestsForRecord(identifier);
  pending.splice(0, pending.length);
}

module('integration/adapter/store-adapter - DS.Store and DS.Adapter integration test', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    class Person extends Model {
      @attr('string') updatedAt;
      @attr('string') name;
    }

    class Dog extends Model {
      @attr('string') name;
    }

    this.owner.register('adapter:application', JSONAPIAdapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
    this.owner.register('model:person', Person);
    this.owner.register('model:dog', Dog);
  });

  test('Records loaded multiple times and retrieved in recordArray are ready to send state events', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    adapter.query = function (store, type, query, recordArray) {
      return Promise.resolve({
        data: [
          {
            id: '1',
            type: 'person',
            attributes: {
              name: 'Mickael Ramírez',
            },
          },
          {
            id: '2',
            type: 'person',
            attributes: {
              name: 'Johny Fontana',
            },
          },
        ],
      });
    };

    const people = await store.query('person', { q: 'bla' });
    const people2 = await store.query('person', { q: 'bla2' });
    assert.strictEqual(people2.length, 2, 'return the elements');
    assert.ok(people2.isLoaded, 'array is loaded');

    const person = people.at(0);
    assert.ok(person.isLoaded, 'record is loaded');

    // delete record will not throw exception
    person.deleteRecord();
  });

  test('by default, createRecords calls createRecord once per record', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const Person = store.modelFor('person');

    let count = 1;
    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.createRecord = function (store, type, snapshot) {
      assert.strictEqual(type, Person, 'the type is correct');

      if (count === 1) {
        assert.strictEqual(snapshot.attr('name'), 'Tom Dale');
      } else if (count === 2) {
        assert.strictEqual(snapshot.attr('name'), 'Yehuda Katz');
      } else {
        assert.ok(false, 'should not have invoked more than 2 times');
      }

      const hash = snapshot.attributes();
      const recordId = count;
      hash['updated-at'] = 'now';

      count++;
      return Promise.resolve({
        data: {
          id: recordId,
          type: 'person',
          attributes: hash,
        },
      });
    };

    let tom = store.createRecord('person', { name: 'Tom Dale' });
    let yehuda = store.createRecord('person', { name: 'Yehuda Katz' });

    [tom, yehuda] = await Promise.all([tom.save(), yehuda.save()]);

    assert.strictEqual(
      tom,
      await store.findRecord('person', '1'),
      'Once an ID is in, findRecord returns the same object'
    );
    assert.strictEqual(
      yehuda,
      await store.findRecord('person', '2'),
      'Once an ID is in, findRecord returns the same object'
    );
    assert.strictEqual(tom.updatedAt, 'now', 'The new information is received');
    assert.strictEqual(yehuda.updatedAt, 'now', 'The new information is received');
  });

  test('by default, updateRecords calls updateRecord once per record', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const Person = store.modelFor('person');

    let count = 0;
    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.updateRecord = function (store, type, snapshot) {
      assert.strictEqual(type, Person, 'the type is correct');

      if (count === 0) {
        assert.strictEqual(snapshot.attr('name'), 'Tom Dale');
      } else if (count === 1) {
        assert.strictEqual(snapshot.attr('name'), 'Yehuda Katz');
      } else {
        assert.ok(false, 'should not get here');
      }

      count++;

      assert.true(snapshot.record.isSaving, 'record is saving');

      return Promise.resolve();
    };

    store.push({
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Braaaahm Dale',
          },
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Brohuda Katz',
          },
        },
      ],
    });

    const [tom, yehuda] = await Promise.all([store.findRecord('person', '1'), store.findRecord('person', '2')]);

    set(tom, 'name', 'Tom Dale');
    set(yehuda, 'name', 'Yehuda Katz');

    const [tom2, yehuda2] = await Promise.all([tom.save(), yehuda.save()]);

    assert.false(tom2.isSaving, 'record is no longer saving');
    assert.true(tom2.isLoaded, 'record is loaded');

    assert.false(yehuda2.isSaving, 'record is no longer saving');
    assert.true(yehuda2.isLoaded, 'record is loaded');
  });

  test('additional new values can be returned on store save', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const Person = store.modelFor('person');

    let count = 0;
    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.updateRecord = function (store, type, snapshot) {
      assert.strictEqual(type, Person, 'the type is correct');

      count++;
      if (count === 1) {
        assert.strictEqual(snapshot.attr('name'), 'Tom Dale');
        return Promise.resolve({
          data: { id: '1', type: 'person', attributes: { name: 'Tom Dale', 'updated-at': 'now' } },
        });
      } else if (count === 2) {
        assert.strictEqual(snapshot.attr('name'), 'Yehuda Katz');
        return Promise.resolve({
          data: {
            id: '2',
            type: 'person',
            attributes: { name: 'Yehuda Katz', 'updated-at': 'now!' },
          },
        });
      } else {
        assert.ok(false, 'should not get here');
      }
    };

    store.push({
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Braaaahm Dale',
          },
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Brohuda Katz',
          },
        },
      ],
    });

    const tom = await store.findRecord('person', '1');
    const yehuda = await store.findRecord('person', '2');

    set(tom, 'name', 'Tom Dale');
    set(yehuda, 'name', 'Yehuda Katz');

    await tom.save();
    await yehuda.save();
    assert.false(get(tom, 'hasDirtyAttributes'), 'the record should not be dirty');
    assert.strictEqual(get(tom, 'updatedAt'), 'now', 'the hash was updated');

    assert.false(get(yehuda, 'hasDirtyAttributes'), 'the record should not be dirty');
    assert.strictEqual(get(yehuda, 'updatedAt'), 'now!', 'the hash was updated');
  });

  test('by default, deleteRecord calls deleteRecord once per record', async function (assert) {
    assert.expect(4);

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const Person = store.modelFor('person');

    let count = 0;
    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.deleteRecord = function (store, type, snapshot) {
      assert.strictEqual(type, Person, 'the type is correct');

      if (count === 0) {
        assert.strictEqual(snapshot.attr('name'), 'Tom Dale');
      } else if (count === 1) {
        assert.strictEqual(snapshot.attr('name'), 'Yehuda Katz');
      } else {
        assert.ok(false, 'should not get here');
      }

      count++;

      return Promise.resolve();
    };

    store.push({
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Tom Dale',
          },
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Yehuda Katz',
          },
        },
      ],
    });

    const [tom, yehuda] = await Promise.all([store.findRecord('person', '1'), store.findRecord('person', '2')]);

    tom.deleteRecord();
    yehuda.deleteRecord();

    await Promise.all([tom.save(), yehuda.save()]);
  });

  test('by default, destroyRecord calls deleteRecord once per record without requiring .save', async function (assert) {
    assert.expect(4);

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const Person = store.modelFor('person');

    let count = 0;

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.deleteRecord = function (store, type, snapshot) {
      assert.strictEqual(type, Person, 'the type is correct');

      if (count === 0) {
        assert.strictEqual(snapshot.attr('name'), 'Tom Dale');
      } else if (count === 1) {
        assert.strictEqual(snapshot.attr('name'), 'Yehuda Katz');
      } else {
        assert.ok(false, 'should not get here');
      }

      count++;

      return Promise.resolve();
    };

    store.push({
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Tom Dale',
          },
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Yehuda Katz',
          },
        },
      ],
    });

    const [tom, yehuda] = await Promise.all([store.findRecord('person', '1'), store.findRecord('person', '2')]);

    await Promise.all([tom.destroyRecord(), yehuda.destroyRecord()]);
  });

  test('if an existing model is edited then deleted, deleteRecord is called on the adapter', async function (assert) {
    assert.expect(5);

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    let count = 0;
    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.deleteRecord = function (store, type, snapshot) {
      count++;
      assert.strictEqual(snapshot.id, 'deleted-record', 'should pass correct record to deleteRecord');
      assert.strictEqual(count, 1, 'should only call deleteRecord method of adapter once');

      return Promise.resolve();
    };

    adapter.updateRecord = function () {
      assert.ok(false, 'should not have called updateRecord method of adapter');
    };

    // Load data for a record into the store.
    store.push({
      data: {
        type: 'person',
        id: 'deleted-record',
        attributes: {
          name: 'Tom Dale',
        },
      },
    });

    // Retrieve that loaded record and edit it so it becomes dirty
    const tom = await store.findRecord('person', 'deleted-record');
    tom.set('name', "Tom Mothereffin' Dale");

    assert.true(tom.hasDirtyAttributes, 'precond - record should be dirty after editing');

    tom.deleteRecord();
    await tom.save();
    assert.false(tom.hasDirtyAttributes, 'record should not be dirty');
    assert.true(tom.isDeleted, 'record should be considered deleted');
  });

  test('if a deleted record errors, it enters the error state', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    let count = 0;
    const error = new AdapterError();

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.deleteRecord = function (store, type, snapshot) {
      if (count++ === 0) {
        return Promise.reject(error);
      } else {
        return Promise.resolve();
      }
    };

    store.push({
      data: {
        type: 'person',
        id: 'deleted-record',
        attributes: {
          name: 'Tom Dale',
        },
      },
    });

    const tom = await store.findRecord('person', 'deleted-record');
    tom.deleteRecord();
    try {
      await tom.save();
      assert.ok(false, 'We should throw during save');
    } catch (e) {
      assert.true(tom.isError, 'Tom is now errored');
      assert.strictEqual(tom.adapterError, error, 'error object is exposed');

      // this time it succeeds
      await tom.save();

      assert.false(tom.isError, 'Tom is not errored anymore');
      assert.strictEqual(tom.adapterError, null, 'error object is discarded');
    }
  });

  test('if a created record is marked as invalid by the server, it enters an error state', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const Person = store.modelFor('person');

    adapter.createRecord = function (store, type, snapshot) {
      assert.strictEqual(type, Person, 'the type is correct');

      if (snapshot.attr('name').indexOf('Bro') === -1) {
        return Promise.reject(
          new InvalidError([
            {
              title: 'Invalid Attribute',
              detail: 'common... name requires a "bro"',
              source: {
                pointer: '/data/attributes/name',
              },
            },
          ])
        );
      } else {
        return Promise.resolve();
      }
    };

    const yehuda = store.createRecord('person', { id: '1', name: 'Yehuda Katz' });
    // Wrap this in an Ember.run so that all chained async behavior is set up
    // before flushing any scheduled behavior.

    try {
      await yehuda.save();
      assert.ok(false, 'We should have erred');
    } catch (e) {
      assert.false(yehuda.isValid, 'the record is invalid');
      assert.ok(get(yehuda, 'errors.name'), 'The errors.name property exists');

      set(yehuda, 'updatedAt', true);
      assert.false(yehuda.isValid, 'the record is still invalid');

      set(yehuda, 'name', 'Brohuda Brokatz');

      assert.true(yehuda.isValid, 'the record is no longer invalid after changing');
      assert.true(yehuda.hasDirtyAttributes, 'the record has outstanding changes');

      assert.true(yehuda.isNew, 'precond - record is still new');

      const person = await yehuda.save();

      assert.strictEqual(person, yehuda, 'The promise resolves with the saved record');

      assert.true(yehuda.isValid, 'record remains valid after committing');
      assert.false(yehuda.isNew, 'record is no longer new');
    }
  });

  test('allows errors on arbitrary properties on create', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    adapter.createRecord = function (store, type, snapshot) {
      if (snapshot.attr('name').indexOf('Bro') === -1) {
        return Promise.reject(
          new InvalidError([
            {
              title: 'Invalid Attribute',
              detail: 'is a generally unsavoury character',
              source: {
                pointer: '/data/attributes/base',
              },
            },
          ])
        );
      } else {
        return Promise.resolve();
      }
    };

    const yehuda = store.createRecord('person', { id: '1', name: 'Yehuda Katz' });

    // Wrap this in an Ember.run so that all chained async behavior is set up
    // before flushing any scheduled behavior.

    const person = await yehuda.save().catch(() => {
      assert.false(yehuda.isValid, 'the record is invalid');
      assert.ok(get(yehuda, 'errors.base'), 'The errors.base property exists');
      assert.deepEqual(get(yehuda, 'errors').errorsFor('base'), [
        { attribute: 'base', message: 'is a generally unsavoury character' },
      ]);

      set(yehuda, 'updatedAt', true);
      assert.false(yehuda.isValid, 'the record is still invalid');

      set(yehuda, 'name', 'Brohuda Brokatz');

      assert.false(yehuda.isValid, 'the record is still invalid as far as we know');
      assert.true(yehuda.hasDirtyAttributes, 'the record has outstanding changes');

      assert.true(yehuda.isNew, 'precond - record is still new');

      return yehuda.save();
    });

    assert.strictEqual(person, yehuda, 'The promise resolves with the saved record');
    assert.notOk(person.errors.base, 'The errors.base property does not exist');
    assert.deepEqual(person.errors.errorsFor('base'), []);
    assert.true(person.isValid, 'record remains valid after committing');
    assert.false(person.isNew, 'record is no longer new');
  });

  test('if a created record is marked as invalid by the server, you can attempt the save again', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const Person = store.modelFor('person');

    let saveCount = 0;
    adapter.createRecord = function (store, type, snapshot) {
      assert.strictEqual(type, Person, 'the type is correct');
      saveCount++;

      if (snapshot.attr('name').indexOf('Bro') === -1) {
        return Promise.reject(
          new InvalidError([
            {
              title: 'Invalid Attribute',
              detail: 'common... name requires a "bro"',
              source: {
                pointer: '/data/attributes/name',
              },
            },
          ])
        );
      } else {
        return Promise.resolve();
      }
    };

    const yehuda = store.createRecord('person', { id: '1', name: 'Yehuda Katz' });

    // Wrap this in an Ember.run so that all chained async behavior is set up
    // before flushing any scheduled behavior.

    const person = await yehuda
      .save()
      .catch((reason) => {
        assert.strictEqual(saveCount, 1, 'The record has been saved once');
        assert.ok(
          reason.message.match('The adapter rejected the commit because it was invalid'),
          'It should fail due to being invalid'
        );
        assert.false(yehuda.isValid, 'the record is invalid');
        assert.true(yehuda.hasDirtyAttributes, 'the record has outstanding changes');
        assert.ok(get(yehuda, 'errors.name'), 'The errors.name property exists');
        assert.true(yehuda.isNew, 'precond - record is still new');
        return yehuda.save();
      })
      .catch((reason) => {
        assert.strictEqual(saveCount, 2, 'The record has been saved twice');
        assert.ok(
          reason.message.match('The adapter rejected the commit because it was invalid'),
          'It should fail due to being invalid'
        );
        assert.false(yehuda.isValid, 'the record is still invalid');
        assert.true(yehuda.hasDirtyAttributes, 'the record has outstanding changes');
        assert.ok(get(yehuda, 'errors.name'), 'The errors.name property exists');
        assert.true(yehuda.isNew, 'precond - record is still new');
        set(yehuda, 'name', 'Brohuda Brokatz');
        return yehuda.save();
      });

    assert.strictEqual(saveCount, 3, 'The record has been saved thrice');
    assert.true(person.isValid, 'record is valid');
    assert.false(person.hasDirtyAttributes, 'record is not dirty');
    assert.true(person.errors.isEmpty, 'record has no errors');
  });

  test('if a created record is marked as erred by the server, it enters an error state', function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    const error = new AdapterError();

    adapter.createRecord = function (store, type, snapshot) {
      return Promise.reject(error);
    };

    const person = store.createRecord('person', { id: '1', name: 'John Doe' });

    return person.save().catch(() => {
      assert.ok(person.isError, 'the record is in the error state');
      assert.strictEqual(person.adapterError, error, 'error object is exposed');
    });
  });

  test('if an updated record is marked as invalid by the server, it enters an error state', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const Person = store.modelFor('person');

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.updateRecord = function (store, type, snapshot) {
      assert.strictEqual(type, Person, 'the type is correct');

      if (snapshot.attr('name').indexOf('Bro') === -1) {
        return Promise.reject(
          new InvalidError([
            {
              title: 'Invalid Attribute',
              detail: 'common... name requires a "bro"',
              source: {
                pointer: '/data/attributes/name',
              },
            },
          ])
        );
      } else {
        return Promise.resolve();
      }
    };

    const yehuda = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Brohuda Brokatz',
        },
      },
    });

    store.peekRecord('person', '1');

    const person = await store.findRecord('person', '1');
    assert.strictEqual(person, yehuda, 'The same object is passed through');

    assert.true(yehuda.isValid, 'precond - the record is valid');
    set(yehuda, 'name', 'Yehuda Katz');
    assert.true(yehuda.isValid, 'precond - the record is still valid as far as we know');

    assert.true(yehuda.hasDirtyAttributes, 'the record is dirty');

    const reason = yehuda.save();
    const response = await reason.catch(() => {
      assert.true(yehuda.hasDirtyAttributes, 'the record is still dirty');
      assert.false(yehuda.isValid, 'the record is invalid');

      set(yehuda, 'updatedAt', true);
      assert.false(yehuda.isValid, 'the record is still invalid');

      set(yehuda, 'name', 'Brohuda Brokatz');
      assert.true(yehuda.isValid, 'the record is no longer invalid after changing');
      assert.true(yehuda.hasDirtyAttributes, 'the record has outstanding changes');

      return yehuda.save();
    });
    assert.true(response.isValid, 'record remains valid after committing');
    assert.false(response.hasDirtyAttributes, 'record is no longer new');
  });

  test('records can have errors on arbitrary properties after update', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.updateRecord = function (store, type, snapshot) {
      if (snapshot.attr('name').indexOf('Bro') === -1) {
        return Promise.reject(
          new InvalidError([
            {
              title: 'Invalid Attribute',
              detail: 'is a generally unsavoury character',
              source: {
                pointer: '/data/attributes/base',
              },
            },
          ])
        );
      } else {
        return Promise.resolve();
      }
    };

    const yehuda = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Brohuda Brokatz',
        },
      },
    });
    store.peekRecord('person', '1');

    const person = await store.findRecord('person', '1');

    assert.strictEqual(person, yehuda, 'The same object is passed through');

    assert.true(yehuda.isValid, 'precond - the record is valid');
    set(yehuda, 'name', 'Yehuda Katz');
    assert.true(yehuda.isValid, 'precond - the record is still valid as far as we know');

    assert.true(yehuda.hasDirtyAttributes, 'the record is dirty');

    const reason = yehuda.save();
    const response = await reason.catch(() => {
      assert.true(yehuda.hasDirtyAttributes, 'the record is still dirty');
      assert.false(yehuda.isValid, 'the record is invalid');
      assert.ok(get(yehuda, 'errors.base'), 'The errors.base property exists');
      assert.deepEqual(get(yehuda, 'errors').errorsFor('base'), [
        { attribute: 'base', message: 'is a generally unsavoury character' },
      ]);

      set(yehuda, 'updatedAt', true);
      assert.false(yehuda.isValid, 'the record is still invalid');

      set(yehuda, 'name', 'Brohuda Brokatz');
      assert.false(
        yehuda.isValid,
        "the record is still invalid after changing (only server can know if it's now valid)"
      );
      assert.true(yehuda.hasDirtyAttributes, 'the record has outstanding changes');

      return yehuda.save();
    });
    assert.true(response.isValid, 'record remains valid after committing');
    assert.false(response.hasDirtyAttributes, 'record is no longer new');
    assert.notOk(response.errors.base, 'The errors.base property does not exist');
    assert.deepEqual(response.errors.errorsFor('base'), []);
  });

  test('if an updated record is marked as invalid by the server, you can attempt the save again', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const Person = store.modelFor('person');

    let saveCount = 0;
    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.updateRecord = function (store, type, snapshot) {
      assert.strictEqual(type, Person, 'the type is correct');
      saveCount++;
      if (snapshot.attr('name').indexOf('Bro') === -1) {
        return Promise.reject(
          new InvalidError([
            {
              title: 'Invalid Attribute',
              detail: 'common... name requires a "bro"',
              source: {
                pointer: '/data/attributes/name',
              },
            },
          ])
        );
      } else {
        return Promise.resolve();
      }
    };

    const yehuda = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Brohuda Brokatz',
        },
      },
    });
    store.peekRecord('person', '1');

    const person = await store.findRecord('person', '1');
    assert.strictEqual(person, yehuda, 'The same object is passed through');

    assert.true(yehuda.isValid, 'precond - the record is valid');
    set(yehuda, 'name', 'Yehuda Katz');
    assert.true(yehuda.isValid, 'precond - the record is still valid as far as we know');

    assert.true(yehuda.hasDirtyAttributes, 'the record is dirty');

    const reason = yehuda.save();
    const response = await reason
      .catch((reason) => {
        assert.strictEqual(saveCount, 1, 'The record has been saved once');
        assert.ok(
          reason.message.match('The adapter rejected the commit because it was invalid'),
          'It should fail due to being invalid'
        );
        assert.true(yehuda.hasDirtyAttributes, 'the record is still dirty');
        assert.false(yehuda.isValid, 'the record is invalid');
        return yehuda.save();
      })
      .catch((reason) => {
        assert.strictEqual(saveCount, 2, 'The record has been saved twice');
        assert.ok(
          reason.message.match('The adapter rejected the commit because it was invalid'),
          'It should fail due to being invalid'
        );
        assert.false(yehuda.isValid, 'record is still invalid');
        assert.true(yehuda.hasDirtyAttributes, 'record is still dirty');
        set(yehuda, 'name', 'Brohuda Brokatz');
        return yehuda.save();
      });

    assert.strictEqual(saveCount, 3, 'The record has been saved thrice');
    assert.true(response.isValid, 'record is valid');
    assert.false(response.hasDirtyAttributes, 'record is not dirty');
    assert.true(response.errors.isEmpty, 'record has no errors');
  });

  test('if a updated record is marked as erred by the server, it enters an error state', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    const error = new AdapterError();

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.updateRecord = function (store, type, snapshot) {
      return Promise.reject(error);
    };

    const person = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'John Doe',
        },
      },
    });
    store.peekRecord('person', '1');

    const record = await store.findRecord('person', '1');

    assert.strictEqual(record, person, 'The person was resolved');
    person.set('name', 'Jonathan Doe');
    const reason = person.save();
    reason.catch(() => {
      assert.ok(person.isError, 'the record is in the error state');
      assert.strictEqual(person.adapterError, error, 'error object is exposed');
    });
  });

  test('can be created after the Store', async function (assert) {
    assert.expect(1);

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    const Person = store.modelFor('person');

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.strictEqual(type, Person, 'the type is correct');
      return Promise.resolve({ data: { id: '1', type: 'person' } });
    };

    await store.findRecord('person', '1');
  });

  test('relationships returned via `commit` do not trigger additional findManys', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    class Person extends Model {
      @hasMany('dog', { async: false, inverse: null }) dogs;
    }

    this.owner.register('model:person', Person);

    store.push({
      data: {
        type: 'dog',
        id: '1',
        attributes: {
          name: 'Scruffy',
        },
      },
    });

    adapter.shouldBackgroundReloadRecord = () => false;

    adapter.findRecord = function (store, type, id, snapshot) {
      return Promise.resolve({
        data: {
          id: '1',
          type: 'person',
          attributes: { name: 'Tom Dale' },
          relationships: {
            dogs: {
              data: [{ id: '1', type: 'dog' }],
            },
          },
        },
      });
    };

    adapter.updateRecord = function (store, type, snapshot) {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Tom Dale',
          },
          relationships: {
            dogs: {
              data: [
                { type: 'dog', id: '1' },
                { type: 'dog', id: '2' },
              ],
            },
          },
        },
        included: [
          {
            type: 'dog',
            id: '2',
            attributes: {
              name: 'Scruffles',
            },
          },
        ],
      });

      return Promise.resolve({ data: { id: '1', type: 'dog', attributes: { name: 'Scruffy' } } });
    };

    adapter.findMany = function (store, type, ids, snapshots) {
      assert.ok(false, 'Should not get here');
    };

    const person = await store.findRecord('person', '1');
    const dog = await store.findRecord('dog', '1');
    await dog.save();
    await person.dogs;

    assert.ok(true, 'no findMany triggered');
  });

  test("relationships don't get reset if the links is the same", async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    class Person extends Model {
      @hasMany('dog', { async: true, inverse: null }) dogs;
    }

    this.owner.register('model:person', Person);

    adapter.shouldBackgroundReloadRecord = () => false;

    let count = 0;
    adapter.findHasMany = function (store, snapshot, link, relationship) {
      assert.strictEqual(count++, 0, 'findHasMany is only called once');

      return Promise.resolve({ data: [{ id: '1', type: 'dog', attributes: { name: 'Scruffy' } }] });
    };

    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale',
        },
        relationships: {
          dogs: {
            links: {
              related: '/dogs',
            },
          },
        },
      },
    });

    const person = await store.findRecord('person', '1');

    const tom = person;
    const dogs = tom.dogs;
    const record = await dogs;

    assert.strictEqual(record.length, 1, 'The dogs are loaded');
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale',
        },
        relationships: {
          dogs: {
            links: {
              related: '/dogs',
            },
          },
        },
      },
    });
    assert.strictEqual(typeof tom.dogs.then, 'function', 'dogs is a thenable');
    const record2 = await tom.dogs;

    assert.strictEqual(record2.length, 1, 'The same dogs are loaded');
  });

  test('async hasMany always returns a promise', async function (assert) {
    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    class Person extends Model {
      @hasMany('dog', { async: true, inverse: null }) dogs;
    }

    this.owner.register('model:person', Person);

    adapter.createRecord = function (store, type, snapshot) {
      return Promise.resolve({
        data: {
          id: '1',
          type: 'person',
          attributes: {
            name: 'Tom Dale',
          },
          relationships: {
            dogs: [],
          },
        },
      });
    };

    const tom = store.createRecord('person', { name: 'Tom Dale' });

    assert.strictEqual(typeof tom.dogs.then, 'function', 'dogs is a thenable before save');

    await tom.save();
    assert.strictEqual(typeof tom.dogs.then, 'function', 'dogs is a thenable after save');
  });

  test('createRecord receives a snapshot', async function (assert) {
    assert.expect(1);

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    adapter.createRecord = function (store, type, snapshot) {
      assert.ok(snapshot instanceof Snapshot, 'snapshot is an instance of Snapshot');
      return Promise.resolve();
    };

    const record = store.createRecord('person', { name: 'Tom Dale', id: '1' });

    await record.save();
  });

  test('updateRecord receives a snapshot', async function (assert) {
    assert.expect(1);

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    adapter.updateRecord = function (store, type, snapshot) {
      assert.ok(snapshot instanceof Snapshot, 'snapshot is an instance of Snapshot');
      return Promise.resolve();
    };

    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale',
        },
      },
    });
    const person = store.peekRecord('person', '1');

    set(person, 'name', 'Tomster');
    await person.save();
  });

  test('deleteRecord receives a snapshot', async function (assert) {
    assert.expect(1);

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    adapter.deleteRecord = function (store, type, snapshot) {
      assert.ok(snapshot instanceof Snapshot, 'snapshot is an instance of Snapshot');
      return Promise.resolve();
    };

    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale',
        },
      },
    });
    const person = store.peekRecord('person', '1');

    person.deleteRecord();
    await person.save();
  });

  test('findRecord receives a snapshot', async function (assert) {
    assert.expect(1);

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.ok(snapshot instanceof Snapshot, 'snapshot is an instance of Snapshot');
      return Promise.resolve({ data: { id: '1', type: 'person' } });
    };

    await store.findRecord('person', '1');
  });

  test('findMany receives an array of snapshots', async function (assert) {
    assert.expect(2);

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    class Person extends Model {
      @hasMany('dog', { async: true, inverse: null }) dogs;
    }

    this.owner.register('model:person', Person);

    adapter.coalesceFindRequests = true;
    adapter.findMany = function (store, type, ids, snapshots) {
      assert.ok(snapshots[0] instanceof Snapshot, 'snapshots[0] is an instance of Snapshot');
      assert.ok(snapshots[1] instanceof Snapshot, 'snapshots[1] is an instance of Snapshot');
      return Promise.resolve({
        data: [
          { id: '2', type: 'dog' },
          { id: '3', type: 'dog' },
        ],
      });
    };

    store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          dogs: {
            data: [
              { type: 'dog', id: '2' },
              { type: 'dog', id: '3' },
            ],
          },
        },
      },
    });
    const person = store.peekRecord('person', '1');

    await person.dogs;
  });

  test('findHasMany receives a snapshot', async function (assert) {
    assert.expect(1);

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');
    class Person extends Model {
      @hasMany('dog', { async: true, inverse: null }) dogs;
    }

    this.owner.register('model:person', Person);

    adapter.findHasMany = function (store, snapshot, link, relationship) {
      assert.ok(snapshot instanceof Snapshot, 'snapshot is an instance of Snapshot');
      return Promise.resolve({
        data: [
          { id: '2', type: 'dog' },
          { id: '3', type: 'dog' },
        ],
      });
    };

    store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          dogs: {
            links: {
              related: 'dogs',
            },
          },
        },
      },
    });
    const person = store.peekRecord('person', '1');

    await person.dogs;
  });

  test('findBelongsTo receives a snapshot', async function (assert) {
    assert.expect(1);

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    class Person extends Model {
      @belongsTo('dog', { async: true, inverse: null }) dog;
    }

    this.owner.register('model:person', Person);

    adapter.findBelongsTo = function (store, snapshot, link, relationship) {
      assert.ok(snapshot instanceof Snapshot, 'snapshot is an instance of Snapshot');
      return Promise.resolve({ data: { id: '2', type: 'dog' } });
    };

    store.push({
      data: {
        type: 'person',
        id: '1',
        relationships: {
          dog: {
            links: {
              related: 'dog',
            },
          },
        },
      },
    });
    const person = store.peekRecord('person', '1');

    await person.dog;
  });

  test('record.save should pass adapterOptions to the updateRecord method', async function (assert) {
    assert.expect(1);

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    adapter.updateRecord = function (store, type, snapshot) {
      assert.deepEqual(snapshot.adapterOptions, { subscribe: true });
      return Promise.resolve({ data: { id: '1', type: 'person' } });
    };

    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom',
        },
      },
    });
    const person = store.peekRecord('person', '1');
    await person.save({ adapterOptions: { subscribe: true } });
  });

  test('record.save should pass adapterOptions to the createRecord method', async function (assert) {
    assert.expect(1);

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    adapter.createRecord = function (store, type, snapshot) {
      assert.deepEqual(snapshot.adapterOptions, { subscribe: true });
      return Promise.resolve({ data: { id: '1', type: 'person' } });
    };

    await store.createRecord('person', { name: 'Tom' }).save({ adapterOptions: { subscribe: true } });
  });

  test('record.save should pass adapterOptions to the deleteRecord method', async function (assert) {
    assert.expect(1);

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    adapter.deleteRecord = function (store, type, snapshot) {
      assert.deepEqual(snapshot.adapterOptions, { subscribe: true });
      return Promise.resolve({ data: { id: '1', type: 'person' } });
    };

    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom',
        },
      },
    });
    const person = store.peekRecord('person', '1');
    await person.destroyRecord({ adapterOptions: { subscribe: true } });
  });

  test('store.findRecord should pass adapterOptions to adapter.findRecord', async function (assert) {
    assert.expect(1);

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.deepEqual(snapshot.adapterOptions, { query: { embed: true } });
      return Promise.resolve({ data: { id: '1', type: 'person' } });
    };

    await store.findRecord('person', '1', { adapterOptions: { query: { embed: true } } });
  });

  test('store.query should pass adapterOptions to adapter.query ', async function (assert) {
    assert.expect(2);

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    adapter.query = function (store, type, query, array, options) {
      assert.notOk('adapterOptions' in query);
      assert.deepEqual(options.adapterOptions, { query: { embed: true } });
      return { data: [] };
    };

    await store.query('person', {}, { adapterOptions: { query: { embed: true } } });
  });

  test('store.queryRecord should pass adapterOptions to adapter.queryRecord', async function (assert) {
    assert.expect(2);

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    adapter.queryRecord = function (store, type, query, snapshot) {
      assert.notOk('adapterOptions' in query);
      assert.deepEqual(snapshot.adapterOptions, { query: { embed: true } });
      return { data: { type: 'person', id: '1', attributes: {} } };
    };

    await store.queryRecord('person', {}, { adapterOptions: { query: { embed: true } } });
  });

  test("store.findRecord should pass 'include' to adapter.findRecord", async function (assert) {
    assert.expect(1);

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    adapter.findRecord = (store, type, id, snapshot) => {
      assert.strictEqual(snapshot.include, 'books', 'include passed to adapter.findRecord');
      return Promise.resolve({ data: { id: '1', type: 'person' } });
    };

    await store.findRecord('person', '1', { include: 'books' });
  });

  test('store.findAll should pass adapterOptions to the adapter.findAll method', async function (assert) {
    assert.expect(1);

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    adapter.findAll = function (store, type, sinceToken, arraySnapshot) {
      const adapterOptions = arraySnapshot.adapterOptions;
      assert.deepEqual(adapterOptions, { query: { embed: true } });
      return Promise.resolve({ data: [{ id: '1', type: 'person' }] });
    };

    await store.findAll('person', { adapterOptions: { query: { embed: true } } });
  });

  test("store.findAll should pass 'include' to adapter.findAll", async function (assert) {
    assert.expect(1);

    const store = this.owner.lookup('service:store');
    const adapter = store.adapterFor('application');

    adapter.findAll = function (store, type, sinceToken, arraySnapshot) {
      assert.strictEqual(arraySnapshot.include, 'books', 'include passed to adapter.findAll');
      return Promise.resolve({ data: [{ id: '1', type: 'person' }] });
    };

    await store.findAll('person', { include: 'books' });
  });

  test('An async hasMany relationship with links should not trigger shouldBackgroundReloadRecord', async function (assert) {
    class Post extends Model {
      @attr('string') name;
      @hasMany('comment', { async: true, inverse: null }) comments;
    }

    class Comment extends Model {
      @attr('string') name;
    }

    class ApplicationAdapter extends RESTAdapter {
      findRecord() {
        return {
          posts: {
            id: '1',
            name: 'Rails is omakase',
            links: { comments: '/posts/1/comments' },
          },
        };
      }
      findHasMany() {
        return Promise.resolve({
          comments: [
            { id: '1', name: 'FIRST' },
            { id: '2', name: 'Rails is unagi' },
            { id: '3', name: 'What is omakase?' },
          ],
        });
      }
      shouldBackgroundReloadRecord() {
        assert.ok(false, 'shouldBackgroundReloadRecord should not be called');
      }
    }

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('adapter:application', ApplicationAdapter);
    this.owner.register('serializer:application', RESTSerializer.extend());

    const store = this.owner.lookup('service:store');

    const post = await store.findRecord('post', '1');

    const comments = await post.comments;

    assert.strictEqual(comments.length, 3);
  });

  testInDebug(
    'There should be a friendly error for if the adapter does not implement createRecord',
    async function (assert) {
      const store = this.owner.lookup('service:store');
      const adapter = store.adapterFor('application');

      adapter.createRecord = null;

      const tom = store.createRecord('person', { name: 'Tom Dale' });

      await assert.expectAssertion(async () => {
        await tom.save();
      }, /does not implement 'createRecord'/);

      moveRecordOutOfInFlight(tom);
    }
  );

  testInDebug(
    'There should be a friendly error for if the adapter does not implement updateRecord',
    async function (assert) {
      const store = this.owner.lookup('service:store');
      const adapter = store.adapterFor('application');

      adapter.updateRecord = null;

      const tom = store.push({ data: { type: 'person', id: '1' } });

      await assert.expectAssertion(async () => {
        await tom.save();
      }, /does not implement 'updateRecord'/);

      moveRecordOutOfInFlight(tom);
    }
  );

  testInDebug(
    'There should be a friendly error for if the adapter does not implement deleteRecord',
    async function (assert) {
      const store = this.owner.lookup('service:store');
      const adapter = store.adapterFor('application');

      adapter.deleteRecord = null;

      const tom = store.push({ data: { type: 'person', id: '1' } });

      await assert.expectAssertion(async () => {
        tom.deleteRecord();
        await tom.save();
      }, /does not implement 'deleteRecord'/);

      moveRecordOutOfInFlight(tom);
    }
  );
});
