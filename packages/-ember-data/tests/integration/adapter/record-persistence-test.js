import { module, test } from 'qunit';
import { allSettled, hash, resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

module('integration/adapter/record_persistence - Persisting Records', function(hooks) {
  setupTest(hooks);

  test("When a store is committed, the adapter's `updateRecord` method should be called with records that have been changed.", async function(assert) {
    assert.expect(2);

    const Person = Model.extend({
      updatedAt: attr('string'),
      name: attr('string'),
      firstName: attr('string'),
      lastName: attr('string'),
    });

    const ApplicationAdapter = Adapter.extend({
      shouldBackgroundReloadRecord: () => false,
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', ApplicationAdapter);
    this.owner.register('serializer:application', JSONAPISerializer.extend());

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.updateRecord = function(_store, type, snapshot) {
      assert.strictEqual(type, Person, "The type of the record is 'Person'");
      assert.strictEqual(snapshot.record, tom, 'The record in the snapshot is the correct one');

      return resolve();
    };

    const tom = store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Braaaahm Dale',
        },
      },
    });

    tom.set('name', 'Tom Dale');

    await tom.save();
  });

  test("When a store is committed, the adapter's `createRecord` method should be called with records that have been created.", async function(assert) {
    assert.expect(2);

    const Person = Model.extend({
      updatedAt: attr('string'),
      name: attr('string'),
      firstName: attr('string'),
      lastName: attr('string'),
    });

    const ApplicationAdapter = Adapter.extend({
      shouldBackgroundReloadRecord: () => false,
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', ApplicationAdapter);
    this.owner.register('serializer:application', JSONAPISerializer.extend());

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let tom;

    adapter.createRecord = function(_store, type, snapshot) {
      assert.strictEqual(type, Person, "The type of the record is 'Person'");
      assert.strictEqual(snapshot.record, tom, 'The record in the snapshot is the correct one');

      return resolve({ data: { id: '1', type: 'person', attributes: { name: 'Tom Dale' } } });
    };

    tom = store.createRecord('person', { name: 'Tom Dale' });

    return await tom.save();
  });

  test('After a created record has been assigned an ID, finding a record by that ID returns the original record.', async function(assert) {
    assert.expect(1);

    const Person = Model.extend({
      updatedAt: attr('string'),
      name: attr('string'),
      firstName: attr('string'),
      lastName: attr('string'),
    });

    const ApplicationAdapter = Adapter.extend({
      shouldBackgroundReloadRecord: () => false,
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', ApplicationAdapter);
    this.owner.register('serializer:application', JSONAPISerializer.extend());

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let tom;

    adapter.createRecord = function(store, type, snapshot) {
      return resolve({ data: { id: 1, type: 'person', attributes: { name: 'Tom Dale' } } });
    };

    tom = store.createRecord('person', { name: 'Tom Dale' });
    tom = await tom.save();

    let retrievedTom = await store.findRecord('person', '1');

    assert.strictEqual(tom, retrievedTom, 'The retrieved record is the same as the created record');
  });

  test("when a store is committed, the adapter's `deleteRecord` method should be called with records that have been deleted.", async function(assert) {
    const Person = Model.extend({
      updatedAt: attr('string'),
      name: attr('string'),
      firstName: attr('string'),
      lastName: attr('string'),
    });

    const ApplicationAdapter = Adapter.extend({
      shouldBackgroundReloadRecord: () => false,
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', ApplicationAdapter);
    this.owner.register('serializer:application', JSONAPISerializer.extend());

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.deleteRecord = function(_store, type, snapshot) {
      assert.strictEqual(type, Person, "The type of the record is 'Person'");
      assert.strictEqual(snapshot.record, tom, 'The record in the snapshot is the correct one');

      return resolve();
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

    let tom = await store.findRecord('person', '1');

    tom.deleteRecord();

    await tom.save();

    assert.strictEqual(tom.isDeleted, true, 'record is marked as deleted');
  });

  test('An adapter can notify the store that a record was updated and provide new data by calling `didSaveRecord`.', async function(assert) {
    const Person = Model.extend({
      updatedAt: attr('string'),
      name: attr('string'),
      firstName: attr('string'),
      lastName: attr('string'),
    });

    const ApplicationAdapter = Adapter.extend({
      shouldBackgroundReloadRecord: () => false,
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', ApplicationAdapter);
    this.owner.register('serializer:application', JSONAPISerializer.extend());

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.updateRecord = function(_store, _type, snapshot) {
      if (snapshot.id === '1') {
        return resolve({
          data: {
            id: '1',
            type: 'person',
            attributes: {
              name: 'Tom Dale',
              'updated-at': 'now',
            },
          },
        });
      }

      return resolve({
        data: {
          id: '2',
          type: 'person',
          attributes: { name: 'Yehuda Katz', 'updated-at': 'now!' },
        },
      });
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
            name: 'Gentile Katz',
          },
        },
      ],
    });

    let { tom, yehuda } = await hash({
      tom: store.findRecord('person', '1'),
      yehuda: store.findRecord('person', '2'),
    });

    tom.set('name', 'Draaaaaahm Dale');
    yehuda.set('name', 'Goy Katz');

    assert.strictEqual(tom.hasDirtyAttributes, true, 'Tom is dirty');
    assert.strictEqual(yehuda.hasDirtyAttributes, true, 'Yehuda is dirty');

    let [{ value: savedTom }, { value: savedYehuda }] = await allSettled([tom.save(), yehuda.save()]);

    assert.strictEqual(savedTom, tom, 'The record is correct');
    assert.strictEqual(savedYehuda, yehuda, 'The record is correct');
    assert.strictEqual(tom.hasDirtyAttributes, false, 'Tom is not dirty after saving record');
    assert.strictEqual(yehuda.hasDirtyAttributes, false, 'Yehuda is not dirty after dsaving record');
    assert.strictEqual(tom.name, 'Tom Dale', 'name attribute should reflect value of hash passed to didSaveRecords');
    assert.strictEqual(
      tom.updatedAt,
      'now',
      'updatedAt attribute should reflect value of hash passed to didSaveRecords'
    );
    assert.strictEqual(
      yehuda.name,
      'Yehuda Katz',
      'name attribute should reflect value of hash passed to didSaveRecords'
    );
    assert.strictEqual(
      yehuda.updatedAt,
      'now!',
      'updatedAt attribute should reflect value of hash passed to didSaveRecords'
    );
  });

  test('An adapter can notify the store that records were deleted by calling `didSaveRecords`.', async function(assert) {
    const Person = Model.extend({
      updatedAt: attr('string'),
      name: attr('string'),
      firstName: attr('string'),
      lastName: attr('string'),
    });

    const ApplicationAdapter = Adapter.extend({
      shouldBackgroundReloadRecord: () => false,
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', ApplicationAdapter);
    this.owner.register('serializer:application', JSONAPISerializer.extend());

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.deleteRecord = () => resolve();

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
            name: 'Gentile Katz',
          },
        },
      ],
    });

    let { tom, yehuda } = await hash({
      tom: store.findRecord('person', '1'),
      yehuda: store.findRecord('person', '2'),
    });

    assert.strictEqual(tom.isDeleted, false, 'Tom is not deleted');
    assert.strictEqual(yehuda.isDeleted, false, 'Yehuda is not deleted');

    await allSettled([tom.deleteRecord(), yehuda.deleteRecord()]);
    await allSettled([tom.save(), yehuda.save()]);

    assert.strictEqual(tom.isDeleted, true, 'Tom is marked as deleted');
    assert.strictEqual(yehuda.isDeleted, true, 'Yehuda is marked as deleted');
  });
});
