import { registerDeprecationHandler } from '@ember/debug';
import { VERSION } from '@ember/version';

import semver from 'semver';

import type Assert from 'ember-data-qunit-asserts';

import { DEBUG } from '@ember-data/env';

import { checkMatcher } from './check-matcher';
import isThenable from './utils/is-thenable';

function gte(version: string): boolean {
  return semver.satisfies(semver.coerce(VERSION) as unknown as string, version);
}

function lte(version: string): boolean {
  return semver.satisfies(semver.coerce(VERSION) as unknown as string, version);
}

let HAS_REGISTERED = false;
let DEPRECATIONS_FOR_TEST: FoundDeprecation[];
let HANDLED_DEPRECATIONS_FOR_TEST: FoundDeprecation[];

export interface DeprecationConfig {
  id: string;
  count?: number;
  until: string;
  message?: string | RegExp;
  url?: string;
  stacktrace?: string;
  when?: Record<string, string>;
}
export interface FoundDeprecation {
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

// Case is necessary outside of node types, which we sometimes resolve
// global times apparently missing this property.
(Error as unknown as { stackTraceLimit: number }).stackTraceLimit = 50;

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
  let matchedDeprecations = DEPRECATIONS_FOR_TEST.filter((deprecation) => {
    let isMatched = deprecation.options.id === config.id;
    if (!isMatched && config.message) {
      // TODO when we hit this we should throw an error in the near future
      isMatched = checkMatcher(deprecation.message, config.message);
    }
    return isMatched;
  });
  DEPRECATIONS_FOR_TEST = DEPRECATIONS_FOR_TEST.filter((deprecation) => {
    return !matchedDeprecations.includes(deprecation);
  });
  HANDLED_DEPRECATIONS_FOR_TEST.push(...matchedDeprecations);

  const expectedCount: number | 'ALL' = typeof config.count === 'number' || config.count === 'ALL' ? config.count : 1;
  //@ts-expect-error TS having trouble realizing expectedCount can be 'ALL'
  let passed = expectedCount === 'ALL' ? true : matchedDeprecations.length === expectedCount;

  return {
    result: passed,
    actual: { id: config.id, count: matchedDeprecations.length },
    //@ts-expect-error TS having trouble realizing expectedCount can be 'ALL'
    expected: { id: config.id, count: expectedCount === 'ALL' ? matchedDeprecations.length : expectedCount },
    message:
      label ||
      `Expected ${expectedCount} deprecation${expectedCount === 1 ? '' : 's'} for ${config.id} during test, ${
        passed ? expectedCount : 'but ' + matchedDeprecations.length
      } deprecations were found.`,
  };
}

function verifyNoDeprecation(filter?: (deprecation: FoundDeprecation) => boolean, label?: string): AssertNoneResult {
  let UNHANDLED_DEPRECATIONS: FoundDeprecation[] = [];

  if (filter) {
    UNHANDLED_DEPRECATIONS = DEPRECATIONS_FOR_TEST.filter(filter);
    DEPRECATIONS_FOR_TEST = DEPRECATIONS_FOR_TEST.filter((deprecation) => {
      return !UNHANDLED_DEPRECATIONS.includes(deprecation);
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

export function configureDeprecationHandler(assert: Assert) {
  if (!HAS_REGISTERED) {
    registerDeprecationHandler(function (message, options /*, next*/) {
      if (DEPRECATIONS_FOR_TEST && options) {
        DEPRECATIONS_FOR_TEST.push({
          message,
          options: {
            id: options.id,
            stacktrace: new Error().stack,
            until: options.until,
            url: options.url,
          },
        });
      }
      // we do not call next to avoid spamming the console
    });
    HAS_REGISTERED = true;
  }

  DEPRECATIONS_FOR_TEST = [];
  HANDLED_DEPRECATIONS_FOR_TEST = [];

  assert.expectDeprecation = expectDeprecation;
  assert.expectNoDeprecation = expectNoDeprecation;
}

async function expectDeprecation(
  this: Assert,
  cb: DeprecationConfig | (() => void | Promise<void>),
  config?: string | RegExp | DeprecationConfig,
  label?: string
): Promise<void> {
  let origDeprecations = DEPRECATIONS_FOR_TEST;
  let callback: (() => unknown) | null = null;

  if (typeof cb !== 'function') {
    label = config as string;
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

  if (typeof config !== 'object' || !config) {
    throw new Error(`Expected a deprecation config object, got ${config}`);
  }

  let skipAssert = true;
  if (DEBUG) {
    skipAssert = false;
    if (!skipAssert && config.when) {
      let libs = Object.keys(config.when);
      for (let i = 0; i < libs.length; i++) {
        let library = libs[i];
        let version = config.when[library]!;

        if (library !== 'ember') {
          throw new Error(`when only supports setting a version for 'ember' currently.`);
        }

        if (version.indexOf('<=') === 0) {
          if (!lte(version)) {
            skipAssert = true;
          }
        } else if (version.indexOf('>=') === 0) {
          if (!gte(version)) {
            skipAssert = true;
          }
        } else {
          throw new Error(
            `Expected a version range set to either >= or <= for the library ${library} when the deprecation ${config.id} is present, found ${version}.`
          );
        }
      }
    }
  }

  if (callback) {
    DEPRECATIONS_FOR_TEST = [];
    await callback();
  }

  let result: AssertSomeResult;
  if (skipAssert) {
    result = {
      result: true,
      actual: { id: config.id, count: 0 },
      expected: { id: config.id, count: 0 },
      message: `Deprecations do not trigger in production environments`,
    };
  } else {
    result = verifyDeprecation(config, label);
  }

  this.pushResult(result);
  if (callback) {
    DEPRECATIONS_FOR_TEST = origDeprecations.concat(DEPRECATIONS_FOR_TEST);
  }
}

async function expectNoDeprecation(
  this: Assert,
  cb?: () => void | Promise<void>,
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
}
