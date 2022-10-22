import { setApplication } from '@ember/test-helpers';

import * as QUnit from 'qunit';
import { setup } from 'qunit-dom';

import { start } from 'ember-qunit';

import assertAllDeprecations from '@ember-data/unpublished-test-infra/test-support/assert-all-deprecations';
import configureAsserts from '@ember-data/unpublished-test-infra/test-support/qunit-asserts';

import Application from '../app';
import config from '../config/environment';

setup(QUnit.assert);

configureAsserts();

setApplication(Application.create(config.APP));

assertAllDeprecations();

start();
