import config from 'dummy/config/environment';
import { module, test } from 'qunit';

import { DEPRECATE_3_12 } from '@ember-data/private-build-infra/current-deprecations';

const { compatWith } = config;

module('test compatWith', function () {
  test('deprecation strips', function (assert) {
    let deprecation_stripped = true;

    if (DEPRECATE_3_12) {
      deprecation_stripped = false;
    }

    if (compatWith === '3.0' || compatWith === '3.8') {
      assert.false(deprecation_stripped, 'deprecation code was not stripped');
    } else if (compatWith === '3.12' || compatWith === '3.16' || compatWith === '99.0') {
      assert.true(deprecation_stripped, 'deprecation code was stripped');
    } else {
      // do nothing
    }
  });
});
