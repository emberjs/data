import { run } from '@ember/runloop';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

module('unit/store/hasRecordForId - Store hasRecordForId', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    const Person = Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
      phoneNumbers: hasMany('phone-number', { async: false }),
    });

    const PhoneNumber = Model.extend({
      number: attr('string'),
      person: belongsTo('person', { async: false }),
    });

    this.owner.register('model:person', Person);
    this.owner.register('model:phone-number', PhoneNumber);
  });

  test('hasRecordForId should return false for records in the empty state ', function(assert) {
    let store = this.owner.lookup('service:store');

    run(() => {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            firstName: 'Yehuda',
            lastName: 'Katz',
          },
          relationships: {
            phoneNumbers: {
              data: [{ type: 'phone-number', id: '1' }],
            },
          },
        },
      });

      assert.equal(
        false,
        store.hasRecordForId('phone-number', 1),
        'hasRecordForId only returns true for loaded records'
      );
    });
  });

  test('hasRecordForId should return true for records in the loaded state ', function(assert) {
    let store = this.owner.lookup('service:store');

    run(() => {
      store.push({
        data: {
          type: 'person',
          id: '1',
          attributes: {
            firstName: 'Yehuda',
            lastName: 'Katz',
          },
          relationships: {
            phoneNumbers: {
              data: [{ type: 'phone-number', id: '1' }],
            },
          },
        },
      });

      assert.equal(
        true,
        store.hasRecordForId('person', 1),
        'hasRecordForId returns true for records loaded into the store'
      );
    });
  });
});
