import { module, test } from 'qunit';

import MetaStore from 'ember-data/store';
import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import { recordIdentifierFor } from '@ember-data/store';

module('Store | CacheHandler - setup with ember-data/store', function (hooks) {
  setupTest(hooks);

  test('When using ember-data/store, we are configured correctly', async function (assert) {
    const { owner } = this;
    owner.register('service:store', MetaStore);
    owner.register(
      'model:user',
      class extends Model {
        @attr name;
      }
    );

    const store = owner.lookup('service:store');

    const userDocument = await store.request({
      url: '/assets/users/1.json',
    });

    const identifier = store.identifierCache.getOrCreateRecordIdentifier({ type: 'user', id: '1' });
    const record = store.peekRecord(identifier);
    const data = userDocument.content.data;

    assert.strictEqual(record?.name, 'Chris Thoburn', 'record name is correct');
    assert.strictEqual(data, record, 'record was returned as data');
    assert.strictEqual(data && recordIdentifierFor(data), identifier, 'we get a record back as data');
    assert.strictEqual(userDocument.content.identifier?.lid, '/assets/users/1.json', 'we get back url as the cache key');
    assert.deepEqual(
      userDocument.content.links,
      { self: '/assets/users/1.json' },
      'we get access to the document links'
    );
    assert.deepEqual(
      userDocument.content.meta,
      {
        expiration: 120000,
      },
      'we get access to the document meta'
    );
  });
});
