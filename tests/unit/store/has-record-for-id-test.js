import Ember from 'ember';

import {module, test} from 'qunit';

import DS from 'ember-data';

var env, store, Person, PhoneNumber;
var attr = DS.attr;
var hasMany = DS.hasMany;
var belongsTo = DS.belongsTo;
var run = Ember.run;

module("unit/store/hasRecordForId - Store hasRecordForId", {
  beforeEach: function() {

    Person = DS.Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
      phoneNumbers: hasMany('phone-number', { async: false })
    });
    Person.toString = function() {
      return 'Person';
    };

    PhoneNumber = DS.Model.extend({
      number: attr('string'),
      person: belongsTo('person', { async: false })
    });
    PhoneNumber.toString = function() {
      return 'PhoneNumber';
    };

    env = setupStore({
      person: Person,
      "phone-number": PhoneNumber
    });

    store = env.store;

  },

  afterEach: function() {
    Ember.run(store, 'destroy');
  }
});

test("hasRecordForId should return false for records in the empty state ", function(assert) {

  run(function() {
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

test("hasRecordForId should return true for records in the loaded state ", function(assert) {
  run(function() {
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
