import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { graphFor } from '@ember-data/graph/-private';
import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import Store from '@ember-data/store';
import { recordDataFor } from '@ember-data/store/-private';

import { stateOf } from './edge-removal/setup';

module('Integration | Graph | Edges', function (hooks) {
  setupTest(hooks);

  let store;
  let graph;
  hooks.beforeEach(function () {
    const { owner } = this;
    owner.register('service:store', Store);
    store = owner.lookup('service:store');
    graph = graphFor(store);
  });

  module('Lazy instantiation of RecordData', function () {
    /**
     * Tests in this module affirm that the relationship graph does not
     * unnecessarily force materialization of RecordData instances. This
     * allows for us to manage the state of a relationship purely from
     * knowledge derived from it's inverses.
     */

    test('accessing the relationships for an identifier does not instantiate record-data for that identifier', async function (assert) {
      const { owner } = this;
      const { identifierCache } = store;
      class User extends Model {
        @attr name;
        @belongsTo('user', { async: false, inverse: 'bestFriend' }) bestFriend;
      }
      owner.register('model:user', User);

      const identifier = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
      const identifier2 = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' });
      const bestFriend = graph.get(identifier, 'bestFriend');

      assert.strictEqual(
        recordDataFor(identifier),
        null,
        'We have no record data instance afer accessing the relationships for this identifier'
      );

      assert.ok(bestFriend, 'We can access a specific relationship');

      assert.strictEqual(
        recordDataFor(identifier),
        null,
        'We still have no record data instance after accessing a named relationship'
      );

      store.push({
        data: {
          type: 'user',
          id: '2',
          attributes: { name: '@runspired' },
          relationships: { bestFriend: { data: { type: 'user', id: '1' } } },
        },
      });

      assert.strictEqual(
        recordDataFor(identifier),
        null,
        'We still have no record data instance after push of only an identifier within a relationship'
      );

      let state = stateOf(bestFriend);
      assert.deepEqual(state.remote, [identifier2], 'Our initial canonical state is correct');
      assert.deepEqual(state.local, [identifier2], 'Our initial current state is correct');

      store.push({
        data: {
          type: 'user',
          id: '1',
          attributes: { name: 'Chris' },
        },
      });

      assert.strictEqual(
        recordDataFor(identifier)?.getAttr(identifier, 'name'),
        'Chris',
        'We lazily associate the correct record data instance'
      );
    });

    test('working with a sync belongsTo relationship for an identifier does not instantiate record-data for that identifier', async function (assert) {
      const { owner } = this;
      const { identifierCache } = store;
      class User extends Model {
        @attr name;
        @belongsTo('user', { async: false, inverse: 'bestFriend' }) bestFriend;
      }
      owner.register('model:user', User);

      const identifier = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
      const identifier2 = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' });
      const bestFriend = graph.get(identifier, 'bestFriend');

      store.push({
        data: {
          type: 'user',
          id: '2',
          attributes: { name: '@runspired' },
          relationships: { bestFriend: { data: { type: 'user', id: '1' } } },
        },
      });

      assert.strictEqual(
        recordDataFor(identifier),
        null,
        'We have no record data instance after push of only an identifier within a relationship'
      );

      let state = stateOf(bestFriend);
      assert.deepEqual(state.remote, [identifier2], 'Our initial canonical state is correct');
      assert.deepEqual(state.local, [identifier2], 'Our initial current state is correct');

      const identifier3 = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '3' });
      store._join(() => {
        graph.push({
          op: 'replaceRelatedRecord',
          record: identifier,
          field: 'bestFriend',
          value: identifier3,
        });
      });

      state = stateOf(bestFriend);
      assert.deepEqual(state.remote, [identifier3], 'Our canonical state is correct after canonical update');
      assert.deepEqual(state.local, [identifier3], 'Our current state is correct after canonical update');

      assert.strictEqual(
        recordDataFor(identifier),
        null,
        'We still have no record data instance after updating the canonical state'
      );

      store._join(() => {
        graph.update({
          op: 'replaceRelatedRecord',
          record: identifier,
          field: 'bestFriend',
          value: identifier2,
        });
      });

      state = stateOf(bestFriend);
      assert.deepEqual(state.remote, [identifier3], 'Our canonical state is correct after local update');
      assert.deepEqual(state.local, [identifier2], 'Our current state is correct after local update');

      assert.strictEqual(
        recordDataFor(identifier),
        null,
        'We still have no record data instance after updating the local state'
      );

      store.push({
        data: {
          type: 'user',
          id: '1',
          attributes: { name: 'Chris' },
        },
      });

      assert.strictEqual(
        recordDataFor(identifier)?.getAttr(identifier, 'name'),
        'Chris',
        'We lazily associate the correct record data instance'
      );
    });

    test('working with an async belongsTo relationship for an identifier does not instantiate record-data for that identifier', async function (assert) {
      const { owner } = this;
      const { identifierCache } = store;
      class User extends Model {
        @attr name;
        @belongsTo('user', { async: true, inverse: 'bestFriend' }) bestFriend;
      }
      owner.register('model:user', User);

      const identifier = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
      const identifier2 = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' });
      const bestFriend = graph.get(identifier, 'bestFriend');

      store.push({
        data: {
          type: 'user',
          id: '2',
          attributes: { name: '@runspired' },
          relationships: { bestFriend: { data: { type: 'user', id: '1' } } },
        },
      });

      assert.strictEqual(
        recordDataFor(identifier),
        null,
        'We have no record data instance after push of only an identifier within a relationship'
      );

      let state = stateOf(bestFriend);
      assert.deepEqual(state.remote, [identifier2], 'Our initial canonical state is correct');
      assert.deepEqual(state.local, [identifier2], 'Our initial current state is correct');

      const identifier3 = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '3' });
      store._join(() => {
        graph.push({
          op: 'replaceRelatedRecord',
          record: identifier,
          field: 'bestFriend',
          value: identifier3,
        });
      });

      state = stateOf(bestFriend);
      assert.deepEqual(state.remote, [identifier3], 'Our canonical state is correct after canonical update');
      assert.deepEqual(state.local, [identifier3], 'Our current state is correct after canonical update');

      assert.strictEqual(
        recordDataFor(identifier),
        null,
        'We still have no record data instance after updating the canonical state'
      );

      store._join(() => {
        graph.update({
          op: 'replaceRelatedRecord',
          record: identifier,
          field: 'bestFriend',
          value: identifier2,
        });
      });

      state = stateOf(bestFriend);
      assert.deepEqual(state.remote, [identifier3], 'Our canonical state is correct after local update');
      assert.deepEqual(state.local, [identifier2], 'Our current state is correct after local update');

      assert.strictEqual(
        recordDataFor(identifier),
        null,
        'We still have no record data instance after updating the local state'
      );

      store.push({
        data: {
          type: 'user',
          id: '1',
          attributes: { name: 'Chris' },
        },
      });

      assert.strictEqual(
        recordDataFor(identifier)?.getAttr(identifier, 'name'),
        'Chris',
        'We lazily associate the correct record data instance'
      );
    });

    test('working with a sync hasMany relationship for an identifier does not instantiate record-data for that identifier', async function (assert) {
      const { owner } = this;
      const { identifierCache } = store;
      class User extends Model {
        @attr name;
        @hasMany('user', { async: false, inverse: 'bestFriends' }) bestFriends;
      }
      owner.register('model:user', User);

      const identifier = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
      const identifier2 = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' });
      const identifier3 = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '3' });
      const bestFriends = graph.get(identifier, 'bestFriends');

      store.push({
        data: {
          type: 'user',
          id: '2',
          attributes: { name: '@runspired' },
          relationships: {
            bestFriends: {
              data: [{ type: 'user', id: '1' }],
            },
          },
        },
      });

      assert.strictEqual(
        recordDataFor(identifier),
        null,
        'We have no record data instance after push of only an identifier within a relationship'
      );

      let state = stateOf(bestFriends);
      assert.deepEqual(state.remote, [identifier2], 'Our initial canonical state is correct');
      assert.deepEqual(state.local, [identifier2], 'Our initial current state is correct');

      store._join(() => {
        graph.push({
          op: 'updateRelationship',
          record: identifier,
          field: 'bestFriends',
          value: { data: [identifier2, identifier3] },
        });
      });

      state = stateOf(bestFriends);
      assert.deepEqual(
        state.remote,
        [identifier2, identifier3],
        'Our canonical state is correct after canonical update'
      );
      assert.deepEqual(state.local, [identifier2, identifier3], 'Our current state is correct after canonical update');

      assert.strictEqual(
        recordDataFor(identifier),
        null,
        'We still have no record data instance after updating the canonical state'
      );
      const identifier4 = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '4' });

      store._join(() => {
        graph.update({
          op: 'addToRelatedRecords',
          record: identifier,
          field: 'bestFriends',
          value: identifier4,
        });
      });

      state = stateOf(bestFriends);
      assert.deepEqual(state.remote, [identifier2, identifier3], 'Our canonical state is correct after local update');
      assert.deepEqual(
        state.local,
        [identifier2, identifier3, identifier4],
        'Our current state is correct after local update'
      );

      assert.strictEqual(
        recordDataFor(identifier),
        null,
        'We still have no record data instance after updating the local state'
      );

      store.push({
        data: {
          type: 'user',
          id: '1',
          attributes: { name: 'Chris' },
        },
      });

      assert.strictEqual(
        recordDataFor(identifier)?.getAttr(identifier, 'name'),
        'Chris',
        'We lazily associate the correct record data instance'
      );
    });

    test('working with an async hasMany relationship for an identifier does not instantiate record-data for that identifier', async function (assert) {
      const { owner } = this;
      const { identifierCache } = store;
      class User extends Model {
        @attr name;
        @hasMany('user', { async: true, inverse: 'bestFriends' }) bestFriends;
      }
      owner.register('model:user', User);

      const identifier = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
      const identifier2 = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' });
      const identifier3 = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '3' });
      const bestFriends = graph.get(identifier, 'bestFriends');

      store.push({
        data: {
          type: 'user',
          id: '2',
          attributes: { name: '@runspired' },
          relationships: {
            bestFriends: {
              data: [{ type: 'user', id: '1' }],
            },
          },
        },
      });

      assert.strictEqual(
        recordDataFor(identifier),
        null,
        'We have no record data instance after push of only an identifier within a relationship'
      );

      let state = stateOf(bestFriends);
      assert.deepEqual(state.remote, [identifier2], 'Our initial canonical state is correct');
      assert.deepEqual(state.local, [identifier2], 'Our initial current state is correct');

      store._join(() => {
        graph.push({
          op: 'updateRelationship',
          record: identifier,
          field: 'bestFriends',
          value: { data: [identifier2, identifier3] },
        });
      });

      state = stateOf(bestFriends);
      assert.deepEqual(
        state.remote,
        [identifier2, identifier3],
        'Our canonical state is correct after canonical update'
      );
      assert.deepEqual(state.local, [identifier2, identifier3], 'Our current state is correct after canonical update');

      assert.strictEqual(
        recordDataFor(identifier),
        null,
        'We still have no record data instance after updating the canonical state'
      );
      const identifier4 = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '4' });

      store._join(() => {
        graph.update({
          op: 'addToRelatedRecords',
          record: identifier,
          field: 'bestFriends',
          value: identifier4,
        });
      });

      state = stateOf(bestFriends);
      assert.deepEqual(state.remote, [identifier2, identifier3], 'Our canonical state is correct after local update');
      assert.deepEqual(
        state.local,
        [identifier2, identifier3, identifier4],
        'Our current state is correct after local update'
      );

      assert.strictEqual(
        recordDataFor(identifier),
        null,
        'We still have no record data instance after updating the local state'
      );

      store.push({
        data: {
          type: 'user',
          id: '1',
          attributes: { name: 'Chris' },
        },
      });

      assert.strictEqual(
        recordDataFor(identifier)?.getAttr(identifier, 'name'),
        'Chris',
        'We lazily associate the correct record data instance'
      );
    });
  });
});
