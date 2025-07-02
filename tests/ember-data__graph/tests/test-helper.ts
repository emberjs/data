import { setApplication } from '@ember/test-helpers';

import Application from 'ember-data__graph/app';
import config from 'ember-data__graph/config/environment';

import configureAsserts from '@ember-data/unpublished-test-infra/test-support/asserts/index';
import { Store } from '@warp-drive/core';
import { IS_CI } from '@warp-drive/core/build-config/env';
import { setupGlobalHooks } from '@warp-drive/diagnostic';
import { configure } from '@warp-drive/diagnostic/ember';
import { start } from '@warp-drive/diagnostic/runners/dom';
import { Model, restoreDeprecatedModelRequestBehaviors } from '@warp-drive/legacy/model';
import { restoreDeprecatedStoreBehaviors } from '@warp-drive/legacy/store';

restoreDeprecatedStoreBehaviors(Store);
restoreDeprecatedModelRequestBehaviors(Model);

setupGlobalHooks((hooks) => {
  configureAsserts(hooks);
});

configure();

setApplication(Application.create(config.APP));
void start({
  tryCatch: false,
  debug: IS_CI ? false : true,
  groupLogs: false,
  instrument: true,
  hideReport: IS_CI ? true : false,
  useDiagnostic: true,
});
