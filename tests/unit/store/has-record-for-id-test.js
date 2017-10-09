import { run } from '@ember/runloop';
import setupStore from 'dummy/tests/helpers/store';

import { module, test } from 'qunit';

import DS from 'ember-data';

let env, store, Person, PhoneNumber;
const { attr, hasMany, belongsTo } = DS;

module('unit/store/hasRecordForId - Store hasRecordForId', {
  beforeEach() {

    Person = DS.Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
      phoneNumbers: hasMany('phone-number', { async: false })
    });

    PhoneNumber = DS.Model.extend({
      number: attr('string'),
      person: belongsTo('person', { async: false })
    });

    env = setupStore({
      person: Person,
      'phone-number': PhoneNumber
    });

    store = env.store;

  },

  afterEach() {
    run(store, 'destroy');
  }
});

test('hasRecordForId should return false for records in the empty state ', function(assert) {

  run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          firstName: "Yehuda",
          lastName: "Katz"
        },
        relationships: {
          phoneNumbers: {
            data: [
              { type: 'phone-number', id: '1' }
            ]
          }
        }
      }
    });

    assert.equal(false, store.hasRecordForId('phone-number', 1), 'hasRecordForId only returns true for loaded records');

  });
});

test('hasRecordForId should return true for records in the loaded state ', function(assert) {
  run(() => {
    store.push({
      data: {
        type: 'person',
        id: '1',
        attributes: {
          firstName: "Yehuda",
          lastName: "Katz"
        },
        relationships: {
          phoneNumbers: {
            data: [
              { type: 'phone-number', id: '1' }
            ]
          }
        }
      }
    });

    assert.equal(true, store.hasRecordForId('person', 1), 'hasRecordForId returns true for records loaded into the store');
  });
});
