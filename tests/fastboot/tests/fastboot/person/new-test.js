import { module, test } from 'qunit';

import { setup, visit } from 'ember-cli-fastboot-testing/test-support';

module('FastBoot | /person/new', function (hooks) {
  setup(hooks);

  test('it does not error in SSR (GH#6563)', async function (assert) {
    await visit('/person/new');

    // from application.hbs
    assert.dom('h1').hasText('Ember Data');
    assert.dom('a').hasAttribute('href', '/tests');

    assert.dom('.person-name').exists();
  });
});
