import { setApplication } from '@ember/test-helpers';

import Application from 'ember-data__graph/app';
import config from 'ember-data__graph/config/environment';

import configureAsserts from '@ember-data/unpublished-test-infra/test-support/asserts/index';
import { setupGlobalHooks } from '@warp-drive/diagnostic';
import { configure } from '@warp-drive/diagnostic/ember';
import { start } from '@warp-drive/diagnostic/runners/dom';

setupGlobalHooks((hooks) => {
  configureAsserts(hooks);
});

configure();

setApplication(Application.create(config.APP));
void start({
  tryCatch: true,
  // debug: true,
  groupLogs: false,
  instrument: true,
  hideReport: true,
  useDiagnostic: true,
});
