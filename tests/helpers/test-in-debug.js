import { DEBUG } from '@glimmer/env';
import { test, skip } from 'qunit';
import config from 'dummy/config/environment';

const IS_RECORD_DATA = config.emberData.enableRecordDataRFCBuild;

export function testInDebug() {
  if (DEBUG) {
    test(...arguments);
  } else {
    skip(...arguments);
  }
}

export default testInDebug;

export function testRecordData() {
  if (IS_RECORD_DATA) {
    test(...arguments);
  } else {
    skip(...arguments);
  }
}

export function skipRecordData() {
  if (IS_RECORD_DATA) {
    skip(...arguments);
  } else {
    test(...arguments);
  }
}
