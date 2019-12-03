import Application from '../app';
import config from '../config/environment';
import { setApplication } from '@ember/test-helpers';
import { start } from 'ember-qunit';
import configureAsserts from '@ember-data/unpublished-test-infra/test-support/qunit-asserts';
import assertAllDeprecations from '@ember-data/unpublished-test-infra/test-support/assert-all-deprecations';

configureAsserts();

setApplication(Application.create(config.APP));

assertAllDeprecations();

start();
