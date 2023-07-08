import { skip, test as qunitTest } from 'qunit';

import { DEBUG } from '@ember-data/env';

export function test(label: string, callback: (assert: Assert) => Promise<void>): void {
  if (DEBUG) {
    qunitTest(`[DEBUG-ONLY] ${label}`, callback);
  } else {
    skip(`[DEBUG-ONLY] ${label}`, callback);
  }
}

export default test;
