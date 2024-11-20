import { visit } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupApplicationTest } from 'ember-qunit';
import { DEPRECATE_CATCH_ALL } from '@warp-drive/build-config/deprecations';

module('it works', function (hooks) {
  setupApplicationTest(hooks);

  test('we can boot the app', async function (assert) {
    await visit('/');
    assert.ok('it works!');
  });

  test('we can use the store', async function (assert) {
    const { owner } = this;
    const store = owner.lookup('service:store');

    const record = store.createRecord('user', { name: 'Chris' });

    assert.strictEqual(record.name, 'Chris', 'correct name');
  });

  test('we can strip individual deprecations', async function (assert) {
    if (DEPRECATE_CATCH_ALL) {
      assert.ok(false, 'we should have stripped the deprecation');
    } else {
      assert.ok(true, 'we stripped the deprecation');
    }
  });
});
