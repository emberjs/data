import { setBuildURLConfig } from '@ember-data/request-utils';
import { IS_CI } from '@warp-drive/build-config/env';
import { setupGlobalHooks } from '@warp-drive/diagnostic';
import { configure } from '@warp-drive/diagnostic/ember';
import { start } from '@warp-drive/diagnostic/runners/dom';
import { setConfig, setTestId } from '@warp-drive/holodeck';

const MockHost = `https://${window.location.hostname}:${Number(window.location.port) + 1}`;
setBuildURLConfig({
  host: MockHost,
  namespace: '',
});
setConfig({ host: MockHost });

setupGlobalHooks((hooks) => {
  hooks.beforeEach(function (assert) {
    // @ts-expect-error compatibility with QUnit
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    setTestId(this, assert.test.testId);
  });
  hooks.afterEach(function () {
    setTestId(this, null);
  });
});

configure();

void start({
  tryCatch: false,
  debug: true, // IS_CI ? false : true,
  hideReport: IS_CI ? true : false,
  concurrency: 10,
  groupLogs: false,
  instrument: true,
  useDiagnostic: true,
});
