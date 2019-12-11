import { registerDeprecationHandler } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import QUnit from 'qunit';

import { checkMatcher } from './check-matcher';
import isThenable from './utils/is-thenable';

let HAS_REGISTERED = false;
let DEPRECATIONS_FOR_TEST: FoundDeprecation[];
let HANDLED_DEPRECATIONS_FOR_TEST: FoundDeprecation[];

interface DeprecationConfig {
  id: string;
  count?: number;
  until: string;
  message?: string | RegExp;
  url?: string;
  stacktrace?: string;
}
interface FoundDeprecation {
  message: string;
  options: {
    id: string;
    message?: string | RegExp;
    until: string;
    url?: string;
    stacktrace?: string;
  };
}

interface AssertSomeResult {
  result: boolean;
  actual: { id: string; count: number };
  expected: { id: string; count: number };
  message: string;
}
interface AssertNoneResult {
  result: boolean;
  actual: FoundDeprecation[];
  expected: FoundDeprecation[];
  message: string;
}

Error.stackTraceLimit = 50;

/**
 * Returns a qunit assert result object which passes if the given deprecation
 * `id` was found *exactly* `count` times.
 *
 * Fails if not found or found more or less than `count`.
 * Fails if `until` not specified
 * Optionally fails if `until` has been passed.
 */
function verifyDeprecation(config: DeprecationConfig, label?: string): AssertSomeResult {
  // TODO optionally throw if `until` is the current version or older than current version
  let matchedDeprecations = DEPRECATIONS_FOR_TEST.filter(deprecation => {
    let isMatched = deprecation.options.id === config.id;
    if (!isMatched && config.message) {
      // TODO when we hit this we should throw an error in the near future
      isMatched = checkMatcher(deprecation.message, config.message);
    }
    return isMatched;
  });
  DEPRECATIONS_FOR_TEST = DEPRECATIONS_FOR_TEST.filter(deprecation => {
    return matchedDeprecations.indexOf(deprecation) === -1;
  });
  HANDLED_DEPRECATIONS_FOR_TEST.push(...matchedDeprecations);

  let expectedCount = typeof config.count === 'number' ? config.count : 1;
  let passed = matchedDeprecations.length === expectedCount;

  return {
    result: passed,
    actual: { id: config.id, count: matchedDeprecations.length },
    expected: { id: config.id, count: expectedCount },
    message:
      label ||
      `Expected ${expectedCount} deprecation${expectedCount === 1 ? '' : 's'} for ${config.id} during test, ${
        passed ? expectedCount : 'but ' + matchedDeprecations.length
      } deprecations were found.`,
  };
}

function verifyNoDeprecation(filter?: (deprecation: FoundDeprecation) => boolean, label?: string): AssertNoneResult {
  let UNHANDLED_DEPRECATIONS;

  if (filter) {
    UNHANDLED_DEPRECATIONS = DEPRECATIONS_FOR_TEST.filter(filter);
    DEPRECATIONS_FOR_TEST = DEPRECATIONS_FOR_TEST.filter(deprecation => {
      return UNHANDLED_DEPRECATIONS.indexOf(deprecation) === -1;
    });
  } else {
    UNHANDLED_DEPRECATIONS = DEPRECATIONS_FOR_TEST;
    DEPRECATIONS_FOR_TEST = [];
  }

  let deprecationStr = UNHANDLED_DEPRECATIONS.reduce((a, b) => {
    return `${a}${b.message}\n`;
  }, '');

  let passed = UNHANDLED_DEPRECATIONS.length === 0;

  return {
    result: passed,
    actual: UNHANDLED_DEPRECATIONS,
    expected: [],
    message:
      label ||
      `Expected 0 deprecations during test, ${
        passed ? '0' : 'but ' + UNHANDLED_DEPRECATIONS.length
      } deprecations were found.\n${deprecationStr}`,
  };
}

export function configureDeprecationHandler() {
  if (HAS_REGISTERED === true) {
    throw new Error(`Attempting to re-register the assert-deprecation handler`);
  }
  HAS_REGISTERED = true;

  QUnit.testStart(function() {
    DEPRECATIONS_FOR_TEST = [];
    HANDLED_DEPRECATIONS_FOR_TEST = [];
  });

  registerDeprecationHandler(function(message, options: DeprecationConfig /*, next*/) {
    options.stacktrace = new Error().stack;
    if (DEPRECATIONS_FOR_TEST) {
      DEPRECATIONS_FOR_TEST.push({ message, options });
    }
    // we do not call next to avoid spamming the console
  });

  QUnit.assert.expectDeprecation = async function(
    cb: () => unknown,
    config: string | RegExp | DeprecationConfig,
    label?: string
  ): Promise<void> {
    let origDeprecations = DEPRECATIONS_FOR_TEST;
    let callback: (() => unknown) | null = null;

    if (typeof cb !== 'function') {
      config = cb;
      callback = null;
    } else {
      callback = cb;
    }

    if (typeof config === 'string' || config instanceof RegExp) {
      config = {
        id: 'unknown-data-deprecation',
        count: 1,
        message: config,
        until: '4.0',
      };
    }

    if (callback) {
      DEPRECATIONS_FOR_TEST = [];
      let result = callback();
      if (isThenable(result)) {
        await result;
      }
    }

    let result = verifyDeprecation(config, label);

    if (!DEBUG) {
      result = {
        result: true,
        actual: { id: config.id, count: 0 },
        expected: { id: config.id, count: 0 },
        message: `Deprecations do not trigger in production environments`,
      };
    }

    this.pushResult(result);
    if (callback) {
      DEPRECATIONS_FOR_TEST = origDeprecations.concat(DEPRECATIONS_FOR_TEST);
    }
  };
  QUnit.assert.expectNoDeprecation = async function(
    cb?: () => unknown,
    label?: string,
    filter?: (deprecation: FoundDeprecation) => boolean
  ) {
    let origDeprecations = DEPRECATIONS_FOR_TEST;

    if (cb) {
      DEPRECATIONS_FOR_TEST = [];
      let result = cb();
      if (isThenable(result)) {
        await result;
      }
    }

    let result = verifyNoDeprecation(filter, label);

    if (!DEBUG) {
      result = {
        result: true,
        actual: [],
        expected: [],
        message: `Deprecations do not trigger in production environments`,
      };
    }

    this.pushResult(result);
    DEPRECATIONS_FOR_TEST = origDeprecations.concat(DEPRECATIONS_FOR_TEST);
  };
}
