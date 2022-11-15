import { visit } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setupApplicationTest } from 'ember-qunit';

module('it works', function (hooks) {
  setupApplicationTest(hooks);

  test('we can boot the app', async function (assert) {
    await visit('/');
    assert.ok('it works!');
  });
});
