import { setApplication } from '@ember/test-helpers';

import { setBuildURLConfig } from '@ember-data/request-utils';
import configureAsserts from '@ember-data/unpublished-test-infra/test-support/asserts';
import { setupGlobalHooks } from '@warp-drive/diagnostic';
import { configure } from '@warp-drive/diagnostic/ember';
import { start } from '@warp-drive/diagnostic/runners/dom';
import { setConfig, setTestId } from '@warp-drive/holodeck';

import Application from 'warp-drive__ember/app';
import config from 'warp-drive__ember/config/environment';

const MockHost = `https://${window.location.hostname}:${Number(window.location.port) + 1}`;
setBuildURLConfig({
  host: MockHost,
  namespace: '',
});
setConfig({ host: MockHost });

setupGlobalHooks((hooks) => {
  configureAsserts(hooks);
});

configure();

setupGlobalHooks((hooks) => {
  hooks.beforeEach(function (assert) {
    setTestId(this, (assert as unknown as { test: { testId: string } }).test.testId);
  });
  hooks.afterEach(function () {
    setTestId(this, null);
  });
});

setApplication(Application.create(config.APP));

void start({
  tryCatch: true,
  debug: true,
  concurrency: 1,
  groupLogs: false,
  instrument: true,
  hideReport: false,
  useDiagnostic: true,
});
