import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import { Cache } from '@ember-data/json-api';
import Store from '@ember-data/store';
import type { NotificationType } from '@ember-data/store/-private/managers/notification-manager';
import type { SingleResourceDataDocument, StructuredDocument } from '@ember-data/types/cache/document';
import type { CacheStoreWrapper } from '@ember-data/types/q/cache-store-wrapper';
import type { SingleResourceDocument } from '@ember-data/types/q/ember-data-json-api';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';

class TestStore extends Store {
  createCache(wrapper: CacheStoreWrapper) {
    return new Cache(wrapper);
  }

  instantiateRecord(identifier: StableRecordIdentifier) {
    const { id, lid, type } = identifier;
    const record = { id, lid, type };

    this.notifications.subscribe(identifier, (_: StableRecordIdentifier, kind: NotificationType, key?: string) => {
      if (kind === 'attributes' && key) {
        record[key] = this.cache.getAttr(identifier, key);
      }
    });

    return record;
  }
}

module('Integration | @ember-data/json-api Cache', function (hooks) {
  setupTest(hooks);

  hooks.beforeEach(function () {
    this.owner.register('service:store', TestStore);
  });

  test('single resource documents are correctly deconstructed', function (assert) {
    const store = this.owner.lookup('service:store') as Store;

    const responseDocument = store.cache.put({
      content: {
        data: { type: 'user', id: '1', attributes: { name: 'Chris' } },
      },
    } as StructuredDocument<SingleResourceDocument>) as SingleResourceDataDocument;
    const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });

    assert.strictEqual(responseDocument.data, identifier, 'We were given the correct data back');
  });
});
