import '@ember-data/request-utils/deprecation-support';

import { default as Inflector, singularize as inflectorSingularize } from 'ember-inflector';

import { singularize } from '@ember-data/request-utils/string';
import { DEPRECATE_EMBER_INFLECTOR } from '@warp-drive/build-config/deprecations';
import { module, test } from '@warp-drive/diagnostic';
import { setupTest } from '@warp-drive/diagnostic/ember';

module('Unit | Inflection Deprecation', function (hooks) {
  setupTest(hooks);

  test('Uncountable works as expected', function (assert) {
    Inflector.inflector.uncountable('trails');

    if (DEPRECATE_EMBER_INFLECTOR) {
      assert.equal(singularize('trails'), 'trails', 'Uncountable rule is applied to @ember-data/request-utils/string');
    } else {
      assert.equal(
        singularize('trails'),
        'trail',
        'Uncountable rule is NOT pplied to @ember-data/request-utils/string'
      );
    }
    assert.equal(inflectorSingularize('trails'), 'trails', 'Uncountable rule is applied to ember-inflector');

    assert.expectDeprecation({
      id: 'warp-drive.ember-inflector',
      count: 1,
      until: '6.0.0',
    });
  });
});
