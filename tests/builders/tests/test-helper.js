import * as QUnit from 'qunit';

import { start } from 'ember-qunit';

import assertAllDeprecations from '@ember-data/unpublished-test-infra/test-support/assert-all-deprecations';
import configureAsserts from '@ember-data/unpublished-test-infra/test-support/qunit-asserts';
import customQUnitAdapter from '@ember-data/unpublished-test-infra/test-support/testem/custom-qunit-adapter';

// Handle testing feature flags
if (QUnit.urlParams.enableoptionalfeatures) {
  window.EmberDataENV = { ENABLE_OPTIONAL_FEATURES: true };
}

configureAsserts();

assertAllDeprecations();

if (window.Testem) {
  window.Testem.useCustomAdapter(customQUnitAdapter);
}

QUnit.config.testTimeout = 2000;

start({
  setupTestIsolationValidation: true,
  setupTestContainer: false,
  setupTestAdapter: false,
  setupEmberTesting: false,
  setupEmberOnerrorValidation: false,
});
