import { setApplication } from '@ember/test-helpers';

import * as QUnit from 'qunit';
import { setup } from 'qunit-dom';
import RSVP from 'rsvp';

import { start } from 'ember-qunit';

import assertAllDeprecations from '@ember-data/unpublished-test-infra/test-support/assert-all-deprecations';
import configureAsserts from '@ember-data/unpublished-test-infra/test-support/qunit-asserts';
import customQUnitAdapter from '@ember-data/unpublished-test-infra/test-support/testem/custom-qunit-adapter';

import Application from '../app';
import config from '../config/environment';

if (window.Promise === undefined) {
  window.Promise = RSVP.Promise;
}

// Handle testing feature flags
if (QUnit.urlParams.enableoptionalfeatures) {
  window.EmberDataENV = { ENABLE_OPTIONAL_FEATURES: true };
}

setup(QUnit.assert);

configureAsserts();

setApplication(Application.create(config.APP));

assertAllDeprecations();

if (window.Testem) {
  window.Testem.useCustomAdapter(customQUnitAdapter);
}

QUnit.begin(function () {
  RSVP.configure('onerror', (reason) => {
    // only print error messages if they're exceptions;
    // otherwise, let a future turn of the event loop
    // handle the error.
    // TODO kill this off
    if (reason && reason instanceof Error) {
      throw reason;
    }
  });
});

QUnit.config.testTimeout = 2000;
QUnit.config.urlConfig.push({
  id: 'enableoptionalfeatures',
  label: 'Enable Opt Features',
});
start({ setupTestIsolationValidation: true });
