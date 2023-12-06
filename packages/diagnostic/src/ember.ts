import type { SetupContextOptions, TestContext } from '@ember/test-helpers';
import { getTestMetadata, setupContext, teardownContext } from '@ember/test-helpers';

import AbstractTestLoader from 'ember-cli-test-loader/test-support/index';

import type { Hooks } from './-types';
import { setupGlobalHooks } from './internals/config';

// fix bug with embroider/webpack/auto-import and test-loader
// prettier-ignore
// @ts-expect-error
const CLITestLoader: typeof AbstractTestLoader = AbstractTestLoader.default
  // @ts-expect-error
  ? AbstractTestLoader.default as typeof AbstractTestLoader
  : AbstractTestLoader;

export function setupTest(hooks: Hooks<TestContext>, opts?: SetupContextOptions) {
  const options = { waitForSettled: false, ...opts };

  hooks.beforeEach(async function () {
    const testMetadata = getTestMetadata(this);
    testMetadata.framework = 'qunit';

    await setupContext(this, options);
  });

  hooks.afterEach(function (this: TestContext) {
    return teardownContext(this, options);
  });
}

let moduleLoadFailures: Error[] = [];

class TestLoader extends CLITestLoader {
  moduleLoadFailure(moduleName: string, error: Error) {
    moduleLoadFailures.push(error);
  }
}

/**
   Load tests following the default patterns:

   * The module name ends with `-test`
   * The module name ends with `.jshint`

   @method loadTests
 */
function loadTests() {
  TestLoader.load();
}

export function configure() {
  setupGlobalHooks((hooks) => {
    hooks.onSuiteFinish(() => {
      const length = moduleLoadFailures.length;

      try {
        if (length === 0) {
          // do nothing
        } else if (length === 1) {
          throw moduleLoadFailures[0];
        } else {
          throw new Error('\n' + moduleLoadFailures.join('\n'));
        }
      } finally {
        // ensure we release previously captured errors.
        moduleLoadFailures = [];
      }
    });
  });

  loadTests();
}
