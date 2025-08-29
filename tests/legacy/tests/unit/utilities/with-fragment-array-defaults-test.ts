import { module, test } from '@warp-drive/diagnostic/ember';
import { withFragmentArrayDefaults } from '@warp-drive/legacy/model-fragments';

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
