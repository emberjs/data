import { module, test } from 'qunit';

import MetaStore from 'ember-data/store';
import { setupTest } from 'ember-qunit';

module('Store | CacheHandler - setup with ember-data/store', function (hooks) {
  setupTest(hooks);

  test('When using ember-data/store, we are configured correctly', async function (assert) {
    const { owner } = this;
    owner.register('service:store', MetaStore);
    assert.ok(true, 'more tests later');
  });
});
