import { module, test } from 'qunit';

import { withFragmentDefaults } from '#src/utilities/with-fragment-defaults.ts';

module('Unit | withFragmentDefaults', function () {
  test('Creates correct schema for a fragment', function (assert) {
    assert.deepEqual(withFragmentDefaults('name'), {
      kind: 'schema-object',
      type: 'fragment:name',
      name: 'name',
      options: {
        objectExtensions: ['ember-object', 'fragment'],
      },
    });
  });
});
