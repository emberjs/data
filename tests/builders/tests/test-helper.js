import { setApplication } from '@ember/test-helpers';

import configureAsserts from '@ember-data/unpublished-test-infra/test-support/asserts/index';
import { setupGlobalHooks } from '@warp-drive/diagnostic';
import { configure } from '@warp-drive/diagnostic/ember-classic';
import { start } from '@warp-drive/diagnostic/runners/dom';

import Application from '../app';
import config from '../config/environment';

configure();

setupGlobalHooks((hooks) => {
  configureAsserts(hooks);
});

setApplication(Application.create(config.APP));
start({
  useDiagnostic: true,
});
