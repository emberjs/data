import { DEBUG } from '@glimmer/env';

import { skip, test } from 'qunit';

export default function testInDebug(label, callback) {
  if (DEBUG) {
    test(`[DEBUG-ONLY] ${label}`, callback);
  } else {
    skip(`[DEBUG-ONLY] ${label}`, callback);
  }
}
