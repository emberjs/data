import { setApplication } from '@ember/test-helpers';

import * as QUnit from 'qunit';
import { setup } from 'qunit-dom';

import { start } from 'ember-qunit';

import Application from '../app';
import config from '../config/environment';

setup(QUnit.assert);

setApplication(Application.create(config.APP));

start();
