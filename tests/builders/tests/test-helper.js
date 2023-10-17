import { setApplication } from '@ember/test-helpers';

import { setupGlobalHooks } from '@warp-drive/diagnostic';
import { start } from '@warp-drive/diagnostic/runners/dom';

import AbstractTestLoader from 'ember-cli-test-loader/test-support/index';

import Application from '../app';
import config from '../config/environment';

let moduleLoadFailures = [];

setupGlobalHooks((hooks) => {
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

setApplication(Application.create(config.APP));
start({
  tryCatch: false,
  debug: false,
  groupLogs: false,
  instrument: true,
  hideReport: true,
  useDiagnostic: true,
});
