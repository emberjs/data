import { get, set } from '@ember/object';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { hash, Promise as EmberPromise, reject, resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import AdapterError, { InvalidError } from '@ember-data/adapter/error';
import JSONAPIAdapter from '@ember-data/adapter/json-api';
import RESTAdapter from '@ember-data/adapter/rest';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import RESTSerializer from '@ember-data/serializer/rest';
import { Snapshot } from '@ember-data/store/-private';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

function moveRecordOutOfInFlight(record) {
  // move record out of the inflight state so the tests can clean up
  // correctly
  let { store, _internalModel } = record;
  store.recordWasError(_internalModel, new Error());
}

module('integration/adapter/store-adapter - DS.Store and DS.Adapter integration test', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const Person = Model.extend({
      updatedAt: attr('string'),
      name: attr('string'),
    });

    const Dog = Model.extend({
      name: attr('string'),
    });

    this.owner.register('adapter:application', JSONAPIAdapter.extend());
    this.owner.register('serializer:application', JSONAPISerializer.extend());
    this.owner.register('model:person', Person);
    this.owner.register('model:dog', Dog);
  });

  test('Records loaded multiple times and retrieved in recordArray are ready to send state events', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.query = function (store, type, query, recordArray) {
      return resolve({
        data: [
          {
            id: 1,
            type: 'person',
            attributes: {
              name: 'Mickael Ramírez',
            },
          },
          {
            id: 2,
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
    assert.equal(people2.get('length'), 2, 'return the elements');
    assert.ok(people2.get('isLoaded'), 'array is loaded');

    const person = people.objectAt(0);
    assert.ok(person.isLoaded, 'record is loaded');

    // delete record will not throw exception
    person.deleteRecord();
  });

  test('by default, createRecords calls createRecord once per record', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let Person = store.modelFor('person');

    let count = 1;
    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.createRecord = function (store, type, snapshot) {
      assert.equal(type, Person, 'the type is correct');

      if (count === 1) {
        assert.equal(snapshot.attr('name'), 'Tom Dale');
      } else if (count === 2) {
        assert.equal(snapshot.attr('name'), 'Yehuda Katz');
      } else {
        assert.ok(false, 'should not have invoked more than 2 times');
      }

      let hash = snapshot.attributes();
      let recordId = count;
      hash['updated-at'] = 'now';

      count++;
      return resolve({
        data: {
          id: recordId,
          type: 'person',
          attributes: hash,
        },
      });
    };

    let tom = store.createRecord('person', { name: 'Tom Dale' });
    let yehuda = store.createRecord('person', { name: 'Yehuda Katz' });

    let promise = run(() => {
      return hash({
        tom: tom.save(),
        yehuda: yehuda.save(),
      });
    });

    return promise.then((records) => {
      tom = records.tom;
      yehuda = records.yehuda;

      assert.asyncEqual(tom, store.findRecord('person', 1), 'Once an ID is in, findRecord returns the same object');
      assert.asyncEqual(yehuda, store.findRecord('person', 2), 'Once an ID is in, findRecord returns the same object');
      assert.equal(get(tom, 'updatedAt'), 'now', 'The new information is received');
      assert.equal(get(yehuda, 'updatedAt'), 'now', 'The new information is received');
    });
  });

  test('by default, updateRecords calls updateRecord once per record', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let Person = store.modelFor('person');

    let count = 0;
    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.updateRecord = function (store, type, snapshot) {
      assert.equal(type, Person, 'the type is correct');

      if (count === 0) {
        assert.equal(snapshot.attr('name'), 'Tom Dale');
      } else if (count === 1) {
        assert.equal(snapshot.attr('name'), 'Yehuda Katz');
      } else {
        assert.ok(false, 'should not get here');
      }

      count++;

      assert.true(snapshot.record.get('isSaving'), 'record is saving');

      return resolve();
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

    let promise = run(() => {
      return hash({
        tom: store.findRecord('person', 1),
        yehuda: store.findRecord('person', 2),
      });
    });

    return promise
      .then((records) => {
        let tom = records.tom;
        let yehuda = records.yehuda;

        set(tom, 'name', 'Tom Dale');
        set(yehuda, 'name', 'Yehuda Katz');

        return hash({
          tom: tom.save(),
          yehuda: yehuda.save(),
        });
      })
      .then((records) => {
        let tom = records.tom;
        let yehuda = records.yehuda;

        assert.false(tom.get('isSaving'), 'record is no longer saving');
        assert.true(tom.get('isLoaded'), 'record is loaded');

        assert.false(yehuda.get('isSaving'), 'record is no longer saving');
        assert.true(yehuda.get('isLoaded'), 'record is loaded');
      });
  });

  test('calling store.didSaveRecord can provide an optional hash', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let Person = store.modelFor('person');

    let count = 0;
    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.updateRecord = function (store, type, snapshot) {
      assert.equal(type, Person, 'the type is correct');

      count++;
      if (count === 1) {
        assert.equal(snapshot.attr('name'), 'Tom Dale');
        return resolve({
          data: { id: 1, type: 'person', attributes: { name: 'Tom Dale', 'updated-at': 'now' } },
        });
      } else if (count === 2) {
        assert.equal(snapshot.attr('name'), 'Yehuda Katz');
        return resolve({
          data: {
            id: 2,
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

    let promise = run(() => {
      return hash({
        tom: store.findRecord('person', 1),
        yehuda: store.findRecord('person', 2),
      });
    });

    return promise
      .then((records) => {
        let tom = records.tom;
        let yehuda = records.yehuda;

        set(tom, 'name', 'Tom Dale');
        set(yehuda, 'name', 'Yehuda Katz');

        return hash({
          tom: tom.save(),
          yehuda: yehuda.save(),
        });
      })
      .then((records) => {
        let tom = records.tom;
        let yehuda = records.yehuda;

        assert.false(get(tom, 'hasDirtyAttributes'), 'the record should not be dirty');
        assert.equal(get(tom, 'updatedAt'), 'now', 'the hash was updated');

        assert.false(get(yehuda, 'hasDirtyAttributes'), 'the record should not be dirty');
        assert.equal(get(yehuda, 'updatedAt'), 'now!', 'the hash was updated');
      });
  });

  test('by default, deleteRecord calls deleteRecord once per record', function (assert) {
    assert.expect(4);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let Person = store.modelFor('person');

    let count = 0;
    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.deleteRecord = function (store, type, snapshot) {
      assert.equal(type, Person, 'the type is correct');

      if (count === 0) {
        assert.equal(snapshot.attr('name'), 'Tom Dale');
      } else if (count === 1) {
        assert.equal(snapshot.attr('name'), 'Yehuda Katz');
      } else {
        assert.ok(false, 'should not get here');
      }

      count++;

      return resolve();
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

    let promise = run(() => {
      return hash({
        tom: store.findRecord('person', 1),
        yehuda: store.findRecord('person', 2),
      });
    });

    return promise.then((records) => {
      let tom = records.tom;
      let yehuda = records.yehuda;

      tom.deleteRecord();
      yehuda.deleteRecord();

      return EmberPromise.all([tom.save(), yehuda.save()]);
    });
  });

  test('by default, destroyRecord calls deleteRecord once per record without requiring .save', function (assert) {
    assert.expect(4);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let Person = store.modelFor('person');

    let count = 0;

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.deleteRecord = function (store, type, snapshot) {
      assert.equal(type, Person, 'the type is correct');

      if (count === 0) {
        assert.equal(snapshot.attr('name'), 'Tom Dale');
      } else if (count === 1) {
        assert.equal(snapshot.attr('name'), 'Yehuda Katz');
      } else {
        assert.ok(false, 'should not get here');
      }

      count++;

      return resolve();
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

    let promise = run(() => {
      return hash({
        tom: store.findRecord('person', 1),
        yehuda: store.findRecord('person', 2),
      });
    });

    return promise.then((records) => {
      let tom = records.tom;
      let yehuda = records.yehuda;

      return EmberPromise.all([tom.destroyRecord(), yehuda.destroyRecord()]);
    });
  });

  test('if an existing model is edited then deleted, deleteRecord is called on the adapter', async function (assert) {
    assert.expect(5);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let count = 0;
    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.deleteRecord = function (store, type, snapshot) {
      count++;
      assert.equal(snapshot.id, 'deleted-record', 'should pass correct record to deleteRecord');
      assert.equal(count, 1, 'should only call deleteRecord method of adapter once');

      return resolve();
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

    assert.true(get(tom, 'hasDirtyAttributes'), 'precond - record should be dirty after editing');

    tom.deleteRecord();
    await tom.save();
    assert.false(get(tom, 'hasDirtyAttributes'), 'record should not be dirty');
    assert.true(get(tom, 'isDeleted'), 'record should be considered deleted');
  });

  test('if a deleted record errors, it enters the error state', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let count = 0;
    let error = new AdapterError();

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.deleteRecord = function (store, type, snapshot) {
      if (count++ === 0) {
        return reject(error);
      } else {
        return resolve();
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
      assert.equal(tom.adapterError, error, 'error object is exposed');

      // this time it succeeds
      await tom.save();

      assert.false(tom.isError, 'Tom is not errored anymore');
      assert.equal(tom.adapterError, null, 'error object is discarded');
    }
  });

  test('if a created record is marked as invalid by the server, it enters an error state', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let Person = store.modelFor('person');

    adapter.createRecord = function (store, type, snapshot) {
      assert.equal(type, Person, 'the type is correct');

      if (snapshot.attr('name').indexOf('Bro') === -1) {
        return reject(
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
        return resolve();
      }
    };

    let yehuda = store.createRecord('person', { id: 1, name: 'Yehuda Katz' });
    // Wrap this in an Ember.run so that all chained async behavior is set up
    // before flushing any scheduled behavior.

    try {
      await yehuda.save();
      assert.ok(false, 'We should have erred');
    } catch (e) {
      assert.false(get(yehuda, 'isValid'), 'the record is invalid');
      assert.ok(get(yehuda, 'errors.name'), 'The errors.name property exists');

      set(yehuda, 'updatedAt', true);
      assert.false(get(yehuda, 'isValid'), 'the record is still invalid');

      set(yehuda, 'name', 'Brohuda Brokatz');

      assert.true(get(yehuda, 'isValid'), 'the record is no longer invalid after changing');
      assert.true(get(yehuda, 'hasDirtyAttributes'), 'the record has outstanding changes');

      assert.true(get(yehuda, 'isNew'), 'precond - record is still new');

      let person = await yehuda.save();

      assert.strictEqual(person, yehuda, 'The promise resolves with the saved record');

      assert.true(get(yehuda, 'isValid'), 'record remains valid after committing');
      assert.false(get(yehuda, 'isNew'), 'record is no longer new');
    }
  });

  test('allows errors on arbitrary properties on create', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.createRecord = function (store, type, snapshot) {
      if (snapshot.attr('name').indexOf('Bro') === -1) {
        return reject(
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
        return resolve();
      }
    };

    let yehuda = store.createRecord('person', { id: 1, name: 'Yehuda Katz' });

    // Wrap this in an Ember.run so that all chained async behavior is set up
    // before flushing any scheduled behavior.

    return yehuda
      .save()
      .catch((error) => {
        assert.false(get(yehuda, 'isValid'), 'the record is invalid');
        assert.ok(get(yehuda, 'errors.base'), 'The errors.base property exists');
        assert.deepEqual(get(yehuda, 'errors').errorsFor('base'), [
          { attribute: 'base', message: 'is a generally unsavoury character' },
        ]);

        set(yehuda, 'updatedAt', true);
        assert.false(get(yehuda, 'isValid'), 'the record is still invalid');

        set(yehuda, 'name', 'Brohuda Brokatz');

        assert.false(get(yehuda, 'isValid'), 'the record is still invalid as far as we know');
        assert.true(get(yehuda, 'hasDirtyAttributes'), 'the record has outstanding changes');

        assert.true(get(yehuda, 'isNew'), 'precond - record is still new');

        return yehuda.save();
      })
      .then((person) => {
        assert.strictEqual(person, yehuda, 'The promise resolves with the saved record');
        assert.notOk(get(yehuda, 'errors.base'), 'The errors.base property does not exist');
        assert.deepEqual(get(yehuda, 'errors').errorsFor('base'), []);
        assert.true(get(yehuda, 'isValid'), 'record remains valid after committing');
        assert.false(get(yehuda, 'isNew'), 'record is no longer new');
      });
  });

  test('if a created record is marked as invalid by the server, you can attempt the save again', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let Person = store.modelFor('person');

    let saveCount = 0;
    adapter.createRecord = function (store, type, snapshot) {
      assert.equal(type, Person, 'the type is correct');
      saveCount++;

      if (snapshot.attr('name').indexOf('Bro') === -1) {
        return reject(
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
        return resolve();
      }
    };

    let yehuda = store.createRecord('person', { id: 1, name: 'Yehuda Katz' });

    // Wrap this in an Ember.run so that all chained async behavior is set up
    // before flushing any scheduled behavior.

    return yehuda
      .save()
      .catch((reason) => {
        assert.equal(saveCount, 1, 'The record has been saved once');
        assert.ok(
          reason.message.match('The adapter rejected the commit because it was invalid'),
          'It should fail due to being invalid'
        );
        assert.false(get(yehuda, 'isValid'), 'the record is invalid');
        assert.true(get(yehuda, 'hasDirtyAttributes'), 'the record has outstanding changes');
        assert.ok(get(yehuda, 'errors.name'), 'The errors.name property exists');
        assert.true(get(yehuda, 'isNew'), 'precond - record is still new');
        return yehuda.save();
      })
      .catch((reason) => {
        assert.equal(saveCount, 2, 'The record has been saved twice');
        assert.ok(
          reason.message.match('The adapter rejected the commit because it was invalid'),
          'It should fail due to being invalid'
        );
        assert.false(get(yehuda, 'isValid'), 'the record is still invalid');
        assert.true(get(yehuda, 'hasDirtyAttributes'), 'the record has outstanding changes');
        assert.ok(get(yehuda, 'errors.name'), 'The errors.name property exists');
        assert.true(get(yehuda, 'isNew'), 'precond - record is still new');
        set(yehuda, 'name', 'Brohuda Brokatz');
        return yehuda.save();
      })
      .then((person) => {
        assert.equal(saveCount, 3, 'The record has been saved thrice');
        assert.true(get(yehuda, 'isValid'), 'record is valid');
        assert.false(get(yehuda, 'hasDirtyAttributes'), 'record is not dirty');
        assert.true(get(yehuda, 'errors.isEmpty'), 'record has no errors');
      });
  });

  test('if a created record is marked as erred by the server, it enters an error state', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let error = new AdapterError();

    adapter.createRecord = function (store, type, snapshot) {
      return reject(error);
    };

    let person = store.createRecord('person', { id: 1, name: 'John Doe' });

    return person.save().catch(() => {
      assert.ok(get(person, 'isError'), 'the record is in the error state');
      assert.equal(get(person, 'adapterError'), error, 'error object is exposed');
    });
  });

  test('if an updated record is marked as invalid by the server, it enters an error state', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let Person = store.modelFor('person');

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.updateRecord = function (store, type, snapshot) {
      assert.equal(type, Person, 'the type is correct');

      if (snapshot.attr('name').indexOf('Bro') === -1) {
        return reject(
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
        return resolve();
      }
    };

    let yehuda = run(() => {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Brohuda Brokatz',
          },
        },
      });

      return store.peekRecord('person', 1);
    });

    return store
      .findRecord('person', 1)
      .then((person) => {
        assert.equal(person, yehuda, 'The same object is passed through');

        assert.true(get(yehuda, 'isValid'), 'precond - the record is valid');
        set(yehuda, 'name', 'Yehuda Katz');
        assert.true(get(yehuda, 'isValid'), 'precond - the record is still valid as far as we know');

        assert.true(get(yehuda, 'hasDirtyAttributes'), 'the record is dirty');

        return yehuda.save();
      })
      .catch((reason) => {
        assert.true(get(yehuda, 'hasDirtyAttributes'), 'the record is still dirty');
        assert.false(get(yehuda, 'isValid'), 'the record is invalid');

        set(yehuda, 'updatedAt', true);
        assert.false(get(yehuda, 'isValid'), 'the record is still invalid');

        set(yehuda, 'name', 'Brohuda Brokatz');
        assert.true(get(yehuda, 'isValid'), 'the record is no longer invalid after changing');
        assert.true(get(yehuda, 'hasDirtyAttributes'), 'the record has outstanding changes');

        return yehuda.save();
      })
      .then((yehuda) => {
        assert.true(get(yehuda, 'isValid'), 'record remains valid after committing');
        assert.false(get(yehuda, 'hasDirtyAttributes'), 'record is no longer new');
      });
  });

  test('records can have errors on arbitrary properties after update', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.updateRecord = function (store, type, snapshot) {
      if (snapshot.attr('name').indexOf('Bro') === -1) {
        return reject(
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
        return resolve();
      }
    };

    let yehuda = run(() => {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Brohuda Brokatz',
          },
        },
      });
      return store.peekRecord('person', 1);
    });

    return store
      .findRecord('person', 1)
      .then((person) => {
        assert.equal(person, yehuda, 'The same object is passed through');

        assert.true(get(yehuda, 'isValid'), 'precond - the record is valid');
        set(yehuda, 'name', 'Yehuda Katz');
        assert.true(get(yehuda, 'isValid'), 'precond - the record is still valid as far as we know');

        assert.true(get(yehuda, 'hasDirtyAttributes'), 'the record is dirty');

        return yehuda.save();
      })
      .catch((reason) => {
        assert.true(get(yehuda, 'hasDirtyAttributes'), 'the record is still dirty');
        assert.false(get(yehuda, 'isValid'), 'the record is invalid');
        assert.ok(get(yehuda, 'errors.base'), 'The errors.base property exists');
        assert.deepEqual(get(yehuda, 'errors').errorsFor('base'), [
          { attribute: 'base', message: 'is a generally unsavoury character' },
        ]);

        set(yehuda, 'updatedAt', true);
        assert.false(get(yehuda, 'isValid'), 'the record is still invalid');

        set(yehuda, 'name', 'Brohuda Brokatz');
        assert.false(
          get(yehuda, 'isValid'),
          "the record is still invalid after changing (only server can know if it's now valid)"
        );
        assert.true(get(yehuda, 'hasDirtyAttributes'), 'the record has outstanding changes');

        return yehuda.save();
      })
      .then((yehuda) => {
        assert.true(get(yehuda, 'isValid'), 'record remains valid after committing');
        assert.false(get(yehuda, 'hasDirtyAttributes'), 'record is no longer new');
        assert.notOk(get(yehuda, 'errors.base'), 'The errors.base property does not exist');
        assert.deepEqual(get(yehuda, 'errors').errorsFor('base'), []);
      });
  });

  test('if an updated record is marked as invalid by the server, you can attempt the save again', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let Person = store.modelFor('person');

    let saveCount = 0;
    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.updateRecord = function (store, type, snapshot) {
      assert.equal(type, Person, 'the type is correct');
      saveCount++;
      if (snapshot.attr('name').indexOf('Bro') === -1) {
        return reject(
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
        return resolve();
      }
    };

    let yehuda = run(() => {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Brohuda Brokatz',
          },
        },
      });
      return store.peekRecord('person', 1);
    });

    return store
      .findRecord('person', 1)
      .then((person) => {
        assert.equal(person, yehuda, 'The same object is passed through');

        assert.true(get(yehuda, 'isValid'), 'precond - the record is valid');
        set(yehuda, 'name', 'Yehuda Katz');
        assert.true(get(yehuda, 'isValid'), 'precond - the record is still valid as far as we know');

        assert.true(get(yehuda, 'hasDirtyAttributes'), 'the record is dirty');

        return yehuda.save();
      })
      .catch((reason) => {
        assert.equal(saveCount, 1, 'The record has been saved once');
        assert.ok(
          reason.message.match('The adapter rejected the commit because it was invalid'),
          'It should fail due to being invalid'
        );
        assert.true(get(yehuda, 'hasDirtyAttributes'), 'the record is still dirty');
        assert.false(get(yehuda, 'isValid'), 'the record is invalid');
        return yehuda.save();
      })
      .catch((reason) => {
        assert.equal(saveCount, 2, 'The record has been saved twice');
        assert.ok(
          reason.message.match('The adapter rejected the commit because it was invalid'),
          'It should fail due to being invalid'
        );
        assert.false(get(yehuda, 'isValid'), 'record is still invalid');
        assert.true(get(yehuda, 'hasDirtyAttributes'), 'record is still dirty');
        set(yehuda, 'name', 'Brohuda Brokatz');
        return yehuda.save();
      })
      .then((person) => {
        assert.equal(saveCount, 3, 'The record has been saved thrice');
        assert.true(get(yehuda, 'isValid'), 'record is valid');
        assert.false(get(yehuda, 'hasDirtyAttributes'), 'record is not dirty');
        assert.true(get(yehuda, 'errors.isEmpty'), 'record has no errors');
      });
  });

  test('if a updated record is marked as erred by the server, it enters an error state', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let error = new AdapterError();

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.updateRecord = function (store, type, snapshot) {
      return reject(error);
    };

    let person = run(() => {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'John Doe',
          },
        },
      });
      return store.peekRecord('person', 1);
    });

    store
      .findRecord('person', 1)
      .then((record) => {
        assert.equal(record, person, 'The person was resolved');
        person.set('name', 'Jonathan Doe');
        return person.save();
      })
      .catch((reason) => {
        assert.ok(get(person, 'isError'), 'the record is in the error state');
        assert.equal(get(person, 'adapterError'), error, 'error object is exposed');
      });
  });

  test('can be created after the Store', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let Person = store.modelFor('person');

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.equal(type, Person, 'the type is correct');
      return resolve({ data: { id: 1, type: 'person' } });
    };

    store.findRecord('person', 1);
  });

  test('relationships returned via `commit` do not trigger additional findManys', async function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let Person = store.modelFor('person');

    Person.reopen({
      dogs: hasMany('dog', { async: false }),
    });

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
      return resolve({
        data: {
          id: 1,
          type: 'person',
          attributes: { name: 'Tom Dale' },
          relationships: {
            dogs: {
              data: [{ id: 1, type: 'dog' }],
            },
          },
        },
      });
    };

    adapter.updateRecord = function (store, type, snapshot) {
      return new EmberPromise((resolve, reject) => {
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

        resolve({ data: { id: 1, type: 'dog', attributes: { name: 'Scruffy' } } });
      });
    };

    adapter.findMany = function (store, type, ids, snapshots) {
      assert.ok(false, 'Should not get here');
    };

    const person = await store.findRecord('person', '1');
    const dog = await store.findRecord('dog', '1');
    await dog.save();
    await person.get('dogs');

    assert.ok(true, 'no findMany triggered');
  });

  test("relationships don't get reset if the links is the same", function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let Person = store.modelFor('person');

    Person.reopen({
      dogs: hasMany({ async: true }),
    });

    adapter.shouldBackgroundReloadRecord = () => false;

    let count = 0;
    adapter.findHasMany = function (store, snapshot, link, relationship) {
      assert.ok(count++ === 0, 'findHasMany is only called once');

      return resolve({ data: [{ id: 1, type: 'dog', attributes: { name: 'Scruffy' } }] });
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

    let tom, dogs;

    store
      .findRecord('person', 1)
      .then((person) => {
        tom = person;
        dogs = tom.get('dogs');
        return dogs;
      })
      .then((dogs) => {
        assert.equal(dogs.get('length'), 1, 'The dogs are loaded');
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
        assert.ok(typeof tom.dogs.then === 'function', 'dogs is a thenable');
        return tom.get('dogs');
      })
      .then((dogs) => {
        assert.equal(dogs.get('length'), 1, 'The same dogs are loaded');
      });
  });

  test('async hasMany always returns a promise', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let Person = store.modelFor('person');

    Person.reopen({
      dogs: hasMany({ async: true }),
    });

    adapter.createRecord = function (store, type, snapshot) {
      return resolve({
        data: {
          id: 1,
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

    let tom = store.createRecord('person', { name: 'Tom Dale' });

    assert.ok(typeof tom.dogs.then === 'function', 'dogs is a thenable before save');

    return tom.save().then(() => {
      assert.ok(typeof tom.dogs.then === 'function', 'dogs is a thenable after save');
    });
  });

  test('createRecord receives a snapshot', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.createRecord = function (store, type, snapshot) {
      assert.ok(snapshot instanceof Snapshot, 'snapshot is an instance of Snapshot');
      return resolve();
    };

    let record = store.createRecord('person', { name: 'Tom Dale', id: 1 });

    record.save();
  });

  test('updateRecord receives a snapshot', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.updateRecord = function (store, type, snapshot) {
      assert.ok(snapshot instanceof Snapshot, 'snapshot is an instance of Snapshot');
      return resolve();
    };

    let person;

    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale',
        },
      },
    });
    person = store.peekRecord('person', 1);

    set(person, 'name', 'Tomster');
    person.save();
  });

  test('deleteRecord receives a snapshot', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.deleteRecord = function (store, type, snapshot) {
      assert.ok(snapshot instanceof Snapshot, 'snapshot is an instance of Snapshot');
      return resolve();
    };

    let person;

    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale',
        },
      },
    });
    person = store.peekRecord('person', 1);

    person.deleteRecord();
    return person.save();
  });

  test('findRecord receives a snapshot', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.ok(snapshot instanceof Snapshot, 'snapshot is an instance of Snapshot');
      return resolve({ data: { id: 1, type: 'person' } });
    };

    store.findRecord('person', 1);
  });

  test('findMany receives an array of snapshots', function (assert) {
    assert.expect(2);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let Person = store.modelFor('person');

    Person.reopen({
      dogs: hasMany({ async: true }),
    });

    adapter.coalesceFindRequests = true;
    adapter.findMany = function (store, type, ids, snapshots) {
      assert.ok(snapshots[0] instanceof Snapshot, 'snapshots[0] is an instance of Snapshot');
      assert.ok(snapshots[1] instanceof Snapshot, 'snapshots[1] is an instance of Snapshot');
      return resolve({
        data: [
          { id: 2, type: 'dog' },
          { id: 3, type: 'dog' },
        ],
      });
    };

    let person;

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
    person = store.peekRecord('person', 1);

    person.get('dogs');
  });

  test('findHasMany receives a snapshot', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let Person = store.modelFor('person');

    Person.reopen({
      dogs: hasMany({ async: true }),
    });

    adapter.findHasMany = function (store, snapshot, link, relationship) {
      assert.ok(snapshot instanceof Snapshot, 'snapshot is an instance of Snapshot');
      return resolve({
        data: [
          { id: 2, type: 'dog' },
          { id: 3, type: 'dog' },
        ],
      });
    };

    let person;

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
    person = store.peekRecord('person', 1);

    person.get('dogs');
  });

  test('findBelongsTo receives a snapshot', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let Person = store.modelFor('person');

    Person.reopen({
      dog: belongsTo({ async: true }),
    });

    adapter.findBelongsTo = function (store, snapshot, link, relationship) {
      assert.ok(snapshot instanceof Snapshot, 'snapshot is an instance of Snapshot');
      return resolve({ data: { id: 2, type: 'dog' } });
    };

    let person;

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
    person = store.peekRecord('person', 1);

    person.get('dog');
  });

  test('record.save should pass adapterOptions to the updateRecord method', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.updateRecord = function (store, type, snapshot) {
      assert.deepEqual(snapshot.adapterOptions, { subscribe: true });
      return resolve({ data: { id: 1, type: 'person' } });
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
    let person = store.peekRecord('person', 1);
    return person.save({ adapterOptions: { subscribe: true } });
  });

  test('record.save should pass adapterOptions to the createRecord method', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.createRecord = function (store, type, snapshot) {
      assert.deepEqual(snapshot.adapterOptions, { subscribe: true });
      return resolve({ data: { id: 1, type: 'person' } });
    };

    store.createRecord('person', { name: 'Tom' }).save({ adapterOptions: { subscribe: true } });
  });

  test('record.save should pass adapterOptions to the deleteRecord method', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.deleteRecord = function (store, type, snapshot) {
      assert.deepEqual(snapshot.adapterOptions, { subscribe: true });
      return resolve({ data: { id: 1, type: 'person' } });
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
    let person = store.peekRecord('person', 1);
    person.destroyRecord({ adapterOptions: { subscribe: true } });
  });

  test('store.findRecord should pass adapterOptions to adapter.findRecord', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = function (store, type, id, snapshot) {
      assert.deepEqual(snapshot.adapterOptions, { query: { embed: true } });
      return resolve({ data: { id: 1, type: 'person' } });
    };

    return store.findRecord('person', 1, { adapterOptions: { query: { embed: true } } });
  });

  test('store.query should pass adapterOptions to adapter.query ', function (assert) {
    assert.expect(2);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.query = function (store, type, query, array, options) {
      assert.notOk('adapterOptions' in query);
      assert.deepEqual(options.adapterOptions, { query: { embed: true } });
      return { data: [] };
    };

    return store.query('person', {}, { adapterOptions: { query: { embed: true } } });
  });

  test('store.queryRecord should pass adapterOptions to adapter.queryRecord', function (assert) {
    assert.expect(2);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.queryRecord = function (store, type, query, snapshot) {
      assert.notOk('adapterOptions' in query);
      assert.deepEqual(snapshot.adapterOptions, { query: { embed: true } });
      return { data: { type: 'person', id: 1, attributes: {} } };
    };

    return store.queryRecord('person', {}, { adapterOptions: { query: { embed: true } } });
  });

  test("store.findRecord should pass 'include' to adapter.findRecord", function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findRecord = (store, type, id, snapshot) => {
      assert.equal(snapshot.include, 'books', 'include passed to adapter.findRecord');
      return resolve({ data: { id: 1, type: 'person' } });
    };

    store.findRecord('person', 1, { include: 'books' });
  });

  test('store.findAll should pass adapterOptions to the adapter.findAll method', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findAll = function (store, type, sinceToken, arraySnapshot) {
      let adapterOptions = arraySnapshot.adapterOptions;
      assert.deepEqual(adapterOptions, { query: { embed: true } });
      return resolve({ data: [{ id: 1, type: 'person' }] });
    };

    return store.findAll('person', { adapterOptions: { query: { embed: true } } });
  });

  test("store.findAll should pass 'include' to adapter.findAll", function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.findAll = function (store, type, sinceToken, arraySnapshot) {
      assert.equal(arraySnapshot.include, 'books', 'include passed to adapter.findAll');
      return resolve({ data: [{ id: 1, type: 'person' }] });
    };

    store.findAll('person', { include: 'books' });
  });

  test('An async hasMany relationship with links should not trigger shouldBackgroundReloadRecord', function (assert) {
    const Post = Model.extend({
      name: attr('string'),
      comments: hasMany('comment', { async: true }),
    });

    const Comment = Model.extend({
      name: attr('string'),
    });

    const ApplicationAdapter = RESTAdapter.extend({
      findRecord() {
        return {
          posts: {
            id: 1,
            name: 'Rails is omakase',
            links: { comments: '/posts/1/comments' },
          },
        };
      },
      findHasMany() {
        return resolve({
          comments: [
            { id: 1, name: 'FIRST' },
            { id: 2, name: 'Rails is unagi' },
            { id: 3, name: 'What is omakase?' },
          ],
        });
      },
      shouldBackgroundReloadRecord() {
        assert.ok(false, 'shouldBackgroundReloadRecord should not be called');
      },
    });

    this.owner.register('model:post', Post);
    this.owner.register('model:comment', Comment);
    this.owner.register('adapter:application', ApplicationAdapter);
    this.owner.register('serializer:application', RESTSerializer.extend());

    let store = this.owner.lookup('service:store');

    store
      .findRecord('post', '1')
      .then((post) => {
        return post.get('comments');
      })
      .then((comments) => {
        assert.equal(comments.get('length'), 3);
      });
  });

  testInDebug('There should be a friendly error for if the adapter does not implement createRecord', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.createRecord = null;

    let tom = run(() => store.createRecord('person', { name: 'Tom Dale' }));

    assert.expectAssertion(() => {
      run(() => tom.save());
    }, /does not implement 'createRecord'/);

    moveRecordOutOfInFlight(tom);
  });

  testInDebug('There should be a friendly error for if the adapter does not implement updateRecord', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.updateRecord = null;

    let tom = run(() => store.push({ data: { type: 'person', id: 1 } }));
    assert.expectAssertion(() => {
      run(() => tom.save());
    }, /does not implement 'updateRecord'/);

    moveRecordOutOfInFlight(tom);
  });

  testInDebug('There should be a friendly error for if the adapter does not implement deleteRecord', function (assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.deleteRecord = null;

    let tom = run(() => store.push({ data: { type: 'person', id: 1 } }));

    assert.expectAssertion(() => {
      run(() => {
        tom.deleteRecord();
        return tom.save();
      });
    }, /does not implement 'deleteRecord'/);

    moveRecordOutOfInFlight(tom);
  });
});
