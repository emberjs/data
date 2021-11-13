import { get } from '@ember/object';
import { run } from '@ember/runloop';

import { module } from 'qunit';
import { reject, resolve } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Adapter from '@ember-data/adapter';
import { InvalidError } from '@ember-data/adapter/error';
import Model, { attr } from '@ember-data/model';
import JSONAPISerializer from '@ember-data/serializer/json-api';
import { deprecatedTest } from '@ember-data/unpublished-test-infra/test-support/deprecated-test';

module('unit/model/lifecycle_callbacks - Lifecycle Callbacks', function (hooks) {
  setupTest(hooks);

  deprecatedTest(
    'a record receives a didLoad callback when it has finished loading',
    {
      id: 'ember-data:record-lifecycle-event-methods',
      until: '4.0',
    },
    function (assert) {
      assert.expect(3);

      const Person = Model.extend({
        name: attr(),
        didLoad() {
          assert.ok('The didLoad callback was called');
        },
      });

      const ApplicationAdapter = Adapter.extend({
        findRecord(store, type, id, snapshot) {
          return { data: { id: 1, type: 'person', attributes: { name: 'Foo' } } };
        },
      });

      this.owner.register('model:person', Person);
      this.owner.register('adapter:application', ApplicationAdapter);
      this.owner.register('serializer:application', JSONAPISerializer.extend());

      let store = this.owner.lookup('service:store');

      return run(() => {
        return store.findRecord('person', 1).then((person) => {
          assert.strictEqual(person.get('id'), '1', `The person's ID is available`);
          assert.strictEqual(person.get('name'), 'Foo', `The person's properties are availablez`);
        });
      });
    }
  );

  deprecatedTest(
    `a record receives a didLoad callback once it materializes if it wasn't materialized when loaded`,
    {
      id: 'ember-data:record-lifecycle-event-methods',
      until: '4.0',
    },
    function (assert) {
      assert.expect(2);

      let didLoadCalled = 0;
      const Person = Model.extend({
        name: attr(),
        didLoad() {
          didLoadCalled++;
        },
      });

      this.owner.register('model:person', Person);

      let store = this.owner.lookup('service:store');

      run(() => {
        store._pushInternalModel({ id: 1, type: 'person' });
        assert.strictEqual(didLoadCalled, 0, 'didLoad was not called');
      });

      run(() => store.peekRecord('person', 1));

      assert.strictEqual(didLoadCalled, 1, 'didLoad was called');
    }
  );

  deprecatedTest(
    'a record receives a didUpdate callback when it has finished updating',
    {
      id: 'ember-data:record-lifecycle-event-methods',
      until: '4.0',
    },
    function (assert) {
      assert.expect(5);

      let callCount = 0;

      const Person = Model.extend({
        bar: attr('string'),
        name: attr('string'),

        didUpdate() {
          callCount++;
          assert.strictEqual(get(this, 'isSaving'), false, 'record should be saving');
          assert.strictEqual(get(this, 'hasDirtyAttributes'), false, 'record should not be dirty');
        },
      });

      const ApplicationAdapter = Adapter.extend({
        findRecord(store, type, id, snapshot) {
          return { data: { id: 1, type: 'person', attributes: { name: 'Foo' } } };
        },

        updateRecord(store, type, snapshot) {
          assert.strictEqual(callCount, 0, 'didUpdate callback was not called until didSaveRecord is called');
          return resolve();
        },
      });

      this.owner.register('model:person', Person);
      this.owner.register('adapter:application', ApplicationAdapter);
      this.owner.register('serializer:application', JSONAPISerializer.extend());

      let asyncPerson = run(() => this.owner.lookup('service:store').findRecord('person', 1));

      assert.strictEqual(callCount, 0, 'precond - didUpdate callback was not called yet');

      return run(() => {
        return asyncPerson
          .then((person) => {
            return run(() => {
              person.set('bar', 'Bar');
              return person.save();
            });
          })
          .then(() => {
            assert.strictEqual(callCount, 1, 'didUpdate called after update');
          });
      });
    }
  );

  deprecatedTest(
    'a record receives a didCreate callback when it has finished updating',
    {
      id: 'ember-data:record-lifecycle-event-methods',
      until: '4.0',
    },
    function (assert) {
      assert.expect(5);

      let callCount = 0;

      const Person = Model.extend({
        didCreate() {
          callCount++;
          assert.strictEqual(get(this, 'isSaving'), false, 'record should not be saving');
          assert.strictEqual(get(this, 'hasDirtyAttributes'), false, 'record should not be dirty');
        },
      });

      const ApplicationAdapter = Adapter.extend({
        createRecord(store, type, snapshot) {
          assert.strictEqual(callCount, 0, 'didCreate callback was not called until didSaveRecord is called');
          return resolve();
        },
      });

      this.owner.register('model:person', Person);
      this.owner.register('adapter:application', ApplicationAdapter);
      this.owner.register('serializer:application', JSONAPISerializer.extend());

      assert.strictEqual(callCount, 0, 'precond - didCreate callback was not called yet');

      let person = this.owner.lookup('service:store').createRecord('person', {
        id: 69,
        name: 'Newt Gingrich',
      });

      return run(() => {
        return person.save().then(() => {
          assert.strictEqual(callCount, 1, 'didCreate called after commit');
        });
      });
    }
  );

  deprecatedTest(
    'a record receives a didDelete callback when it has finished deleting',
    {
      id: 'ember-data:record-lifecycle-event-methods',
      until: '4.0',
    },
    function (assert) {
      assert.expect(5);

      let callCount = 0;

      const Person = Model.extend({
        bar: attr('string'),
        name: attr('string'),

        didDelete() {
          callCount++;

          assert.strictEqual(get(this, 'isSaving'), false, 'record should not be saving');
          assert.strictEqual(get(this, 'hasDirtyAttributes'), false, 'record should not be dirty');
        },
      });

      const ApplicationAdapter = Adapter.extend({
        findRecord(store, type, id, snapshot) {
          return { data: { id: 1, type: 'person', attributes: { name: 'Foo' } } };
        },

        deleteRecord(store, type, snapshot) {
          assert.strictEqual(callCount, 0, 'didDelete callback was not called until didSaveRecord is called');

          return resolve();
        },
      });

      this.owner.register('model:person', Person);
      this.owner.register('adapter:application', ApplicationAdapter);
      this.owner.register('serializer:application', JSONAPISerializer.extend());

      let asyncPerson = run(() => this.owner.lookup('service:store').findRecord('person', 1));

      assert.strictEqual(callCount, 0, 'precond - didDelete callback was not called yet');

      return run(() => {
        return asyncPerson
          .then((person) => {
            return run(() => {
              person.deleteRecord();
              return person.save();
            });
          })
          .then(() => {
            assert.strictEqual(callCount, 1, 'didDelete called after delete');
          });
      });
    }
  );

  deprecatedTest(
    'an uncommited record also receives a didDelete callback when it is deleted',
    {
      id: 'ember-data:record-lifecycle-event-methods',
      until: '4.0',
    },
    function (assert) {
      assert.expect(4);

      let callCount = 0;

      const Person = Model.extend({
        bar: attr('string'),
        name: attr('string'),

        didDelete() {
          callCount++;
          assert.strictEqual(this.isSaving, false, 'record should not be saving');
          assert.strictEqual(this.hasDirtyAttributes, false, 'record should not be dirty');
        },
      });

      this.owner.register('model:person', Person);

      let person = this.owner.lookup('service:store').createRecord('person', {
        name: 'Tomster',
      });

      assert.strictEqual(callCount, 0, 'precond - didDelete callback was not called yet');

      run(() => person.deleteRecord());

      assert.strictEqual(callCount, 1, 'didDelete called after delete');
    }
  );

  deprecatedTest(
    'a record receives a becameInvalid callback when it became invalid',
    {
      id: 'ember-data:record-lifecycle-event-methods',
      until: '4.0',
    },
    function (assert) {
      assert.expect(8);

      let callCount = 0;

      const Person = Model.extend({
        bar: attr('string'),
        name: attr('string'),

        becameInvalid() {
          callCount++;

          assert.strictEqual(get(this, 'isSaving'), false, 'record should not be saving');
          assert.strictEqual(get(this, 'hasDirtyAttributes'), true, 'record should be dirty');
        },
      });

      const ApplicationAdapter = Adapter.extend({
        findRecord(store, type, id, snapshot) {
          return { data: { id: 1, type: 'person', attributes: { name: 'Foo' } } };
        },

        updateRecord(store, type, snapshot) {
          assert.strictEqual(callCount, 0, 'becameInvalid callback was not called until recordWasInvalid is called');

          return reject(
            new InvalidError([
              {
                title: 'Invalid Attribute',
                detail: 'error',
                source: {
                  pointer: '/data/attributes/bar',
                },
              },
            ])
          );
        },
      });

      this.owner.register('model:person', Person);
      this.owner.register('adapter:application', ApplicationAdapter);
      this.owner.register('serializer:application', JSONAPISerializer.extend());

      let asyncPerson = run(() => this.owner.lookup('service:store').findRecord('person', 1));
      assert.strictEqual(callCount, 0, 'precond - becameInvalid callback was not called yet');

      // Make sure that the error handler has a chance to attach before
      // save fails.
      return run(() => {
        return asyncPerson.then((person) => {
          return run(() => {
            person.set('bar', 'Bar');
            return person.save().catch((reason) => {
              assert.ok(reason.isAdapterError, 'reason should have been an adapter error');

              assert.strictEqual(reason.errors.length, 1, 'reason should have one error');
              assert.strictEqual(reason.errors[0].title, 'Invalid Attribute');
              assert.strictEqual(callCount, 1, 'becameInvalid called after invalidating');
            });
          });
        });
      });
    }
  );
});
