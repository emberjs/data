import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr, belongsTo, hasMany } from '@ember-data/model';
import { graphFor, RecordData } from '@ember-data/record-data/-private';
import Store from '@ember-data/store';
import { recordDataFor } from '@ember-data/store/-private';

module('Integration | Graph | Edges', function(hooks) {
  setupTest(hooks);

  let store;
  let graph;
  hooks.beforeEach(function() {
    const { owner } = this;
    owner.register('service:store', Store);
    store = owner.lookup('service:store');
    graph = graphFor(store);
  });

  module('Lazy instantiation of RecordData', function() {
    /**
     * Tests in this module affirm that the relationship graph does not
     * unnecessarily force materialization of RecordData instances. This
     * allows for us to manage the state of a relationship purely from
     * knowledge derived from it's inverses.
     */

    test('accessing the relationships for an identifier does not instantiate record-data for that identifier', async function(assert) {
      const { owner } = this;
      const { identifierCache } = store;
      class User extends Model {
        @attr name;
        @belongsTo('user', { async: false, inverse: 'bestFriend' }) bestFriend;
      }
      owner.register('model:user', User);

      const identifier = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
      const identifier2 = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' });
      const relationships = graph.get(identifier);

      assert.ok(relationships, `We can access relationships`);

      const bestFriend = relationships.get('bestFriend');

      assert.true(
        recordDataFor(identifier) === null,
        'We have no record data instance afer accessing the relationships for this identifier'
      );

      assert.ok(bestFriend, 'We can access a specific relationship');

      assert.true(
        recordDataFor(identifier) === null,
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

      assert.true(
        recordDataFor(identifier) === null,
        'We still have no record data instance after push of only an identifier within a relationship'
      );

      assert.strictEqual(bestFriend.canonicalState, identifier2, 'Our initial canonical state is correct');
      assert.strictEqual(bestFriend.getData().data, identifier2, 'Our initial current state is correct');

      store.push({
        data: {
          type: 'user',
          id: '1',
          attributes: { name: 'Chris' },
        },
      });

      assert.true(
        recordDataFor(identifier) instanceof RecordData,
        'We lazily associate the correct record data instance'
      );
    });

    test('working with a sync belongsTo relationship for an identifier does not instantiate record-data for that identifier', async function(assert) {
      const { owner } = this;
      const { identifierCache } = store;
      class User extends Model {
        @attr name;
        @belongsTo('user', { async: false, inverse: 'bestFriend' }) bestFriend;
      }
      owner.register('model:user', User);

      const identifier = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
      const identifier2 = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' });
      const relationships = graph.get(identifier);
      const bestFriend = relationships.get('bestFriend');

      store.push({
        data: {
          type: 'user',
          id: '2',
          attributes: { name: '@runspired' },
          relationships: { bestFriend: { data: { type: 'user', id: '1' } } },
        },
      });

      assert.true(
        recordDataFor(identifier) === null,
        'We have no record data instance after push of only an identifier within a relationship'
      );

      assert.strictEqual(bestFriend.canonicalState, identifier2, 'Our initial canonical state is correct');
      assert.strictEqual(bestFriend.getData().data, identifier2, 'Our initial current state is correct');

      const identifier3 = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '3' });
      bestFriend.push({ data: identifier3 });

      assert.strictEqual(
        bestFriend.canonicalState,
        identifier3,
        'Our canonical state is correct after canonical update'
      );
      assert.strictEqual(bestFriend.getData().data, identifier3, 'Our current state is correct after canonical update');

      assert.true(
        recordDataFor(identifier) === null,
        'We still have no record data instance after updating the canonical state'
      );

      bestFriend.setRecordData(identifier2);

      assert.strictEqual(bestFriend.canonicalState, identifier3, 'Our canonical state is correct after local update');
      assert.strictEqual(bestFriend.getData().data, identifier2, 'Our current state is correct after local update');

      assert.true(
        recordDataFor(identifier) === null,
        'We still have no record data instance after updating the local state'
      );

      store.push({
        data: {
          type: 'user',
          id: '1',
          attributes: { name: 'Chris' },
        },
      });

      assert.true(
        recordDataFor(identifier) instanceof RecordData,
        'We lazily associate the correct record data instance'
      );
    });

    test('working with an async belongsTo relationship for an identifier does not instantiate record-data for that identifier', async function(assert) {
      const { owner } = this;
      const { identifierCache } = store;
      class User extends Model {
        @attr name;
        @belongsTo('user', { async: true, inverse: 'bestFriend' }) bestFriend;
      }
      owner.register('model:user', User);

      const identifier = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
      const identifier2 = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '2' });
      const relationships = graph.get(identifier);
      const bestFriend = relationships.get('bestFriend');

      store.push({
        data: {
          type: 'user',
          id: '2',
          attributes: { name: '@runspired' },
          relationships: { bestFriend: { data: { type: 'user', id: '1' } } },
        },
      });

      assert.true(
        recordDataFor(identifier) === null,
        'We have no record data instance after push of only an identifier within a relationship'
      );

      assert.strictEqual(bestFriend.canonicalState, identifier2, 'Our initial canonical state is correct');
      assert.strictEqual(bestFriend.getData().data, identifier2, 'Our initial current state is correct');

      const identifier3 = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '3' });
      bestFriend.push({ data: identifier3 });

      assert.strictEqual(
        bestFriend.canonicalState,
        identifier3,
        'Our canonical state is correct after canonical update'
      );
      assert.strictEqual(bestFriend.getData().data, identifier3, 'Our current state is correct after canonical update');

      assert.true(
        recordDataFor(identifier) === null,
        'We still have no record data instance after updating the canonical state'
      );

      bestFriend.setRecordData(identifier2);

      assert.strictEqual(bestFriend.canonicalState, identifier3, 'Our canonical state is correct after local update');
      assert.strictEqual(bestFriend.getData().data, identifier2, 'Our current state is correct after local update');

      assert.true(
        recordDataFor(identifier) === null,
        'We still have no record data instance after updating the local state'
      );

      store.push({
        data: {
          type: 'user',
          id: '1',
          attributes: { name: 'Chris' },
        },
      });

      assert.true(
        recordDataFor(identifier) instanceof RecordData,
        'We lazily associate the correct record data instance'
      );
    });

    test('working with a sync hasMany relationship for an identifier does not instantiate record-data for that identifier', async function(assert) {
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
      const relationships = graph.get(identifier);
      const bestFriends = relationships.get('bestFriends');

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

      assert.true(
        recordDataFor(identifier) === null,
        'We have no record data instance after push of only an identifier within a relationship'
      );

      assert.deepEqual(bestFriends.canonicalState, [identifier2], 'Our initial canonical state is correct');
      assert.deepEqual(bestFriends.getData().data, [identifier2], 'Our initial current state is correct');

      bestFriends.push({ data: [identifier2, identifier3] });

      assert.deepEqual(
        bestFriends.canonicalState,
        [identifier2, identifier3],
        'Our canonical state is correct after canonical update'
      );
      assert.deepEqual(
        bestFriends.getData().data,
        [identifier2, identifier3],
        'Our current state is correct after canonical update'
      );

      assert.true(
        recordDataFor(identifier) === null,
        'We still have no record data instance after updating the canonical state'
      );
      const identifier4 = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '4' });

      bestFriends.addRecordData(identifier4);

      assert.deepEqual(
        bestFriends.canonicalState,
        [identifier2, identifier3],
        'Our canonical state is correct after local update'
      );
      assert.deepEqual(
        bestFriends.getData().data,
        [identifier2, identifier3, identifier4],
        'Our current state is correct after local update'
      );

      assert.true(
        recordDataFor(identifier) === null,
        'We still have no record data instance after updating the local state'
      );

      store.push({
        data: {
          type: 'user',
          id: '1',
          attributes: { name: 'Chris' },
        },
      });

      assert.true(
        recordDataFor(identifier) instanceof RecordData,
        'We lazily associate the correct record data instance'
      );
    });

    test('working with an async hasMany relationship for an identifier does not instantiate record-data for that identifier', async function(assert) {
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
      const relationships = graph.get(identifier);
      const bestFriends = relationships.get('bestFriends');

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

      assert.true(
        recordDataFor(identifier) === null,
        'We have no record data instance after push of only an identifier within a relationship'
      );

      assert.deepEqual(bestFriends.canonicalState, [identifier2], 'Our initial canonical state is correct');
      assert.deepEqual(bestFriends.getData().data, [identifier2], 'Our initial current state is correct');

      bestFriends.push({ data: [identifier2, identifier3] });

      assert.deepEqual(
        bestFriends.canonicalState,
        [identifier2, identifier3],
        'Our canonical state is correct after canonical update'
      );
      assert.deepEqual(
        bestFriends.getData().data,
        [identifier2, identifier3],
        'Our current state is correct after canonical update'
      );

      assert.true(
        recordDataFor(identifier) === null,
        'We still have no record data instance after updating the canonical state'
      );
      const identifier4 = identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '4' });

      bestFriends.addRecordData(identifier4);

      assert.deepEqual(
        bestFriends.canonicalState,
        [identifier2, identifier3],
        'Our canonical state is correct after local update'
      );
      assert.deepEqual(
        bestFriends.getData().data,
        [identifier2, identifier3, identifier4],
        'Our current state is correct after local update'
      );

      assert.true(
        recordDataFor(identifier) === null,
        'We still have no record data instance after updating the local state'
      );

      store.push({
        data: {
          type: 'user',
          id: '1',
          attributes: { name: 'Chris' },
        },
      });

      assert.true(
        recordDataFor(identifier) instanceof RecordData,
        'We lazily associate the correct record data instance'
      );
    });
  });
});
