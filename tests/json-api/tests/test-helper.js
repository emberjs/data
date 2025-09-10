import '@warp-drive/ember/install';

import { setBuildURLConfig } from '@warp-drive/utilities';
import { IS_CI } from '@warp-drive/core/build-config/env';
import { setupGlobalHooks } from '@warp-drive/diagnostic';
import { configure } from '@warp-drive/diagnostic/ember-classic';
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
    setTestId(this, assert.test.testId);
  });
  hooks.afterEach(function () {
    setTestId(this, null);
  });
});

configure();

start({
  org: '@warp-drive/',
  package: 'json-api',
});
