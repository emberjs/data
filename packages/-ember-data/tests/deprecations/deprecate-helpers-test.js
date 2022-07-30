import { module } from 'qunit';

import { setupTest } from 'ember-qunit';

import { normalizeModelName } from '@ember-data/store';
import { normalizeModelName as _privateNormalize } from '@ember-data/store/private';
import { deprecatedTest } from '@ember-data/unpublished-test-infra/test-support/deprecated-test';

module('Deprecations', function (hooks) {
  setupTest(hooks);

  deprecatedTest(
    `Calling normalizeModelName`,
    { id: 'ember-data:deprecate-normalize-modelname-helper', until: '5.0', count: 1 },
    function (assert) {
      normalizeModelName('user');
      assert.ok(true);
    }
  );

  deprecatedTest(
    `Calling normalizeModelName imported from private`,
    { id: 'ember-data:deprecate-normalize-modelname-helper', until: '5.0', count: 1 },
    function (assert) {
      _privateNormalize('user');
      assert.ok(true);
    }
  );
});
