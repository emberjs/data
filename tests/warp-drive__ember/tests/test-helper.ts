import { setApplication } from '@ember/test-helpers';

import configureAsserts from '@ember-data/unpublished-test-infra/test-support/asserts';
import { setupGlobalHooks } from '@warp-drive/diagnostic';
import { configure } from '@warp-drive/diagnostic/ember';
import { start } from '@warp-drive/diagnostic/runners/dom';

import Application from 'warp-drive__ember/app';
import config from 'warp-drive__ember/config/environment';

setupGlobalHooks((hooks) => {
  configureAsserts(hooks);
});

configure();

setApplication(Application.create(config.APP));
void start({
  tryCatch: false,
  debug: false,
  concurrency: 1,
  groupLogs: false,
  instrument: true,
  hideReport: false,
  useDiagnostic: true,
});
