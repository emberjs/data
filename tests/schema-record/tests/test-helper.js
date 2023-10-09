import { setApplication } from '@ember/test-helpers';

import * as QUnit from 'qunit';
import { setup } from 'qunit-dom';

import { start } from 'ember-qunit';

import configureAsserts from '@ember-data/unpublished-test-infra/test-support/asserts';

import Application from '../app';
import config from '../config/environment';

QUnit.dump.maxDepth = 6;
QUnit.config.testTimeout = 2000;
setup(QUnit.assert);
configureAsserts(QUnit.hooks);

setApplication(Application.create(config.APP));

start({
  setupTestIsolationValidation: true,
  setupTestContainer: false,
  setupTestAdapter: false,
  setupEmberTesting: false,
  setupEmberOnerrorValidation: false,
});
