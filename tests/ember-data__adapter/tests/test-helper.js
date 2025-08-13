import { setApplication } from '@ember/test-helpers';

import configureAsserts from '@ember-data/unpublished-test-infra/test-support/asserts/index';
import { Store } from '@warp-drive/core';
import { setupGlobalHooks } from '@warp-drive/diagnostic';
import { configure } from '@warp-drive/diagnostic/ember-classic';
import { start } from '@warp-drive/diagnostic/runners/dom';
import { Model, restoreDeprecatedModelRequestBehaviors } from '@warp-drive/legacy/model';
import { restoreDeprecatedStoreBehaviors } from '@warp-drive/legacy/store';

import Application from '../app';
import config from '../config/environment';

restoreDeprecatedStoreBehaviors(Store);
restoreDeprecatedModelRequestBehaviors(Model);

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
