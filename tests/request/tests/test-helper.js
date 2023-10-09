import { setApplication } from '@ember/test-helpers';

import { setTestId } from '@warp-drive/holodeck';
import * as QUnit from 'qunit';
import { setup } from 'qunit-dom';

import { start } from 'ember-qunit';

import configureAsserts from '@ember-data/unpublished-test-infra/test-support/asserts';

import Application from '../app';
import config from '../config/environment';

setup(QUnit.assert);
configureAsserts(QUnit.hooks);

setApplication(Application.create(config.APP));

QUnit.hooks.beforeEach(function (assert) {
  setTestId(assert.test.testId);
});
QUnit.hooks.afterEach(function (assert) {
  setTestId(null);
});

QUnit.config.testTimeout = 2000;
QUnit.config.urlConfig.push({
  id: 'enableoptionalfeatures',
  label: 'Enable Opt Features',
});
start({ setupTestIsolationValidation: true });
