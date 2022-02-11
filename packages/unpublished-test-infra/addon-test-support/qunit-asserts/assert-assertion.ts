import { DEBUG } from '@glimmer/env';

import QUnit from 'qunit';

import type Assert from 'ember-data-qunit-asserts';

import { checkMatcher } from './check-matcher';
import isThenable from './utils/is-thenable';

let HAS_REGISTERED = false;

interface AssertSomeResult {
  result: boolean;
  actual: string;
  expected: string;
  message: string;
}
interface AssertNoneResult {
  result: boolean;
  actual: string;
  expected: '';
  message: string;
}

function verifyAssertion(message: string, matcher: string | RegExp, label?: string): AssertSomeResult {
  let passed = checkMatcher(message, matcher);

  return {
    result: passed,
    actual: message,
    expected: String(matcher),
    message: label || `Expected an assertion during the test`,
  };
}

function verifyNoAssertion(message: string | undefined, label?: string): AssertNoneResult {
  let passed = !message;
  return {
    result: passed,
    actual: message || '',
    expected: '',
    message: label || `Expected no assertions during test`,
  };
}

export function configureAssertionHandler() {
  if (HAS_REGISTERED === true) {
    throw new Error(`Attempting to re-register the assert-assertion handler`);
  }
  HAS_REGISTERED = true;
  const assert: Assert = QUnit.assert;

  assert.expectAssertion = async function (cb: () => unknown, matcher: string | RegExp, label?: string): Promise<void> {
    let outcome;

    try {
      let result = cb();
      if (isThenable(result)) {
        await result;
      }
      outcome = verifyAssertion('', matcher, label);
    } catch (e) {
      outcome = verifyAssertion((e as Error).message, matcher, label);
    }

    if (!DEBUG) {
      outcome = {
        result: true,
        actual: '',
        expected: '',
        message: `Assertions do not run in production environments`,
      };
    }

    this.pushResult(outcome);
  };

  assert.expectNoAssertion = async function (cb: () => unknown, label?: string) {
    let outcome;
    try {
      let result = cb();
      if (isThenable(result)) {
        await result;
      }
      outcome = verifyNoAssertion('', label);
    } catch (e) {
      outcome = verifyNoAssertion((e as Error).message, label);
    }

    if (!DEBUG) {
      outcome = {
        result: true,
        actual: '',
        expected: '',
        message: `Assertions do not run in production environments`,
      };
    }

    this.pushResult(outcome);
  };
}
