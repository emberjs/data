import { module, test } from '@warp-drive/diagnostic/ember';
import { withArrayDefaults } from '@warp-drive/legacy/model-fragments';

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
