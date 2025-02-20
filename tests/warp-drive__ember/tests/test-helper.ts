import { setApplication } from '@ember/test-helpers';

import { setBuildURLConfig } from '@ember-data/request-utils';
import configureAsserts from '@ember-data/unpublished-test-infra/test-support/asserts/index';
import { SHOULD_RECORD } from '@warp-drive/build-config/env';
import { setupGlobalHooks } from '@warp-drive/diagnostic';
import { configure } from '@warp-drive/diagnostic/ember';
import { start } from '@warp-drive/diagnostic/runners/dom';
import { setConfig, setIsRecording, setTestId } from '@warp-drive/holodeck';

import Application from 'warp-drive__ember/app';
import config from 'warp-drive__ember/config/environment';

if (SHOULD_RECORD) {
  // eslint-disable-next-line no-console
  console.info('Holodeck Recording Enabled\n=========================');
  setIsRecording(true);
} else {
  // eslint-disable-next-line no-console
  console.info('Holodeck Recording Disabled\n=========================');
}

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
  tryCatch: false,
  debug: true,
  concurrency: 1,
  groupLogs: false,
  instrument: true,
  hideReport: false,
  useDiagnostic: true,
});
