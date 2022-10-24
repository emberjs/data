import { module, test } from 'qunit';
import RSVP from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import { InvalidError } from '@ember-data/adapter/error';
import Model, { attr } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('integration/records/error', function (hooks) {
  setupTest(hooks);

  testInDebug('adding errors during root.loaded.created.invalid works', function (assert) {
    const Person = Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});

    let store = this.owner.lookup('service:store');

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

    let person = store.peekRecord('person', 'wat');

    person.setProperties({
      firstName: null,
      lastName: null,
    });

    assert.strictEqual(
      person.currentState.stateName,
      'root.loaded.updated.uncommitted',
      'Model state is root.loaded.updated.uncommitted'
    );

    person.errors.add('firstName', 'is invalid');

    assert.strictEqual(
      person.currentState.stateName,
      'root.loaded.updated.invalid',
      'Model state is updated to root.loaded.updated.invalid after an error is manually added'
    );

    person.errors.add('lastName', 'is invalid');

    assert.deepEqual(
      person.errors.slice(),
      [
        { attribute: 'firstName', message: 'is invalid' },
        { attribute: 'lastName', message: 'is invalid' },
      ],
      'Manually added errors appear in errors with their respective messages'
    );
  });

  testInDebug('adding errors root.loaded.created.invalid works', function (assert) {
    const Person = Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});

    let store = this.owner.lookup('service:store');

    let person = store.createRecord('person', {
      id: 'wat',
      firstName: 'Yehuda',
      lastName: 'Katz',
    });

    person.setProperties({
      firstName: null,
      lastName: null,
    });

    assert.strictEqual(
      person.currentState.stateName,
      'root.loaded.created.uncommitted',
      'Model state is root.loaded.updated.uncommitted'
    );

    person.errors.add('firstName', 'is invalid');

    assert.strictEqual(
      person.currentState.stateName,
      'root.loaded.created.invalid',
      'Model state is updated to root.loaded.updated.invalid after an error is manually added'
    );

    person.errors.add('lastName', 'is invalid');

    assert.deepEqual(
      person.errors.slice(),
      [
        { attribute: 'firstName', message: 'is invalid' },
        { attribute: 'lastName', message: 'is invalid' },
      ],
      'Manually added errors appear in errors with their respective messages'
    );
  });

  testInDebug('adding errors root.loaded.created.invalid works add + remove + add', function (assert) {
    const Person = Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});

    let store = this.owner.lookup('service:store');

    let person = store.createRecord('person', {
      id: 'wat',
      firstName: 'Yehuda',
    });

    person.set('firstName', null);

    assert.strictEqual(person.currentState.stateName, 'root.loaded.created.uncommitted');

    person.errors.add('firstName', 'is invalid');

    assert.strictEqual(person.currentState.stateName, 'root.loaded.created.invalid');

    person.errors.remove('firstName');

    assert.deepEqual(person.errors.slice(), []);

    person.errors.add('firstName', 'is invalid');

    assert.deepEqual(person.errors.slice(), [{ attribute: 'firstName', message: 'is invalid' }]);
  });

  testInDebug('adding errors root.loaded.created.invalid works add + (remove, add)', function (assert) {
    const Person = Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});

    let store = this.owner.lookup('service:store');

    let person = store.createRecord('person', {
      id: 'wat',
      firstName: 'Yehuda',
    });

    person.set('firstName', null);

    assert.strictEqual(person.currentState.stateName, 'root.loaded.created.uncommitted');

    person.errors.add('firstName', 'is invalid');

    assert.strictEqual(person.currentState.stateName, 'root.loaded.created.invalid');

    person.errors.remove('firstName');
    person.errors.add('firstName', 'is invalid');

    assert.strictEqual(person.currentState.stateName, 'root.loaded.created.invalid');

    assert.deepEqual(person.errors.slice(), [{ attribute: 'firstName', message: 'is invalid' }]);
  });

  test('using setProperties to clear errors', async function (assert) {
    const Person = Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', class extends JSONAPISerializer {});

    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.createRecord = () => {
      return RSVP.reject(
        new InvalidError([
          {
            detail: 'Must be unique',
            source: { pointer: '/data/attributes/first-name' },
          },
          {
            detail: 'Must not be blank',
            source: { pointer: '/data/attributes/last-name' },
          },
        ])
      );
    };

    let person = store.createRecord('person');

    try {
      person = await person.save();
    } catch (_error) {
      let errors = person.errors;

      assert.strictEqual(errors.length, 2, 'Adds two errors to the model');
      assert.true(errors.has('firstName'), 'firstName is included in the errors object');
      assert.true(errors.has('lastName'), 'lastName is included in the errors object');

      person.setProperties({
        firstName: 'updated',
        lastName: 'updated',
      });

      assert.strictEqual(errors.length, 0, 'Clears errors after the attributes are updated');
    }
  });
});
