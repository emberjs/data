import { visit } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setup, visit as SSR } from 'ember-cli-fastboot-testing/test-support';
import { setupApplicationTest } from 'ember-qunit';

module('Browser | index', function (hooks) {
  setupApplicationTest(hooks);

  test('(browser) it renders a page...', async function (assert) {
    await visit('/');

    assert.dom('h1').hasText('EmberData Fastboot Tests');

    assert.dom('ul').exists();
    assert.dom('ul>li').isVisible({ count: 5 });
    assert.dom('.tree-branch').isVisible({ count: 3 });
    assert.dom('.tree-children').isVisible({ count: 2 });
  });
});

module('FastBoot | index', function (hooks) {
  setup(hooks);

  test('(FastBoot) it renders a page...', async function (assert) {
    await SSR('/');

    assert.dom('h1').hasText('EmberData Fastboot Tests');

    assert.dom('ul').exists();
    assert.dom('ul>li').isVisible({ count: 5 });
    assert.dom('.tree-branch').isVisible({ count: 3 });
    assert.dom('.tree-children').isVisible({ count: 2 });
  });
});
