import { DEBUG } from '@glimmer/env';
import { test, skip } from 'qunit';

export default function testInDebug() {
  if (DEBUG) {
    test(...arguments);
  } else {
    skip(...arguments);
  }
}
