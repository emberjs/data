import { DEBUG } from '@glimmer/env';
import { test, skip } from 'qunit';

export function testInDebug() {
  if (DEBUG) {
    test(...arguments);
  } else {
    skip(...arguments);
  }
}

export default testInDebug;

export function testRecordData() {
  test(...arguments);
}

export function skipRecordData() {
  skip(...arguments);
}
