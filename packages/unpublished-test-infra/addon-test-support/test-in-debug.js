import { skip, test } from 'qunit';

import { DEBUG } from '@ember-data/env';

export default function testInDebug(label, callback) {
  if (DEBUG) {
    test(`[DEBUG-ONLY] ${label}`, callback);
  } else {
    skip(`[DEBUG-ONLY] ${label}`, callback);
  }
}
