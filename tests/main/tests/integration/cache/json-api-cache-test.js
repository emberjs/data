import EmberObject from '@ember/object';

import { module, test } from 'qunit';

import { setupTest } from 'ember-qunit';

import Model, { attr } from '@ember-data/model';
import { DEPRECATE_V1_RECORD_DATA } from '@ember-data/private-build-infra/current-deprecations';
import { recordIdentifierFor } from '@ember-data/store';

module('@ember-data/json-api | Cache', function (hooks) {
  setupTest(hooks);

  test('Cache.hasDirtyAttributes returns true for in-flight attributes', async function (assert) {
    const { owner } = this;
    owner.register(
      'model:user',
      class extends Model {
        @attr name;
      }
    );
    owner.register(
      'adapter:application',
      class extends EmberObject {
        updateRecord() {
          return new Promise((resolve) => setTimeout(resolve, 1)).then(() => {
            return { data: { type: 'user', id: '1' } };
          });
        }
      }
    );
    const store = owner.lookup('service:store');
    const user = store.push({ data: { type: 'user', id: '1', attributes: { name: 'Wesley Youman' } } });
    const identifier = recordIdentifierFor(user);
    user.name = 'Wesley Thoburn';
    const cache = DEPRECATE_V1_RECORD_DATA ? store._instanceCache.getResourceCache(identifier) : store.cache;
    assert.true(user.hasDirtyAttributes, 'the record is dirty before save');
    assert.true(cache.hasChangedAttrs(identifier), 'the cache reflects changes before save');

    const promise = user.save();

    assert.true(user.hasDirtyAttributes, 'the record is dirty during save');
    assert.true(cache.hasChangedAttrs(identifier), 'the cache reflects changes during save');

    await promise;

    assert.false(user.hasDirtyAttributes, 'the record is clean after save');
    assert.false(cache.hasChangedAttrs(identifier), 'the cache is clean after save');
  });
});
