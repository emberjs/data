import { visit } from '@ember/test-helpers';

import { module, test } from 'qunit';

import { setup, visit as SSR } from 'ember-cli-fastboot-testing/test-support';
import { setupApplicationTest } from 'ember-qunit';

module('Browser | /person/new', function (hooks) {
  setupApplicationTest(hooks);

  test('(browser) it does not error in SSR Mode (GH#6563)', async function (assert) {
    await visit('/person/new');

    // from application.hbs
    assert.dom('h1').hasText('Ember Data');
    assert.dom('a').hasAttribute('href', '/tests');

    assert.dom('.person-name').exists();
  });
});

module('FastBoot | /person/new', function (hooks) {
  setup(hooks);

  test('(fastboot) it does not error in SSR Mode (GH#6563)', async function (assert) {
    await SSR('/person/new');

    // from application.hbs
    assert.dom('h1').hasText('Ember Data');
    assert.dom('a').hasAttribute('href', '/tests');

    assert.dom('.person-name').exists();
  });
});
