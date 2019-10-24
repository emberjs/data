import QUnit from 'qunit';
import { checkMatcher } from './check-matcher';
import { DEBUG } from '@glimmer/env';
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

function verifyAssertion(message: string, matcher: string | RegExp): AssertSomeResult {
  let passed = checkMatcher(message, matcher);

  return {
    result: passed,
    actual: message,
    expected: String(matcher),
    message: `Expected an assertion during the test`,
  };
}

function verifyNoAssertion(message: string | undefined): AssertNoneResult {
  let passed = !message;
  return {
    result: passed,
    actual: message || '',
    expected: '',
    message: `Expected no assertions during test`,
  };
}

export function configureAssertionHandler() {
  if (HAS_REGISTERED === true) {
    throw new Error(`Attempting to re-register the assert-assertion handler`);
  }
  HAS_REGISTERED = true;

  QUnit.assert.expectAssertion = async function(cb: () => unknown, matcher: string | RegExp): Promise<void> {
    let outcome;
    if (DEBUG) {
      try {
        let result = cb();
        if (isThenable(result)) {
          await result;
        }
        outcome = verifyAssertion('', matcher);
      } catch (e) {
        outcome = verifyAssertion(e.message, matcher);
      }
    } else {
      outcome = {
        result: true,
        actual: '',
        expected: '',
        message: `Assertions do not run in production environments`,
      };
    }

    this.pushResult(outcome);
  };

  QUnit.assert.expectNoAssertion = async function(cb: () => unknown) {
    let outcome;
    try {
      let result = cb();
      if (isThenable(result)) {
        await result;
      }
      outcome = verifyNoAssertion('');
    } catch (e) {
      outcome = verifyNoAssertion(e.message);
    }

    this.pushResult(outcome);
  };
}
