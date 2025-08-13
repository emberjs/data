import '@warp-drive/ember/install';

import { SHOULD_RECORD } from '@warp-drive/core/build-config/env';
import { setupGlobalHooks } from '@warp-drive/diagnostic';
import { configure } from '@warp-drive/diagnostic/ember';
import { start } from '@warp-drive/diagnostic/runners/dom';
import { setConfig, setIsRecording, setTestId } from '@warp-drive/holodeck';
import { setBuildURLConfig } from '@warp-drive/utilities';

import EmberRouter from '@ember/routing/router';
import { setApplication } from '@ember/test-helpers';
import EmberApp from 'ember-strict-application-resolver';

import.meta.glob('./tests/**/*-test.{js,ts,gjs,gts}', { eager: true });

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

configure();

setupGlobalHooks((hooks) => {
  hooks.beforeEach(function (assert) {
    setTestId(this, (assert as unknown as { test: { testId: string } }).test.testId);
  });
  hooks.afterEach(function () {
    setTestId(this, null);
  });
});

class Router extends EmberRouter {
  location = 'none';
  rootURL = '/';
}

class TestApp extends EmberApp {
  modules = {
    './router': { default: Router },
    //...import.meta.glob('./services/**/*.js', { eager: true }),
    // add any custom services here
  };
}

setApplication(
  TestApp.create({
    autoboot: false,
  })
);

void start({
  tryCatch: false,
  debug: true,
  concurrency: 1,
  groupLogs: false,
  instrument: true,
  hideReport: false,
  useDiagnostic: true,
});
