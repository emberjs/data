import { setApplication } from '@ember/test-helpers';

import * as QUnit from 'qunit';
import { setup } from 'qunit-dom';

import { start } from 'ember-qunit';

import { setTestId } from '@ember-data/mock-server';
import assertAllDeprecations from '@ember-data/unpublished-test-infra/test-support/assert-all-deprecations';
import configureAsserts from '@ember-data/unpublished-test-infra/test-support/qunit-asserts';
import customQUnitAdapter from '@ember-data/unpublished-test-infra/test-support/testem/custom-qunit-adapter';

import Application from '../app';
import config from '../config/environment';

QUnit.dump.maxDepth = 5;
setup(QUnit.assert);

configureAsserts();

QUnit.hooks.beforeEach(function (assert) {
  setTestId(assert.test.testId);
});
QUnit.hooks.afterEach(function (assert) {
  setTestId(null);
});

setApplication(Application.create(config.APP));

assertAllDeprecations();

if (window.Testem) {
  window.Testem.useCustomAdapter(customQUnitAdapter);
}

QUnit.config.testTimeout = 2000;

start({ setupTestIsolationValidation: true });
