import { type TestContext } from '@ember/test-helpers';

import { skip, test as qunitTest } from 'qunit';

import { DEBUG } from '@ember-data/env';

export function productionTest(
  label: string,
  callback: (this: TestContext, assert: Assert) => void | Promise<void>
): void {
  if (DEBUG) {
    skip(`[PROD-ONLY] ${label}`, callback);
  } else {
    qunitTest(`[PROD-ONLY] ${label}`, callback);
  }
}
