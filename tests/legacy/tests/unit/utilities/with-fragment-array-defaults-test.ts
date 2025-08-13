import { module, test } from 'qunit';

import { withFragmentArrayDefaults } from '#src/utilities/with-fragment-array-defaults.ts';

module('Unit | withFragmentArrayDefaults', function () {
  test('Creates correct schema for a fragment-array', function (assert) {
    assert.deepEqual(withFragmentArrayDefaults('addresses'), {
      kind: 'schema-array',
      type: 'fragment:address',
      name: 'addresses',
      options: {
        arrayExtensions: ['ember-object', 'ember-array-like', 'fragment-array'],
        defaultValue: true,
      },
    });
  });
});
