import EmberObject from '@ember/object';

import { module, test } from 'qunit';

import DS from 'ember-data';
import { setupTest } from 'ember-qunit';

import { recordIdentifierFor } from '@ember-data/store';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('unit/store/peekRecord - Store peekRecord', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('model:person', DS.Model.extend());
  });

  test('peekRecord should return the record if it is in the store', function (assert) {
    let store = this.owner.lookup('service:store');

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
      },
    });
    assert.equal(person, store.peekRecord('person', 1), 'peekRecord only return the corresponding record in the store');
  });

  test('peekRecord should return the record with identifier as argument', function (assert) {
    let store = this.owner.lookup('service:store');

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
      },
    });
    assert.equal(
      person,
      store.peekRecord({ type: 'person', id: 1 }),
      'peekRecord only return the corresponding record in the store'
    );
  });

  test('peekRecord should return null if the record is not in the store ', function (assert) {
    let store = this.owner.lookup('service:store');

    assert.equal(
      null,
      store.peekRecord('person', 1),
      'peekRecord returns null if the corresponding record is not in the store'
    );
  });

  testInDebug('peekRecord should assert if not passed both model name and id', function (assert) {
    let store = this.owner.lookup('service:store');

    assert.expectAssertion(() => {
      store.peekRecord('my-id');
    }, /Expected id to be a string or number, received undefined/);
  });

  testInDebug('peekRecord should assert if passed a model class instead of model name', function (assert) {
    let store = this.owner.lookup('service:store');

    assert.expectAssertion(() => {
      let modelClass = EmberObject.extend();
      store.peekRecord(modelClass, 'id');
    }, /Passing classes to store methods has been removed/);
  });

  // Identifier tests
  [
    { type: 'person', id: '1', desc: 'type and id' },
    { type: 'person', id: '1', lid: 'person:1', desc: 'type, id and lid' },
    { type: 'person', lid: 'TODO', desc: 'type and lid' },
    { type: 'person', id: null, lid: 'TODO', desc: 'type, null id, and lid' },
  ].forEach(({ type, id, lid, desc, errorMsg }) => {
    test(`peekRecord (${desc})`, function (assert) {
      let store = this.owner.lookup('service:store');

      let person = store.push({
        data: {
          type: 'person',
          id: '1',
        },
      });

      let allArgs = { type, id, lid };
      let peekRecordArgs = {};
      Object.keys(allArgs).forEach((key) => {
        if (key !== 'undefined') {
          peekRecordArgs[key] = allArgs[key];
        }

        if (key === 'lid' && lid === 'TODO') {
          peekRecordArgs[key] = recordIdentifierFor(person).lid;
        }
      });

      assert.equal(
        person,
        store.peekRecord(peekRecordArgs),
        'peekRecord only return the corresponding record in the store'
      );
    });
  });
});
