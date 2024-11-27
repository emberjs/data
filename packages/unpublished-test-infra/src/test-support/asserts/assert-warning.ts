import { registerWarnHandler } from '@ember/debug';

import type Assert from 'ember-data-qunit-asserts';

import { DEBUG } from '@warp-drive/build-config/env';

import { checkMatcher } from './check-matcher';
import isThenable from './utils/is-thenable';

let HAS_REGISTERED = false;
let WARNINGS_FOR_TEST: FoundWarning[];
let HANDLED_WARNINGS_FOR_TEST: FoundWarning[];

export interface WarningConfig {
  id: string;
  count?: number;
  until?: string;
  message?: string | RegExp;
  url?: string;
}
interface FoundWarning {
  message: string;
  options: {
    id: string;
    message?: string;
    until?: string;
    url?: string;
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
  actual: FoundWarning[];
  expected: FoundWarning[];
  message: string;
}

/**
 * Returns a qunit assert result object which passes if the given warning
 * `id` was found *exactly* `count` times.
 *
 * Fails if not found or found more or less than `count`.
 * Fails if `until` not specified
 * Optionally fails if `until` has been passed.
 */
function verifyWarning(config: WarningConfig, label?: string): AssertSomeResult {
  // TODO optionally throw if `until` is the current version or older than current version
  let matchedWarnings = WARNINGS_FOR_TEST.filter((warning) => {
    let isMatched = warning.options.id === config.id;
    if (!isMatched && config.message) {
      // TODO when we hit this we should throw an error in the near future
      isMatched = checkMatcher(warning.message, config.message);
    }
    return isMatched;
  });
  WARNINGS_FOR_TEST = WARNINGS_FOR_TEST.filter((warning) => {
    !matchedWarnings.includes(warning);
  });
  HANDLED_WARNINGS_FOR_TEST.push(...matchedWarnings);

  let expectedCount = typeof config.count === 'number' ? config.count : 1;
  let passed = matchedWarnings.length === expectedCount;

  return {
    result: passed,
    actual: { id: config.id, count: matchedWarnings.length },
    expected: { id: config.id, count: expectedCount },
    message:
      label ||
      `Expected ${expectedCount} warning${expectedCount === 1 ? '' : 's'} for ${config.id} during test, ${
        passed ? expectedCount : 'but ' + matchedWarnings.length
      } warnings were found.`,
  };
}

function verifyNoWarning(label?: string): AssertNoneResult {
  const UNHANDLED_WARNINGS = WARNINGS_FOR_TEST;
  WARNINGS_FOR_TEST = [];

  let warningStr = UNHANDLED_WARNINGS.reduce((a, b) => {
    return `${a}${b.message}\n`;
  }, '');

  let passed = UNHANDLED_WARNINGS.length === 0;

  return {
    result: passed,
    actual: UNHANDLED_WARNINGS,
    expected: [],
    message:
      label ||
      `Expected 0 warnings during test, ${
        passed ? '0' : 'but ' + UNHANDLED_WARNINGS.length
      } warnings were found.\n${warningStr}`,
  };
}

export function configureWarningHandler(assert: Assert) {
  if (HAS_REGISTERED !== true) {
    registerWarnHandler(function (message, options /*, next*/) {
      if (WARNINGS_FOR_TEST && options) {
        WARNINGS_FOR_TEST.push({ message, options });
      }
      // we do not call next to avoid spamming the console
    });
    HAS_REGISTERED = true;
  }

  WARNINGS_FOR_TEST = [];
  HANDLED_WARNINGS_FOR_TEST = [];

  assert.expectWarning = expectWarning;
  assert.expectNoWarning = expectNoWarning;
}

async function expectWarning(
  this: Assert,
  cb: () => unknown,
  config: string | RegExp | WarningConfig,
  label?: string
): Promise<void> {
  let origWarnings = WARNINGS_FOR_TEST;
  let callback: (() => unknown) | null = null;

  if (typeof cb !== 'function') {
    config = cb;
    callback = null;
  } else {
    callback = cb;
  }

  if (typeof config === 'string' || config instanceof RegExp) {
    config = {
      id: 'unknown-data-warning',
      count: 1,
      message: config,
      until: '4.0',
    };
  }

  if (callback) {
    WARNINGS_FOR_TEST = [];
    let result = callback();
    if (isThenable(result)) {
      await result;
    }
  }

  let result = verifyWarning(config, label);

  if (!DEBUG) {
    result = {
      result: true,
      actual: { id: config.id, count: 0 },
      expected: { id: config.id, count: 0 },
      message: `Warnings do not trigger in production environments`,
    };
  }

  this.pushResult(result);
  WARNINGS_FOR_TEST = origWarnings.concat(WARNINGS_FOR_TEST);
}

async function expectNoWarning(this: Assert, cb: () => void | Promise<void>, label?: string) {
  let origWarnings = WARNINGS_FOR_TEST;

  if (cb) {
    WARNINGS_FOR_TEST = [];
    let result = cb();
    if (isThenable(result)) {
      await result;
    }
  }

  let result = verifyNoWarning(label);

  if (!DEBUG) {
    result = {
      result: true,
      actual: [],
      expected: [],
      message: `Warnings do not trigger in production environments`,
    };
  }

  this.pushResult(result);
  WARNINGS_FOR_TEST = origWarnings.concat(WARNINGS_FOR_TEST);
}
