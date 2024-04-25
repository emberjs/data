import { setBuildURLConfig } from '@ember-data/request-utils';
import { setupGlobalHooks } from '@warp-drive/diagnostic';
import { configure } from '@warp-drive/diagnostic/ember';
import { start } from '@warp-drive/diagnostic/runners/dom';
import { setTestId, setConfig } from '@warp-drive/holodeck';

const MockHost = `https://${window.location.hostname}:${Number(window.location.port) + 1}`;
setBuildURLConfig({
  host: MockHost,
  namespace: '',
});
setConfig({ host: MockHost });

setupGlobalHooks((hooks) => {
  hooks.beforeEach(function (assert) {
    setTestId(this, assert.test.testId);
  });
  hooks.afterEach(function () {
    setTestId(this, null);
  });
});

configure();

start({
  tryCatch: true,
  debug: true,
  concurrency: 10,
  groupLogs: false,
  instrument: true,
  hideReport: false,
  useDiagnostic: true,
});
