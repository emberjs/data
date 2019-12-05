import Application from '../app';
import config from '../config/environment';
import RSVP from 'rsvp';
import { setApplication } from '@ember/test-helpers';
import { start } from 'ember-qunit';

import QUnit from 'qunit';
import configureAsserts from '@ember-data/unpublished-test-infra/test-support/qunit-asserts';
import additionalLegacyAsserts from '@ember-data/unpublished-test-infra/test-support/legacy';
import assertAllDeprecations from '@ember-data/unpublished-test-infra/test-support/assert-all-deprecations';
import customQUnitAdapter from '@ember-data/unpublished-test-infra/test-support/testem/custom-qunit-adapter';

if (window.Promise === undefined) {
  window.Promise = RSVP.Promise;
}

configureAsserts();
additionalLegacyAsserts();

setApplication(Application.create(config.APP));

assertAllDeprecations();

if (window.Testem) {
  window.Testem.useCustomAdapter(customQUnitAdapter);
}

QUnit.begin(function() {
  RSVP.configure('onerror', reason => {
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
