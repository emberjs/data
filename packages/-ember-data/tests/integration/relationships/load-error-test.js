import EmberObject, { get } from '@ember/object';

import { module, test } from 'qunit';
import { reject } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Model, { belongsTo } from '@ember-data/model';

module('Relationships | load error', function (hooks) {
  setupTest(hooks);
  let store;
  let record;

  class BadRequestError extends Error {}

  class ErrorAdapter extends EmberObject {
    findRecord() {
      return reject(new BadRequestError());
    }
  }

  class TestModel extends Model {
    @belongsTo('test-model', { inverse: null, async: true }) rel;
  }

  hooks.beforeEach(function () {
    const { owner } = this;
    owner.register('model:test-model', TestModel);
    owner.register('adapter:application', ErrorAdapter);
    store = owner.lookup('service:store');
    record = store.push({
      data: {
        type: 'test-model',
        id: '2',
        relationships: {
          rel: { data: { type: 'test-model', id: '3' } },
        },
      },
    });
  });

  test('record.id is available after async belongsTo relationship is rejected', async function (assert) {
    const id = '3';

    assert.equal(record.belongsTo('rel').id(), id, 'belongsTo().id() before reject');
    assert.equal(get(record, 'rel.id'), id, 'record.id before reject');

    let error;
    try {
      await record.rel;
    } catch (err) {
      error = err;
    }

    assert.true(error instanceof BadRequestError, 'async relationship was rejected');

    assert.equal(record.belongsTo('rel').id(), id, 'belongsTo().id() after reject');
    assert.equal(get(record, 'rel.id'), id, 'record.id after reject');
  });
});
