import EmberObject from '@ember/object';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model from '@ember-data/model';
import { recordIdentifierFor } from '@ember-data/store';
import testInDebug from '@ember-data/unpublished-test-infra/test-support/test-in-debug';

module('unit/store/peekRecord - Store peekRecord', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('model:person', Model.extend());
  });

  test('peekRecord should return the record if it is in the store', function (assert) {
    let store = this.owner.lookup('service:store');

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
      },
    });
    assert.strictEqual(
      person,
      store.peekRecord('person', 1),
      'peekRecord only return the corresponding record in the store'
    );
  });

  test('peekRecord should return the record with identifier as argument', function (assert) {
    let store = this.owner.lookup('service:store');

    let person = store.push({
      data: {
        type: 'person',
        id: '1',
      },
    });
    assert.strictEqual(
      person,
      store.peekRecord({ type: 'person', id: '1' }),
      'peekRecord only return the corresponding record in the store'
    );
  });

  test('peekRecord should return null if the record is not in the store ', function (assert) {
    let store = this.owner.lookup('service:store');

    assert.strictEqual(
      store.peekRecord('person', 1),
      null,
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
  [
    { withType: true, withId: true, desc: 'type and id' },
    { withType: true, withId: true, withLid: true, desc: 'type, id and lid' },
    {
      withType: true,
      withId: true,
      withLid: true,
      isCreate: true,
      desc: 'type, id and lid with store.createRecord',
    },
    { withType: true, withLid: true, desc: 'type and lid' },
    { withType: true, withLid: true, isCreate: true, desc: 'type and lid with store.createRecord' },
    { withType: true, withLid: true, extra: { id: null }, desc: 'type, null id, and lid' },
  ].forEach(({ withType, withId, withLid, extra, isCreate, desc }) => {
    test(`peekRecord (${desc})`, function (assert) {
      let store = this.owner.lookup('service:store');

      let person;
      if (isCreate) {
        // no id
        person = store.createRecord('person');
      } else {
        person = store.push({
          data: {
            type: 'person',
            id: '1',
          },
        });
      }

      const peekRecordArgs = Object.create(null);
      if (withType) {
        peekRecordArgs.type = 'person';
      }
      if (withId) {
        peekRecordArgs.id = '1';
      }
      if (withLid) {
        peekRecordArgs.lid = recordIdentifierFor(person).lid;
      }
      if (extra) {
        Object.assign(peekRecordArgs, extra);
      }

      assert.strictEqual(
        person,
        store.peekRecord(peekRecordArgs),
        'peekRecord only returns the corresponding record in the store'
      );
    });
  });
});
