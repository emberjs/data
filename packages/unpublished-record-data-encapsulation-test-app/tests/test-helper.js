import { setApplication } from '@ember/test-helpers';

import { start } from 'ember-qunit';

import assertAllDeprecations from '@ember-data/unpublished-test-infra/test-support/assert-all-deprecations';
import configureAsserts from '@ember-data/unpublished-test-infra/test-support/qunit-asserts';

import Application from '../app';
import config from '../config/environment';

configureAsserts();

setApplication(Application.create(config.APP));

assertAllDeprecations();

start();
