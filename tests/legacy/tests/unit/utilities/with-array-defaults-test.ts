import { module, test } from 'qunit';

import { withArrayDefaults } from '#src/utilities/with-array-defaults.ts';

module('Unit | withArrayDefaults', function () {
  test('Creates correct schema for an array', function (assert) {
    assert.deepEqual(withArrayDefaults('titles'), {
      kind: 'array' as const,
      name: 'titles',
      type: 'array:title',
      options: {
        arrayExtensions: ['ember-object', 'ember-array-like', 'fragment-array'],
      },
    });
  });
});
