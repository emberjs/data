import { setApplication } from '@ember/test-helpers';

import * as QUnit from 'qunit';
import { setup } from 'qunit-dom';

import { start } from 'ember-qunit';

import assertAllDeprecations from '@ember-data/unpublished-test-infra/test-support/assert-all-deprecations';
import configureAsserts from '@ember-data/unpublished-test-infra/test-support/qunit-asserts';
import customQUnitAdapter from '@ember-data/unpublished-test-infra/test-support/testem/custom-qunit-adapter';

import Application from '../app';
import config from '../config/environment';

// Handle testing feature flags
if (QUnit.urlParams.enableoptionalfeatures) {
  window.EmberDataENV = { ENABLE_OPTIONAL_FEATURES: true };
}

QUnit.dump.maxDepth = 6;
setup(QUnit.assert);

configureAsserts();

setApplication(Application.create(config.APP));

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
