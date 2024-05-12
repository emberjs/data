import { type TestContext } from '@ember/test-helpers';

import { skip, test as qunitTest } from 'qunit';

import { DEBUG } from '@warp-drive/build-config/env';

export function test(label: string, callback: (this: TestContext, assert: Assert) => void | Promise<void>): void {
  if (DEBUG) {
    qunitTest(`[DEBUG-ONLY] ${label}`, callback);
  } else {
    skip(`[DEBUG-ONLY] ${label}`, callback);
  }
}

export default test;
