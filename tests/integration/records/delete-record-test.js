/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "(adam|dave|cersei)" }]*/

import { resolve, reject, all } from 'rsvp';
import { get } from '@ember/object';
import { run } from '@ember/runloop';
import JSONAPIAdapter from 'ember-data/adapters/json-api';
import JSONAPISerializer from 'ember-data/serializers/json-api';
import { setupTest } from 'ember-qunit';
import { module, test } from 'qunit';
import Model from 'ember-data/model';
import Store from 'ember-data/store';
import { InvalidError } from 'ember-data/adapters/errors';
import { attr, hasMany } from '@ember-decorators/data';
import todo from '../../helpers/todo';

class Person extends Model {
  @attr name;

  static toString() {
    return 'Person';
  }
}

module('integration/deletedRecord - Deleting Records', function(hooks) {
  let store, adapter;
  setupTest(hooks);

  hooks.beforeEach(function() {
    let { owner } = this;
    owner.register('service:store', Store);
    owner.register('model:person', Person);
    owner.register('adapter:application', JSONAPIAdapter);
    owner.register('serializer:application', JSONAPISerializer);

    store = owner.lookup('service:store');
    adapter = store.adapterFor('application');
  });

  test('records should not be removed from record arrays just after deleting, but only after committing them', async function(assert) {
    adapter.deleteRecord = function() {
      return resolve();
    };

    store.push({
      data: [
        {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Adam',
          },
        },
        {
          type: 'person',
          id: '2',
          attributes: {
            name: 'Dave',
          },
        },
      ],
    });
    let adam = store.peekRecord('person', 1);
    let all = store.peekAll('person');
    let entries = all.map(r => get(r, 'name'));

    // pre-condition
    assert.equal(all.get('length'), 2, 'pre-condition: 2 records in array');
    assert.deepEqual(
      entries,
      ['Adam', 'Dave'],
      'pre-condition: The correct records are in the array'
    );

    adam.deleteRecord();

    assert.equal(all.get('length'), 2, '2 records in array after deleteRecord');

    await adam.save();

    assert.equal(all.get('length'), 1, '1 record in array after deleteRecord and save');
  });

  test('deleting a record that is part of a hasMany removes it from the hasMany recordArray', async function(assert) {
    class Group extends Model {
      @hasMany('person', { inverse: null, async: false })
      people;

      static toString() {
        return 'Group';
      }
    }

    this.owner.register('model:group', Group);
    adapter.deleteRecord = function() {
      return resolve({
        data: null,
      });
    };

    let group = store.push({
      data: {
        type: 'group',
        id: '1',
        relationships: {
          people: {
            data: [{ type: 'person', id: '1' }, { type: 'person', id: '2' }],
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

    let person = store.peekRecord('person', '1');

    // Sanity Check we are in the correct state.
    assert.equal(group.get('people.length'), 2, 'expected 2 related records before delete');
    assert.deepEqual(
      group.get('people').map(p => get(p, 'name')),
      ['Adam Sunderland', 'Dave Sunderland'],
      'expected the right records before delete'
    );
    assert.equal(person.get('name'), 'Adam Sunderland', 'expected related records to be loaded');

    person.deleteRecord();

    await person.save();

    assert.equal(group.get('people.length'), 1, 'expected 1 related records after delete');
    assert.deepEqual(
      group.get('people').map(p => get(p, 'name')),
      ['Dave Sunderland'],
      'expected 1 related records after delete'
    );
  });

  test('We properly unload a record when destroyRecord is called', async function(assert) {
    class Group extends Model {
      @attr name;

      static toString() {
        return 'Group';
      }
    }

    adapter.shouldBackgroundReloadRecord = () => false;
    adapter.deleteRecord = function() {
      return resolve({
        data: {
          id: '1',
          type: 'group',
          attributes: {
            name: 'Deleted Checkers',
          },
        },
      });
    };

    this.owner.register('model:group', Group);

    let group = store.push({
      data: {
        type: 'group',
        id: '1',
        attributes: {
          name: 'Checkers',
        },
      },
    });

    assert.equal(group.get('name'), 'Checkers', 'We have the right group');

    await group.destroyRecord();

    const deletedGroup = store.peekRecord('group', '1');

    assert.ok(deletedGroup === null, 'expected to no longer have group 1');
  });

  test('records can be deleted during record array enumeration', async function(assert) {
    adapter.deleteRecord = function() {
      return resolve({
        data: null,
      });
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
    let dave = store.peekRecord('person', 2);
    let allPeople = store.peekAll('person');

    // pre-condition
    assert.equal(allPeople.get('length'), 2, 'expected 2 records');
    assert.deepEqual(allPeople.toArray(), [adam, dave], 'expected the right 2 records');

    let promises = allPeople.map(record => {
      record.deleteRecord();
      return record.save();
    });

    await all(promises);

    assert.equal(allPeople.get('length'), 0, 'expected 0 records');
    assert.equal(allPeople.objectAt(0), null, "can't get any records");
  });

  todo('Deleting an invalid newly created record should remove it from the store', async function(
    assert
  ) {
    adapter.createRecord = function() {
      return reject(
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
    assert.equal(
      get(store.peekAll('person'), 'length'),
      1,
      'The new person should be in the store'
    );

    let internalModel = record._internalModel;

    await record.destroyRecord();

    assert.equal(
      internalModel.currentState.stateName,
      'root.deleted.saved',
      'We reached the correct persisted saved state'
    );
    assert.equal(
      get(store.peekAll('person'), 'length'),
      0,
      'The new person should be removed from the store'
    );

    let cache = store._identityMap._map.person._models;
    assert.todo.ok(
      cache.indexOf(internalModel) === -1,
      'The internal model is removed from the cache'
    );
    assert.todo.equal(internalModel.isDestroying, true, 'The internal model is destroyed');
    assert.todo.equal(internalModel._isDematerializing, true, 'The internal model is unloaded');
  });

  test('Destroying an invalid newly created record should remove it from the store', async function(assert) {
    adapter.deleteRecord = function() {
      assert.fail(
        "The adapter's deletedRecord method should not be called when the record was created locally."
      );
    };
    adapter.createRecord = function() {
      return reject(
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
    assert.equal(
      get(store.peekAll('person'), 'length'),
      1,
      'The new person should be in the store'
    );
    let internalModel = record._internalModel;

    await record.destroyRecord();

    // it is uncertain that `root.empty` vs `root.deleted.saved` afterwards is correct
    //   but this is the expected result of `unloadRecord`. We may want a `root.deleted.saved.unloaded` state?
    assert.equal(
      internalModel.currentState.stateName,
      'root.empty',
      'We reached the correct persisted saved state'
    );
    assert.equal(
      get(store.peekAll('person'), 'length'),
      0,
      'The new person should be removed from the store'
    );

    let cache = store._identityMap._map.person._models;

    assert.ok(cache.indexOf(internalModel) === -1, 'The internal model is removed from the cache');
    assert.equal(internalModel.isDestroyed, true, 'The internal model is destroyed');
  });

  todo('Will resolve destroy and save in same loop', async function(assert) {
    let adam, dave;
    let promises;

    assert.expect(1);

    adapter.createRecord = function() {
      assert.ok(true, 'save operation resolves');
      return resolve({
        data: {
          id: 123,
          type: 'person',
        },
      });
    };

    adam = store.createRecord('person', { name: 'Adam Sunderland' });
    dave = store.createRecord('person', { name: 'Dave Sunderland' });

    run(function() {
      promises = [adam.destroyRecord(), dave.save()];
    });

    await all(promises);

    assert.todo.ok(
      false,
      'We need to test that the one record was destroyed, better test that the other was saved'
    );
  });
});
