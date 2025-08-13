import '@warp-drive/react/install';

import { SHOULD_RECORD } from '@warp-drive/core/build-config/env';
import { setupGlobalHooks } from '@warp-drive/diagnostic';
import { start } from '@warp-drive/diagnostic/runners/dom';
import { setConfig, setIsRecording, setTestId } from '@warp-drive/holodeck';
import { setBuildURLConfig } from '@warp-drive/utilities';

import.meta.glob('./integration/**/*-test.tsx', { eager: true });

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
  hooks.beforeEach(function (assert) {
    setTestId(this, (assert as unknown as { test: { testId: string } }).test.testId);
  });
  hooks.afterEach(function () {
    setTestId(this, null);
  });
});

void start({
  useDiagnostic: true,
});
