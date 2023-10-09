// eslint-disable-next-line no-restricted-imports
import { _backburner } from '@ember/runloop';
import { getSettledState, isSettled, registerHook, setApplication } from '@ember/test-helpers';
import { getPendingWaiterState } from '@ember/test-waiters';

import { setTestId } from '@warp-drive/holodeck';
import * as QUnit from 'qunit';
import { setup } from 'qunit-dom';

import start from 'ember-exam/test-support/start';

import configureAsserts from '@ember-data/unpublished-test-infra/test-support/asserts';

import Application from '../app';
import config from '../config/environment';

QUnit.config.urlConfig.push(
  {
    id: 'debugMemory',
    label: 'Enable Memory Debugging',
    tooltip: 'Add instrumentation to capture memory stats after every test, reported to the DOT Reporter.',
  },
  {
    id: 'disableHtmlReporter',
    label: 'Disable HTML Reporter for Headless CI',
    tooltip:
      'Disable HTML Reporter output for individual test results, helps with large test suites and to help isolate leaks.',
  },
  { id: 'debugSettled', label: 'Enable Settled State Debugging' },
  { id: 'debugPerformance', label: 'Enable Performance Instrumentation' },
  { id: 'debugPermissions', label: 'Permission Check Logging' },
  { id: 'debugBackburner', label: 'Enable Backburner debugging' },
  { id: 'enableA11yAudit', label: 'Enable A11y Audit' }
);

if (window.location.search.includes('debugBackburner')) {
  _backburner.DEBUG = true;
}

const { SHOW_SPANS, DEBUG_SETTLED_STATE, DEBUG_MEMORY, GC_BREATHE_TIME, DELAY_TEST_START } = window;

// useful for debugging test performance with the profiler
// activate and record a performance profile
if (SHOW_SPANS) {
  let SPAN = 0;
  [
    'select',
    'render',
    'rerender',
    'typeIn',
    'findAll',
    'click',
    'focus',
    'fillIn',
    'blur',
    'waitFor',
    'waitUntil',
    'scrollTo',
    'settled',
    'visit',
  ].forEach((helper) => {
    let spanId;
    registerHook(helper, 'start', function () {
      spanId = SPAN++;
      performance.mark(`${helper}-${spanId}-start`);
    });
    registerHook(helper, 'end', function () {
      performance.mark(`${helper}-${spanId}-end`);
      performance.measure(`${helper}-${spanId}`, `${helper}-${spanId}-start`, `${helper}-${spanId}-end`);
    });
  });
}

// useful for log-points in the debugger for `waitUntil`'s
// scheduleCheck etc. to determine why churning during a test
//
// Also useful for checking what's going on when the test-isolation check fails
Object.assign(window, {
  getBackburnerInfo: () => {
    return {
      autoRun: _backburner._autorun,
      timersCount: _backburner._timers?.length || 0,
      timers: _backburner._timers?.slice() || [],
    };
  },
  getSettledState,
  getPendingWaiterState,
});

function setupMemoryTracking() {
  // this is set above
  // and works together with testem code in tests/index.html
  // and our custom DOT Reporter
  // you should also set DEBUG_MEMORY=true in your env
  // to get granular memory data
  if (DEBUG_MEMORY) {
    if (DELAY_TEST_START) {
      QUnit.begin(async function () {
        await new Promise((resolve) => {
          // give the GC time to breathe before the very first test
          // to recover from initial boot
          // also gives user a chance to manually GC before an initial heap snapshot
          setTimeout(resolve, 8_000);
        });
      });
    }

    QUnit.hooks.afterEach(async function (assert) {
      if (DEBUG_SETTLED_STATE) {
        if (!isSettled()) {
          assert.ok(false, `Expected test to be settled after teardown`);
        }
        await new Promise((resolve) => {
          setTimeout(resolve, 10); // try to catch anything still in flight
        });
        if (!isSettled()) {
          assert.ok(false, `Expected test to be settled after teardown`);
        }
      }
      // if the gc is exposed, use it
      if (typeof gc !== 'undefined') {
        // eslint-disable-next-line no-undef
        gc();
      }

      // we give more breathing time if the queue is done
      // so that our final number has as much time to have GC'd as possible.
      //  note this wait time will not count towards the testTimeout;
      //  however, it will count towards the runDuration.
      // Ideally we would wait longer for the very last test
      // however, when load balancing the queue is drained often.
      const WaitTime = GC_BREATHE_TIME;
      if (WaitTime) {
        await new Promise((resolve) => {
          setTimeout(resolve, WaitTime); // give lots of breathing room for GC;
        });
      }

      // so we use this "deprecated" api instead of the one that might not be available below
      const { jsHeapSizeLimit, totalJSHeapSize, usedJSHeapSize } = performance.memory;
      const data = { jsHeapSizeLimit, totalJSHeapSize, usedJSHeapSize };
      // chrome claims this is available but it is not available, even for https
      if (performance.measureUserAgentSpecificMemory) {
        data.granular = await performance.measureUserAgentSpecificMemory();
      }
      window.MEMORY_DATA[assert.test.testId] = data;
    });
  } else if (DEBUG_SETTLED_STATE) {
    QUnit.hooks.afterEach(async function (assert) {
      if (!isSettled()) {
        assert.ok(false, `Expected test to be settled after teardown`);
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 10); // try to catch anything still in flight
      });
      if (!isSettled()) {
        assert.ok(false, `Expected test to be settled after teardown`);
      }
    });
  }
}

// memory tracking needs to be the very first hook setup
// so that it runs last. This also ensures we catch things
// that don't use our custom test helpers.
setupMemoryTracking();
configureAsserts(QUnit.hooks);

QUnit.config.testTimeout = 2000;
QUnit.dump.maxDepth = 6;

QUnit.hooks.beforeEach(function (assert) {
  setTestId(assert.test.testId);
});
QUnit.hooks.afterEach(function (assert) {
  setTestId(null);
});

setup(QUnit.assert);
setApplication(Application.create(config.APP));
start({ setupEmberOnerrorValidation: false, setupTestIsolationValidation: true });
