import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Store from '@ember-data/store';

module('Integration | Identifiers - cache', function(hooks) {
  setupTest(hooks);
  let store, cache;

  hooks.beforeEach(function() {
    this.owner.register(`service:store`, Store);
    store = this.owner.lookup('service:store');
    cache = store.identifierCache;
  });

  module('getOrCreateRecordIdentifier()', function() {
    test('creates a new resource identifier if forgetRecordIdentifier() has been called on the existing identifier', async function(assert) {
      const runspiredHash = {
        type: 'person',
        id: '1',
        attributes: {
          name: 'runspired',
        },
      };
      const identifier = cache.getOrCreateRecordIdentifier(runspiredHash);

      cache.forgetRecordIdentifier(identifier);

      const regeneratedIdentifier = cache.getOrCreateRecordIdentifier(runspiredHash);

      assert.notStrictEqual(
        identifier,
        regeneratedIdentifier,
        'a record get a new identifier if identifier get forgotten'
      );
    });

    test('returns the existing identifier when called with an identifier', async function(assert) {
      const houseHash = {
        type: 'house',
        id: '1',
        attributes: {
          name: 'Moomin',
        },
      };
      const cache = store.identifierCache;
      const identifier = cache.getOrCreateRecordIdentifier(houseHash);

      assert.strictEqual(
        identifier,
        cache.getOrCreateRecordIdentifier(identifier),
        'getOrCreateRecordIdentifier() return identifier'
      );
    });

    test('identifiers are cached by lid and can be looked up by lid', async function(assert) {
      const houseHash = {
        type: 'house',
        id: '1',
        attributes: {
          name: 'Moomin',
        },
      };
      const cache = store.identifierCache;
      const identifier = cache.getOrCreateRecordIdentifier(houseHash);

      assert.strictEqual(
        identifier,
        cache.getOrCreateRecordIdentifier({ lid: identifier.lid }),
        'getOrCreateRecordIdentifier() return identifier'
      );

      assert.strictEqual(
        identifier,
        cache.getOrCreateRecordIdentifier({ type: 'not house', lid: identifier.lid }),
        'getOrCreateRecordIdentifier() return identifier'
      );
    });
  });
});
