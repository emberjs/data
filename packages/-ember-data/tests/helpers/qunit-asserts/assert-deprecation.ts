import QUnit from 'qunit';
import { registerDeprecationHandler } from '@ember/debug';
import { checkMatcher } from './check-matcher';
import RSVP from 'rsvp';

let HAS_REGISTERED = false;
let DEPRECATIONS_FOR_TEST: FoundDeprecation[];
let HANDLED_DEPRECATIONS_FOR_TEST: FoundDeprecation[];

interface DeprecationConfig {
  id: string;
  count?: number;
  until: string;
  message?: string | RegExp;
  url?: string;
}
interface FoundDeprecation {
  message: string;
  options: {
    id: string;
    message?: string;
    until: string;
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
  actual: FoundDeprecation[];
  expected: FoundDeprecation[];
  message: string;
}

/**
 * Returns a qunit assert result object which passes if the given deprecation
 * `id` was found *exactly* `count` times.
 *
 * Fails if not found or found more or less than `count`.
 * Fails if `until` not specified
 * Optionally fails if `until` has been passed.
 */
function expectDeprecation(config: DeprecationConfig): AssertSomeResult {
  // TODO optionally throw if `until` is the current version or older than current version
  let matchedDeprecations = DEPRECATIONS_FOR_TEST.filter(deprecation => {
    if (!deprecation.options || !deprecation.options.id) {
      throw new Error(`Expected deprecation to have an id, found: ${deprecation}`);
    }
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

  let expectedCount = typeof config.count === 'number' && config.count !== 0 ? config.count : 1;
  let passed = matchedDeprecations.length === expectedCount;

  return {
    result: passed,
    actual: { id: config.id, count: matchedDeprecations.length },
    expected: { id: config.id, count: expectedCount },
    message: `Expected ${expectedCount} deprecation${expectedCount === 1 ? '' : 's'} for ${config.id} during test, ${
      passed ? expectedCount : 'but ' + matchedDeprecations.length
    } deprecations were found.`,
  };
}

function expectNoDeprecation(filter?: (deprecation: FoundDeprecation) => boolean): AssertNoneResult {
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
    message: `Expected 0 deprecations during test, ${
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

  registerDeprecationHandler(function(message, options /*, next*/) {
    if (DEPRECATIONS_FOR_TEST) {
      DEPRECATIONS_FOR_TEST.push({ message, options });
    }
    // we do not call next to avoid spamming the console
  });

  QUnit.assert.expectDeprecation = async function(
    cb: () => unknown,
    config: string | RegExp | DeprecationConfig
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
      if (result instanceof Promise || result instanceof RSVP.Promise) {
        await result;
      }
    }

    let result = expectDeprecation(config);
    this.pushResult(result);
    DEPRECATIONS_FOR_TEST = origDeprecations.concat(DEPRECATIONS_FOR_TEST);
  };

  QUnit.assert.expectNoDeprecation = async function(cb) {
    let origDeprecations = DEPRECATIONS_FOR_TEST;

    if (cb) {
      DEPRECATIONS_FOR_TEST = [];
      let result = cb();
      if (result instanceof Promise || result instanceof RSVP.Promise) {
        await result;
      }
    }

    let result = expectNoDeprecation();
    this.pushResult(result);
    DEPRECATIONS_FOR_TEST = origDeprecations.concat(DEPRECATIONS_FOR_TEST);
  };
}
