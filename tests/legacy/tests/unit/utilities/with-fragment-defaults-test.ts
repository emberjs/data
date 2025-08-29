import { module, test } from '@warp-drive/diagnostic/ember';
import { withFragmentDefaults } from '@warp-drive/legacy/model-fragments';

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
