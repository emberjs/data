/*eslint no-unused-vars: ["error", { "varsIgnorePattern": "(adam|dave|cersei)" }]*/

import { get } from '@ember/object';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { all, Promise as EmberPromise } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import { InvalidError } from '@ember-data/adapter/error';
import Model, { attr, hasMany } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

module('integration/deletedRecord - Deleting Records', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    const Person = Model.extend({
      name: attr('string'),
      toString: () => 'Person',
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', JSONAPISerializer.extend());
  });

  test('records should not be removed from record arrays just after deleting, but only after committing them', function(assert) {
    let adam, dave;

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.deleteRecord = function() {
      return EmberPromise.resolve();
    };

    var all;
    run(function() {
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
      adam = store.peekRecord('person', 1);
      dave = store.peekRecord('person', 2);
      all = store.peekAll('person');
    });

    // pre-condition
    assert.equal(all.get('length'), 2, 'pre-condition: 2 records in array');

    run(adam, 'deleteRecord');

    assert.equal(all.get('length'), 2, '2 records in array after deleteRecord');

    run(adam, 'save');

    assert.equal(all.get('length'), 1, '1 record in array after deleteRecord and save');
  });

  test('deleting a record that is part of a hasMany removes it from the hasMany recordArray', function(assert) {
    let group;
    let person;
    const Group = Model.extend({
      people: hasMany('person', { inverse: null, async: false }),
    });
    Group.toString = () => {
      return 'Group';
    };

    this.owner.register('model:group', Group);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.deleteRecord = function() {
      return EmberPromise.resolve();
    };

    run(function() {
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

      group = store.peekRecord('group', '1');
      person = store.peekRecord('person', '1');
    });

    // Sanity Check we are in the correct state.
    assert.equal(group.get('people.length'), 2, 'expected 2 related records before delete');
    assert.equal(person.get('name'), 'Adam Sunderland', 'expected related records to be loaded');

    run(function() {
      person.destroyRecord();
    });

    assert.equal(group.get('people.length'), 1, 'expected 1 related records after delete');
  });

  test('records can be deleted during record array enumeration', function(assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.deleteRecord = function() {
      return EmberPromise.resolve();
    };

    run(function() {
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
    });
    var all = store.peekAll('person');

    // pre-condition
    assert.equal(all.get('length'), 2, 'expected 2 records');

    run(function() {
      all.forEach(function(record) {
        record.destroyRecord();
      });
    });

    assert.equal(all.get('length'), 0, 'expected 0 records');
    assert.equal(all.objectAt(0), null, "can't get any records");
  });

  test('Deleting an invalid newly created record should remove it from the store', function(assert) {
    var record;

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.createRecord = function() {
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

    run(function() {
      record = store.createRecord('person', { name: 'pablobm' });
      // Invalidate the record to put it in the `root.loaded.created.invalid` state
      record.save().catch(() => {});
    });

    // Preconditions
    assert.equal(
      get(record, 'currentState.stateName'),
      'root.loaded.created.invalid',
      'records should start in the created.invalid state'
    );
    assert.equal(get(store.peekAll('person'), 'length'), 1, 'The new person should be in the store');

    run(function() {
      record.deleteRecord();
    });

    assert.equal(get(record, 'currentState.stateName'), 'root.deleted.saved');
    assert.equal(get(store.peekAll('person'), 'length'), 0, 'The new person should be removed from the store');
  });

  test('Destroying an invalid newly created record should remove it from the store', function(assert) {
    let record;

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.deleteRecord = function() {
      assert.fail("The adapter's deletedRecord method should not be called when the record was created locally.");
    };

    adapter.createRecord = function() {
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

    run(function() {
      record = store.createRecord('person', { name: 'pablobm' });
      // Invalidate the record to put it in the `root.loaded.created.invalid` state
      record.save().catch(() => {});
    });

    // Preconditions
    assert.equal(
      get(record, 'currentState.stateName'),
      'root.loaded.created.invalid',
      'records should start in the created.invalid state'
    );
    assert.equal(get(store.peekAll('person'), 'length'), 1, 'The new person should be in the store');

    run(function() {
      record.destroyRecord();
    });

    assert.equal(get(record, 'currentState.stateName'), 'root.deleted.saved');
    assert.equal(get(store.peekAll('person'), 'length'), 0, 'The new person should be removed from the store');
  });

  test('Will resolve destroy and save in same loop', function(assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let adam, dave;
    let promises;

    assert.expect(1);

    adapter.createRecord = function() {
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

    run(function() {
      promises = [adam.destroyRecord(), dave.save()];
    });

    return all(promises);
  });
});
