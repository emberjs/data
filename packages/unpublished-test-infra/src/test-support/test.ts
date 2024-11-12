import { type TestContext } from '@ember/test-helpers';

import { DEBUG } from '@warp-drive/build-config/env';
import VERSION, { COMPAT_VERSION } from './version';
import { DeprecationConfig } from './asserts/assert-deprecation';

// small comparison function for major and minor semver values
function gte(EDVersion: string, DeprecationVersion: string): boolean {
  let _edv = EDVersion.split('.');
  let _depv = DeprecationVersion.split('.');
  // compare major
  let major = +_edv[0] >= +_depv[0];
  // compare minor
  let minor = +_edv[1] >= +_depv[1];
  return major || minor;
}

type LimitedAssert = {
  ok: (value: unknown, message?: string) => void;
  expectDeprecation(options: DeprecationConfig, label?: string): void;
  expectDeprecation(
    callback: () => void | Promise<void>,
    options: DeprecationConfig | string | RegExp,
    label?: string
  ): Promise<void>;
};

export function createDeprecatedTestFn<TC extends TestContext, T extends LimitedAssert>(run: {
  skip: (name: string, cb: (this: TC, assert: T) => void | Promise<void>) => void;
  test: (name: string, cb: (this: TC, assert: T) => void | Promise<void>) => void;
}) {
  const { skip, test } = run;
  return function deprecatedTest(
    testName: string,
    deprecation: {
      until: `${number}.${number}`;
      id: string;
      count: number;
      // this test should only run in debug mode
      debugOnly?: boolean;
      // this test should remain in the codebase but
      // should be refactored to no longer use the deprecated feature
      refactor?: boolean;
    },
    testCallback: (this: TC, assert: T) => void | Promise<void>
  ) {
    // '4.0'
    if (typeof deprecation.until !== 'string' || deprecation.until.length < 3) {
      throw new Error(`deprecatedTest expects { until } to be a version.`);
    }
    // 'ds.<some-name>'
    if (typeof deprecation.id !== 'string' || deprecation.id.length < 8) {
      throw new Error(`deprecatedTest expects { id } to be a meaningful string`);
    }

    async function interceptor(this: TC, assert: T) {
      await testCallback.call(this, assert);
      if (DEBUG) {
        // @ts-expect-error test is not typed correctly
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (typeof assert.test.expected === 'number') {
          // @ts-expect-error test is not typed correctly
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
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
  };
}
