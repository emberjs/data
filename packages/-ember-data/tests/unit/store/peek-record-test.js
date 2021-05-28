import EmberObject from '@ember/object';
import { assign } from '@ember/polyfills';

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

  // Ok Identifier tests
  // createRecord and then peekRecord with using the identifier to get it. Same thing with getReference.
  [
    { withType: true, withId: true, desc: 'type and id' },
    { withType: true, withId: true, withLid: true, desc: 'type, id and lid' },
    { withType: true, withLid: true, desc: 'type and lid'},
    { withType: true, withLid: true, extra: { id: null }, desc: 'type, null id, and lid' },
  ].forEach(({ withType, withId, withLid, extra, desc }) => {
    test(`peekRecord (${desc})`, function (assert) {
      let store = this.owner.lookup('service:store');

      let id = '1';
      let person = store.push({
        data: {
          type: 'person',
          id,
        },
      });

      const peekRecordArgs = Object.create(null);
      if (withType) {
        peekRecordArgs.type = 'person';
      }
      if (withId) {
        peekRecordArgs.id = id;
      }
      if (withLid) {
        peekRecordArgs.lid = recordIdentifierFor(person).lid;
      }
      if (extra) {
        assign(peekRecordArgs, extra);
      }

      assert.equal(
        person,
        store.peekRecord(peekRecordArgs),
        'peekRecord only return the corresponding record in the store'
      );
    });
  });
});
