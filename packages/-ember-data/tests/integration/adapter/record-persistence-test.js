import { get, set } from '@ember/object';
import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import RSVP, { all, hash, resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

module('integration/adapter/record_persistence - Persisting Records', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
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
  });

  test("When a store is committed, the adapter's `updateRecord` method should be called with records that have been changed.", async function(assert) {
    assert.expect(2);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let Person = store.modelFor('person');

    adapter.updateRecord = function(store, type, snapshot) {
      assert.equal(type, Person, 'the type is correct');
      assert.equal(snapshot.record, tom, 'the record is correct');

      return run(RSVP, 'resolve');
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

    set(tom, 'name', 'Tom Dale');
    await tom.save();
  });

  test("When a store is committed, the adapter's `commit` method should be called with records that have been created.", function(assert) {
    assert.expect(2);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let Person = store.modelFor('person');

    let tom;

    adapter.createRecord = function(store, type, snapshot) {
      assert.equal(type, Person, 'the type is correct');
      assert.equal(snapshot.record, tom, 'the record is correct');

      return resolve({ data: { id: 1, type: 'person', attributes: { name: 'Tom Dale' } } });
    };

    return run(() => {
      tom = store.createRecord('person', { name: 'Tom Dale' });
      return tom.save();
    });
  });

  test('After a created record has been assigned an ID, finding a record by that ID returns the original record.', function(assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let tom;

    adapter.createRecord = function(store, type, snapshot) {
      return resolve({ data: { id: 1, type: 'person', attributes: { name: 'Tom Dale' } } });
    };

    return run(() => {
      tom = store.createRecord('person', { name: 'Tom Dale' });
      return tom.save();
    }).then(tom => {
      return store.findRecord('person', 1).then(nextTom => {
        assert.equal(tom, nextTom, 'the retrieved record is the same as the created record');
      });
    });
  });

  test("when a store is committed, the adapter's `commit` method should be called with records that have been deleted.", function(assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');
    let Person = store.modelFor('person');

    adapter.deleteRecord = function(store, type, snapshot) {
      assert.equal(type, Person, 'the type is correct');
      assert.equal(snapshot.record, tom, 'the record is correct');

      return run(RSVP, 'resolve');
    };

    let tom;

    run(() => {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            name: 'Tom Dale',
          },
        },
      });
    });

    return store
      .findRecord('person', 1)
      .then(person => {
        tom = person;
        tom.deleteRecord();
        return tom.save();
      })
      .then(tom => {
        assert.equal(get(tom, 'isDeleted'), true, 'record is marked as deleted');
      });
  });

  test('An adapter can notify the store that records were updated by calling `didSaveRecords`.', function(assert) {
    assert.expect(6);

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let tom, yehuda;

    adapter.updateRecord = function(store, type, snapshot) {
      return resolve();
    };

    run(() => {
      store.push({
        data: [
          {
            type: 'person',
            id: '1',
          },
          {
            type: 'person',
            id: '2',
          },
        ],
      });
    });

    return all([store.findRecord('person', 1), store.findRecord('person', 2)]).then(array => {
      tom = array[0];
      yehuda = array[1];

      tom.set('name', 'Michael Phelps');
      yehuda.set('name', 'Usain Bolt');

      assert.ok(tom.get('hasDirtyAttributes'), 'tom is dirty');
      assert.ok(yehuda.get('hasDirtyAttributes'), 'yehuda is dirty');

      let savedTom = assert.assertClean(tom.save()).then(record => {
        assert.equal(record, tom, 'The record is correct');
      });

      let savedYehuda = assert.assertClean(yehuda.save()).then(record => {
        assert.equal(record, yehuda, 'The record is correct');
      });

      return all([savedTom, savedYehuda]);
    });
  });

  test('An adapter can notify the store that records were updated and provide new data by calling `didSaveRecords`.', function(assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.updateRecord = function(store, type, snapshot) {
      if (snapshot.id === '1') {
        return resolve({
          data: { id: 1, type: 'person', attributes: { name: 'Tom Dale', 'updated-at': 'now' } },
        });
      } else if (snapshot.id === '2') {
        return resolve({
          data: {
            id: 2,
            type: 'person',
            attributes: { name: 'Yehuda Katz', 'updated-at': 'now!' },
          },
        });
      }
    };

    run(() => {
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
    });

    return hash({
      tom: store.findRecord('person', 1),
      yehuda: store.findRecord('person', 2),
    })
      .then(people => {
        people.tom.set('name', 'Draaaaaahm Dale');
        people.yehuda.set('name', 'Goy Katz');

        return hash({
          tom: people.tom.save(),
          yehuda: people.yehuda.save(),
        });
      })
      .then(people => {
        assert.equal(
          people.tom.get('name'),
          'Tom Dale',
          'name attribute should reflect value of hash passed to didSaveRecords'
        );
        assert.equal(
          people.tom.get('updatedAt'),
          'now',
          'updatedAt attribute should reflect value of hash passed to didSaveRecords'
        );
        assert.equal(
          people.yehuda.get('name'),
          'Yehuda Katz',
          'name attribute should reflect value of hash passed to didSaveRecords'
        );
        assert.equal(
          people.yehuda.get('updatedAt'),
          'now!',
          'updatedAt attribute should reflect value of hash passed to didSaveRecords'
        );
      });
  });

  test('An adapter can notify the store that a record was updated by calling `didSaveRecord`.', function(assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.updateRecord = function(store, type, snapshot) {
      return resolve();
    };

    run(() => {
      store.push({
        data: [
          {
            type: 'person',
            id: '1',
          },
          {
            type: 'person',
            id: '2',
          },
        ],
      });
    });

    return hash({
      tom: store.findRecord('person', 1),
      yehuda: store.findRecord('person', 2),
    }).then(people => {
      people.tom.set('name', 'Tom Dale');
      people.yehuda.set('name', 'Yehuda Katz');

      assert.ok(people.tom.get('hasDirtyAttributes'), 'tom is dirty');
      assert.ok(people.yehuda.get('hasDirtyAttributes'), 'yehuda is dirty');

      assert.assertClean(people.tom.save());
      assert.assertClean(people.yehuda.save());
    });
  });

  test('An adapter can notify the store that a record was updated and provide new data by calling `didSaveRecord`.', function(assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.updateRecord = function(store, type, snapshot) {
      switch (snapshot.id) {
        case '1':
          return resolve({
            data: { id: 1, type: 'person', attributes: { name: 'Tom Dale', 'updated-at': 'now' } },
          });
        case '2':
          return resolve({
            data: {
              id: 2,
              type: 'person',
              attributes: { name: 'Yehuda Katz', 'updated-at': 'now!' },
            },
          });
      }
    };

    run(() => {
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
    });

    return hash({
      tom: store.findRecord('person', 1),
      yehuda: store.findRecord('person', 2),
    })
      .then(people => {
        people.tom.set('name', 'Draaaaaahm Dale');
        people.yehuda.set('name', 'Goy Katz');

        return hash({
          tom: people.tom.save(),
          yehuda: people.yehuda.save(),
        });
      })
      .then(people => {
        assert.equal(
          people.tom.get('name'),
          'Tom Dale',
          'name attribute should reflect value of hash passed to didSaveRecords'
        );
        assert.equal(
          people.tom.get('updatedAt'),
          'now',
          'updatedAt attribute should reflect value of hash passed to didSaveRecords'
        );
        assert.equal(
          people.yehuda.get('name'),
          'Yehuda Katz',
          'name attribute should reflect value of hash passed to didSaveRecords'
        );
        assert.equal(
          people.yehuda.get('updatedAt'),
          'now!',
          'updatedAt attribute should reflect value of hash passed to didSaveRecords'
        );
      });
  });

  test('An adapter can notify the store that records were deleted by calling `didSaveRecords`.', function(assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.deleteRecord = function(store, type, snapshot) {
      return resolve();
    };

    run(() => {
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
    });

    return hash({
      tom: store.findRecord('person', 1),
      yehuda: store.findRecord('person', 2),
    }).then(people => {
      people.tom.deleteRecord();
      people.yehuda.deleteRecord();

      assert.assertClean(people.tom.save());
      assert.assertClean(people.yehuda.save());
    });
  });

  test('Create record response does not have to include the type property', async function(assert) {
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
    this.owner.register(
      'serializer:application',
      JSONAPISerializer.extend({
        normalizeResponse: (store, primaryModelClass, payload, id, requestType) => {
          return payload;
        },
      })
    );

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    let tom;

    adapter.createRecord = function(_store, type, snapshot) {
      assert.strictEqual(type, Person, "The type of the record is 'Person'");
      assert.strictEqual(snapshot.record, tom, 'The record in the snapshot is the correct one');

      return resolve({ data: { id: '1' } });
    };

    tom = store.createRecord('person', { name: 'Tom Dale' });

    return await tom.save();
  });
});
