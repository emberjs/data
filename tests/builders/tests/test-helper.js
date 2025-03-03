import { setApplication } from '@ember/test-helpers';

import configureAsserts from '@ember-data/unpublished-test-infra/test-support/asserts/index';
import { setupGlobalHooks } from '@warp-drive/diagnostic';
import { configure } from '@warp-drive/diagnostic/ember';
import { start } from '@warp-drive/diagnostic/runners/dom';

import Application from '../app';
import config from '../config/environment';

configure();

setupGlobalHooks((hooks) => {
  configureAsserts(hooks);
});

setApplication(Application.create(config.APP));
start({
  tryCatch: false,
  // concurrency: 1,
  debug: true,
  groupLogs: false,
  instrument: true,
  hideReport: false,
  useDiagnostic: true,
});
