import {createStore} from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

const { get, run, addObserver } = Ember;

let Person, CompactPerson, initialPayload, updatePayload, store;

module("unit/model/multi-record", {
  beforeEach() {
    initialPayload = {
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale',
          description: 'JavaScript thinkfluencer'
        }
      },
      included: []
    };

    updatePayload = {
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Yehuda Katz',
          description: 'Tilde Co-Founder, OSS enthusiast and world traveler.'
        }
      },
      included: []
    };

    Person = DS.Model.extend({
      name: DS.attr('string'),
      description: DS.attr('string'),
      workplace: DS.belongsTo('company')
    });
    CompactPerson = DS.Model.extend({
      name: DS.attr('string'),
      workplace: DS.belongsTo('compact-company')
    });

    store = createStore({
      person: Person,
      compactPerson: CompactPerson
    });
  },

  afterEach() {
    run(store, 'destroy');
    Person = CompactPerson = initialPayload = updatePayload = null;
  }
});

test("internalModel.getRecord() can return compact-person", function(assert) {
  let personRecord = run(() => {
    return store.push(initialPayload);
  });

  let compactPerson = personRecord._internalModel.getRecord(null, 'compact-person');

  assert.strictEqual(compactPerson.constructor, CompactPerson);
  assert.equal(compactPerson.id, '1');
  assert.equal(get(compactPerson, 'name'), 'Tom Dale');
  assert.equal(get(compactPerson, 'description'), null);

  run(() => {
    // trigger an update to the record
    store.push(updatePayload);
  });

  // the compact person should have been updated
  assert.equal(get(compactPerson, 'name'), 'Yehuda Katz');
  assert.equal(get(compactPerson, 'description'), null);
});

test("updating a model will notify all materialized records", function(assert) {
  let personRecord = run(() => {
    return store.push(initialPayload);
  });

  let compactPerson = personRecord._internalModel.getRecord(null, 'compact-person');
  let compactPersonNotified = false;

  addObserver(compactPerson, 'description', () => {
    compactPersonNotified = true;
  });

  run(() => {
    // trigger an update to the record
    store.push(updatePayload);
  });

  // the compact person should have been notified of changes
  assert.ok(compactPersonNotified, 'Expected compact person record to have been notified');
});

test('unloadRecord should not dematerialize other records', function(assert) {
  let personRecord = run(() => {
    return store.push(initialPayload);
  });

  let compactPerson = personRecord._internalModel.getRecord(null, 'compact-person');

  run(() => {
    personRecord.unloadRecord();
  });

  assert.notOk(get(compactPerson, 'isDestroyed'));
  assert.notOk(get(personRecord._internalModel, 'isDestroyed'));
});

test('unloadRecord should dematerialize if there are no other records', function(assert) {
  let personRecord = run(() => {
    return store.push(initialPayload);
  });

  let compactPerson = personRecord._internalModel.getRecord(null, 'compact-person');

  run(() => {
    compactPerson.unloadRecord();
    personRecord.unloadRecord();
  });

  assert.ok(get(personRecord._internalModel, 'isDestroyed'));
});

test('all records transition to new state', function(assert) {
  let personRecord = run(() => {
    return store.push(initialPayload);
  });

  let compactPerson = personRecord._internalModel.getRecord(null, 'compact-person');

  run(() => {
    personRecord.deleteRecord();
  });

  // deleting the person record should also mark the compactPerson for deletion as well
  assert.equal(get(compactPerson, 'isDeleted'), true);
});

