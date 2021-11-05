import EmberObject from '@ember/object';

import { module, test } from 'qunit';
import { reject } from 'rsvp';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo } from '@ember-data/model';

module('Relationships | unloading new records', function (hooks) {
  setupTest(hooks);
  let store;
  let entryNode;

  class ErrorAdapter extends EmberObject {
    shouldBackgroundReloadRecord() {
      return false;
    }
    shouldBackgroundReloadAll() {
      return false;
    }
    shouldReloadAll() {
      return false;
    }
    shouldReloadRecord() {
      return false;
    }
    findRecord() {
      return reject(new Error(`Bad Request`));
    }
  }

  class Node extends Model {
    @attr() name;
    @belongsTo('node', { inverse: null, async: false }) parent;
    @belongsTo('node', { inverse: null, async: true }) relatedGraph;
  }

  hooks.beforeEach(function () {
    const { owner } = this;
    owner.register('model:node', Node);
    owner.register('adapter:application', ErrorAdapter);
    store = owner.lookup('service:store');

    entryNode = store.push({
      data: {
        type: 'node',
        id: '2',
        attributes: { name: 'entry-node' },
        relationships: {
          parent: { data: { type: 'node', id: '1' } },
          relatedGraph: { data: { type: 'node', id: '3' } },
        },
      },
      included: [
        {
          type: 'node',
          id: '1',
          attributes: { name: 'root' },
        },
        {
          type: 'node',
          id: '3',
          attributes: { name: 'an async relatedGraph entry' },
        },
      ],
    });
  });

  test('Reloading a sync belongsTo returns the error thrown', async function (assert) {
    try {
      await entryNode.belongsTo('parent').reload();
      assert.ok(false, 'No error thrown');
    } catch (e) {
      assert.strictEqual(e.message, 'Bad Request', 'We caught the correct error');
    }
  });

  test('Reloading an async belongsTo returns the error thrown', async function (assert) {
    try {
      await entryNode.belongsTo('relatedGraph').reload();
      assert.ok(false, 'No error thrown');
    } catch (e) {
      assert.strictEqual(e.message, 'Bad Request', 'We caught the correct error');
    }
  });
});
