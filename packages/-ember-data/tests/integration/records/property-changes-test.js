import { run } from '@ember/runloop';

import { module, test } from 'qunit';
import { resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import Model, { attr } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';

module('integration/records/property-changes - Property changes', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    const Person = Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});
  });

  test('Calling push with partial records trigger observers for just those attributes that changed', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');

    var person;

    run(function () {
      store.push({
        data: {
          type: 'person',
          id: 'wat',
          attributes: {
            firstName: 'Yehuda',
            lastName: 'Katz',
          },
        },
      });
      person = store.peekRecord('person', 'wat');
    });

    person.addObserver('firstName', function () {
      assert.ok(false, 'firstName observer should not be triggered');
    });

    person.addObserver('lastName', function () {
      assert.ok(true, 'lastName observer should be triggered');
    });

    run(function () {
      store.push({
        data: {
          type: 'person',
          id: 'wat',
          attributes: {
            firstName: 'Yehuda',
            lastName: 'Katz!',
          },
        },
      });
    });
  });

  test('Calling push does not trigger observers for locally changed attributes with the same value', function (assert) {
    assert.expect(0);

    let store = this.owner.lookup('service:store');

    var person;

    run(function () {
      store.push({
        data: {
          type: 'person',
          id: 'wat',
          attributes: {
            firstName: 'Yehuda',
            lastName: 'Katz',
          },
        },
      });
      person = store.peekRecord('person', 'wat');
      person.set('lastName', 'Katz!');
    });

    person.addObserver('firstName', function () {
      assert.ok(false, 'firstName observer should not be triggered');
    });

    person.addObserver('lastName', function () {
      assert.ok(false, 'lastName observer should not be triggered');
    });

    run(function () {
      store.push({
        data: {
          type: 'person',
          id: 'wat',
          attributes: {
            firstName: 'Yehuda',
            lastName: 'Katz!',
          },
        },
      });
    });
  });

  test('Saving a record trigger observers for locally changed attributes with the same canonical value', function (assert) {
    assert.expect(1);
    var person;

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.updateRecord = function (store, type, snapshot) {
      return resolve({ data: { id: 'wat', type: 'person', attributes: { 'last-name': 'Katz' } } });
    };

    run(function () {
      store.push({
        data: {
          type: 'person',
          id: 'wat',
          attributes: {
            firstName: 'Yehuda',
            lastName: 'Katz',
          },
        },
      });
      person = store.peekRecord('person', 'wat');
      person.set('lastName', 'Katz!');
    });

    person.addObserver('firstName', function () {
      assert.ok(false, 'firstName observer should not be triggered');
    });

    person.addObserver('lastName', function () {
      assert.ok(true, 'lastName observer should be triggered');
    });

    run(function () {
      person.save();
    });
  });

  test('store.push should not override a modified attribute', function (assert) {
    assert.expect(1);

    let store = this.owner.lookup('service:store');

    const person = store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Yehuda',
          lastName: 'Katz',
        },
      },
    });

    person.set('lastName', 'Katz!');

    person.addObserver('firstName', function () {
      assert.ok(true, 'firstName observer should be triggered');
    });

    person.addObserver('lastName', function () {
      assert.ok(false, 'lastName observer should not be triggered');
    });

    store.push({
      data: {
        type: 'person',
        id: 'wat',
        attributes: {
          firstName: 'Tom',
          lastName: 'Dale',
        },
      },
    });
  });
});
