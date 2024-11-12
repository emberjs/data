import type Assert from 'ember-data-qunit-asserts';

import { DEBUG } from '@warp-drive/build-config/env';

import { checkMatcher } from './check-matcher';
import isThenable from './utils/is-thenable';

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

export function configureAssertionHandler(assert: Assert) {
  assert.expectAssertion = expectAssertion;
  assert.expectNoAssertion = expectNoAssertion;
}

async function expectAssertion(
  this: Assert,
  cb: () => unknown,
  matcher: string | RegExp,
  label?: string
): Promise<void> {
  let outcome: { result: boolean; actual: string; expected: string; message: string };

  try {
    let result = cb();
    if (isThenable(result)) {
      await result;
    }
    outcome = verifyAssertion('', matcher, label);
  } catch (e) {
    outcome = verifyAssertion(e instanceof Error ? e.message : (e as string), matcher, label);
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
}

async function expectNoAssertion(this: Assert, cb: () => unknown, label?: string) {
  let outcome: { result: boolean; actual: string; expected: string; message: string };
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
}
