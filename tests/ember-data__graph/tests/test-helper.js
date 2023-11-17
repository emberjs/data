import { setApplication } from '@ember/test-helpers';

import configureAsserts from '@ember-data/unpublished-test-infra/test-support/asserts';
import { setupGlobalHooks } from '@warp-drive/diagnostic';
import { configure } from '@warp-drive/diagnostic/ember';
import { start } from '@warp-drive/diagnostic/runners/dom';

import Application from '../app';
import config from '../config/environment';

setupGlobalHooks((hooks) => {
  configureAsserts(hooks);
});

configure();

setApplication(Application.create(config.APP));
start({
  tryCatch: false,
  groupLogs: false,
  instrument: true,
  hideReport: true,
  useDiagnostic: true,
});
