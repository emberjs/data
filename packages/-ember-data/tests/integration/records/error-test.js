import { run } from '@ember/runloop';
import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';
import RSVP from 'rsvp';

import Adapter from '@ember-data/adapter';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import Model, { attr } from '@ember-data/model';
import { InvalidError } from '@ember-data/adapter/error';

module('integration/records/error', function(hooks) {
  setupTest(hooks);

  hooks.beforeEach(function() {
    const Person = Model.extend({
      firstName: attr('string'),
      lastName: attr('string'),
    });

    this.owner.register('model:person', Person);
    this.owner.register('adapter:application', Adapter.extend());
    this.owner.register('serializer:application', JSONAPISerializer.extend());
  });

  testInDebug('adding errors during root.loaded.created.invalid works', function(assert) {
    let store = this.owner.lookup('service:store');

    var person = run(() => {
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
      return store.peekRecord('person', 'wat');
    });

    run(() => {
      person.set('firstName', null);
      person.set('lastName', null);
    });

    assert.equal(person._internalModel.currentState.stateName, 'root.loaded.updated.uncommitted');

    person.get('errors').add('firstName', 'is invalid');

    assert.equal(person._internalModel.currentState.stateName, 'root.loaded.updated.invalid');

    person.get('errors').add('lastName', 'is invalid');

    assert.deepEqual(person.get('errors').toArray(), [
      { attribute: 'firstName', message: 'is invalid' },
      { attribute: 'lastName', message: 'is invalid' },
    ]);
  });

  testInDebug('adding errors root.loaded.created.invalid works', function(assert) {
    let store = this.owner.lookup('service:store');

    let person = store.createRecord('person', {
      id: 'wat',
      firstName: 'Yehuda',
      lastName: 'Katz',
    });

    run(() => {
      person.set('firstName', null);
      person.set('lastName', null);
    });

    assert.equal(person._internalModel.currentState.stateName, 'root.loaded.created.uncommitted');

    person.get('errors').add('firstName', 'is invalid');

    assert.equal(person._internalModel.currentState.stateName, 'root.loaded.created.invalid');

    person.get('errors').add('lastName', 'is invalid');

    assert.deepEqual(person.get('errors').toArray(), [
      { attribute: 'firstName', message: 'is invalid' },
      { attribute: 'lastName', message: 'is invalid' },
    ]);
  });

  testInDebug('adding errors root.loaded.created.invalid works add + remove + add', function(assert) {
    let store = this.owner.lookup('service:store');

    let person = store.createRecord('person', {
      id: 'wat',
      firstName: 'Yehuda',
    });

    run(() => {
      person.set('firstName', null);
    });

    assert.equal(person._internalModel.currentState.stateName, 'root.loaded.created.uncommitted');

    person.get('errors').add('firstName', 'is invalid');

    assert.equal(person._internalModel.currentState.stateName, 'root.loaded.created.invalid');

    person.get('errors').remove('firstName');

    assert.deepEqual(person.get('errors').toArray(), []);

    person.get('errors').add('firstName', 'is invalid');

    assert.deepEqual(person.get('errors').toArray(), [{ attribute: 'firstName', message: 'is invalid' }]);
  });

  testInDebug('adding errors root.loaded.created.invalid works add + (remove, add)', function(assert) {
    let store = this.owner.lookup('service:store');

    let person = store.createRecord('person', {
      id: 'wat',
      firstName: 'Yehuda',
    });

    run(() => {
      person.set('firstName', null);
    });

    assert.equal(person._internalModel.currentState.stateName, 'root.loaded.created.uncommitted');

    {
      person.get('errors').add('firstName', 'is invalid');
    }

    assert.equal(person._internalModel.currentState.stateName, 'root.loaded.created.invalid');

    {
      person.get('errors').remove('firstName');
      person.get('errors').add('firstName', 'is invalid');
    }

    assert.equal(person._internalModel.currentState.stateName, 'root.loaded.created.invalid');

    assert.deepEqual(person.get('errors').toArray(), [{ attribute: 'firstName', message: 'is invalid' }]);
  });

  test('using setProperties to clear errors', function(assert) {
    let store = this.owner.lookup('service:store');
    let adapter = store.adapterFor('application');

    adapter.reopen({
      createRecord() {
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
      },
    });

    return run(() => {
      let person = store.createRecord('person');

      return person.save().then(null, function() {
        let errors = person.get('errors');

        assert.equal(errors.get('length'), 2);
        assert.ok(errors.has('firstName'));
        assert.ok(errors.has('lastName'));

        person.setProperties({
          firstName: 'updated',
          lastName: 'updated',
        });

        assert.equal(errors.get('length'), 0);
        assert.notOk(errors.has('firstName'));
        assert.notOk(errors.has('lastName'));
      });
    });
  });
});
