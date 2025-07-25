import { setApplication } from '@ember/test-helpers';

import * as QUnit from 'qunit';
import { setup } from 'qunit-dom';

import { start } from 'ember-qunit';

import configureAsserts from '@ember-data/unpublished-test-infra/test-support/asserts/index';
import { Store } from '@warp-drive/core';
import { Model, restoreDeprecatedModelRequestBehaviors } from '@warp-drive/legacy/model';
import { restoreDeprecatedStoreBehaviors } from '@warp-drive/legacy/store';

import Application from '../app';
import config from '../config/environment';

restoreDeprecatedStoreBehaviors(Store);
restoreDeprecatedModelRequestBehaviors(Model);

setup(QUnit.assert);
configureAsserts(QUnit.hooks);

setApplication(Application.create(config.APP));

QUnit.config.testTimeout = 2000;
start({ setupTestIsolationValidation: true });
