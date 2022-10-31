import { DEBUG } from '@glimmer/env';

import { skip, test } from 'qunit';

import VERSION, { COMPAT_VERSION } from '@ember-data/unpublished-test-infra/test-support/version';

// small comparison function for major and minor semver values
function gte(EDVersion, DeprecationVersion) {
  let _edv = EDVersion.split('.');
  let _depv = DeprecationVersion.split('.');
  // compare major
  let major = +_edv[0] >= +_depv[0];
  // compare minor
  let minor = +_edv[1] >= +_depv[1];
  return major || minor;
}

export function deprecatedTest(testName, deprecation, testCallback) {
  // '4.0'
  if (typeof deprecation.until !== 'string' || deprecation.until.length < 3) {
    throw new Error(`deprecatedTest expects { until } to be a version.`);
  }
  // 'ds.<some-name>'
  if (typeof deprecation.id !== 'string' || deprecation.id.length < 8) {
    throw new Error(`deprecatedTest expects { id } to be a meaningful string`);
  }

  async function interceptor(assert) {
    await testCallback.call(this, assert);
    if (DEBUG) {
      if (typeof assert.test.expected === 'number') {
        assert.test.expected += 1;
      }
      assert.expectDeprecation(deprecation);
    }
  }

  let testFn = test;
  if (COMPAT_VERSION && gte(COMPAT_VERSION, VERSION)) {
    testFn = skip;
  }
  if (!DEBUG) {
    if (deprecation.debugOnly) {
      testFn = skip;
    }
  }

  if (gte(VERSION, deprecation.until)) {
    testFn(`DEPRECATION ${deprecation.id} until ${deprecation.until} | ${testName}`, interceptor);
  } else {
    testFn(`DEPRECATION ${deprecation.id} until ${deprecation.until} | ${testName}`, function (assert) {
      if (deprecation.refactor === true) {
        assert.ok(false, 'This test includes use of a deprecated feature that should now be refactored.');
      } else {
        assert.ok(false, 'This test is for a deprecated feature whose time has come and should be removed');
      }
    });
  }
}
