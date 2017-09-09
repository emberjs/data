import {createStore} from 'dummy/tests/helpers/store';
import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

const { get, run, addObserver } = Ember;

let Company, CompactCompany, Person, CompactPerson, initialPayload, updatePayload, store;

module("integration/multi-record", {
  beforeEach() {
    initialPayload = {
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Tom Dale',
          description: 'JavaScript thinkfluencer'
        },
        relationships: {
          workplace: {
            data: {
              type: 'company',
              id: '1'
            }
          }
        }
      },
      included: [{
        type: 'company',
        id: '1',
        attributes: {
          name: 'Linkedin',
          description: 'Linkedin description'
        }
      }]
    };

    updatePayload = {
      data: {
        type: 'person',
        id: '1',
        attributes: {
          name: 'Yehuda Katz',
          description: 'Tilde Co-Founder, OSS enthusiast and world traveler.'
        },
        relationships: {
          workplace: {
            data: {
              type: 'company',
              id: '1'
            }
          }
        }
      },
      included: [{
        type: 'company',
        id: '1',
        attributes: {
          name: 'Tilde',
          description: 'We\'re a small team of developers who are passionate about crafting great software.'
        }
      }]
    };

    Company = DS.Model.extend({
      name: DS.attr('string'),
      description: DS.attr('attr')
    });
    CompactCompany = DS.Model.extend({
      name: DS.attr('string')
    });
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
      company: Company,
      compactCompany: CompactCompany,
      person: Person,
      compactPerson: CompactPerson
    });
  },

  afterEach() {
    run(store, 'destroy');
    Company = CompactCompany = Person = CompactPerson = initialPayload = updatePayload = null;
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

test('relationships loads specific relationship records', function(assert) {
  let personRecord = run(() => {
    return store.push(initialPayload);
  });

  let compactPerson = personRecord._internalModel.getRecord(null, 'compact-person');
  let compactCompany = run(() => {
    return get(compactPerson, 'workplace');
  });

  assert.strictEqual(get(compactCompany, 'content').constructor, CompactCompany);
  assert.equal(get(compactCompany, 'name'), 'Linkedin');
});

test('record arrays can handle different records', function(assert) {
  run(() => {
    return store.push(initialPayload);
  });

  let allPersons = store.recordArrayManager.liveRecordArrayFor('person');
  let allCompactPersons = store.recordArrayManager.liveRecordArrayFor('person', 'compact-person');

  assert.equal(get(allPersons, 'length'), 1);
  assert.equal(get(allCompactPersons, 'length'), 1);

  assert.strictEqual(allPersons.objectAt(0).constructor, Person);
  assert.strictEqual(allCompactPersons.objectAt(0).constructor, CompactPerson);

  // add one more person, modify updatePayload to use new id
  updatePayload.data.id = '2';
  run(() => {
    store.push(updatePayload);
  });

  assert.equal(get(allPersons, 'length'), 2);
  assert.equal(get(allCompactPersons, 'length'), 2);

  assert.strictEqual(allPersons.objectAt(1).constructor, Person);
  assert.strictEqual(allCompactPersons.objectAt(1).constructor, CompactPerson);
});
