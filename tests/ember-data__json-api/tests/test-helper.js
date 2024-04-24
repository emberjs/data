import { setupGlobalHooks } from '@warp-drive/diagnostic';
import { configure } from '@warp-drive/diagnostic/ember';
import { start } from '@warp-drive/diagnostic/runners/dom';
import { setTestId } from '@warp-drive/holodeck';

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
  groupLogs: false,
  instrument: true,
  hideReport: false,
  useDiagnostic: true,
});
