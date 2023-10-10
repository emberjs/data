import { configure, setupGlobalHooks } from '@warp-drive/diagnostic';
import { start } from '@warp-drive/diagnostic/runners/dom';
import { setTestId } from '@warp-drive/holodeck';

import AbstractTestLoader from 'ember-cli-test-loader/test-support/index';

import configureAsserts from '@ember-data/unpublished-test-infra/test-support/asserts';

let moduleLoadFailures = [];

setupGlobalHooks((hooks) => {
  configureAsserts(hooks);

  hooks.beforeEach(function (assert) {
    setTestId(this, assert.test.testId);
  });
  hooks.afterEach(function () {
    setTestId(this, null);
  });

  hooks.onSuiteFinish(() => {
    let length = moduleLoadFailures.length;

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

export class TestLoader extends AbstractTestLoader {
  moduleLoadFailure(moduleName, error) {
    moduleLoadFailures.push(error);
  }
}

/**
   Load tests following the default patterns:

   * The module name ends with `-test`
   * The module name ends with `.jshint`

   @method loadTests
 */
export function loadTests() {
  new TestLoader().loadModules();
}

loadTests();

configure({
  tryCatch: false,
  debug: false,
  concurrency: 10,
  groupLogs: false,
  instrument: true,
  hideReport: true,
});

start();
