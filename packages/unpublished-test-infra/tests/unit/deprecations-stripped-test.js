import { module, test } from 'ember-qunit';
import config from 'dummy/config/environment';
import { DEPRECATE_EVENTED_API_USAGE } from '@ember-data/private-build-infra/deprecations';

const { compatWith } = config;

module('test compatWith', function() {
  test('deprecation strips', function(assert) {
    let deprecation_stripped = true;

    if (DEPRECATE_EVENTED_API_USAGE) {
      deprecation_stripped = false;
    }

    if (compatWith === '3.0' || compatWith === '3.8') {
      assert.equal(deprecation_stripped, false, 'deprecation code was not stripped');
    } else if (compatWith === '3.12' || compatWith === '3.16' || compatWith === '99.0') {
      assert.equal(deprecation_stripped, true, 'deprecation code was stripped');
    } else {
      // do nothing
    }
  });
});
