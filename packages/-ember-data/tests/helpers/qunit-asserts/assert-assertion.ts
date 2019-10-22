import QUnit from 'qunit';
import { checkMatcher } from './check-matcher';
import RSVP from 'rsvp';

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

function expectAssertion(message: string, matcher: string | RegExp): AssertSomeResult {
  let passed = checkMatcher(message, matcher);

  return {
    result: passed,
    actual: message,
    expected: String(matcher),
    message: `Expected an assertion during the test`,
  };
}

function expectNoAssertion(message: string | undefined): AssertNoneResult {
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
    try {
      let result = cb();
      if (result instanceof Promise || result instanceof RSVP.Promise) {
        await result;
      }
      outcome = expectAssertion('', matcher);
    } catch (e) {
      outcome = expectAssertion(e.message, matcher);
    }

    this.pushResult(outcome);
  };

  QUnit.assert.expectNoAssertion = async function(cb: () => unknown) {
    let outcome;
    try {
      let result = cb();
      if (result instanceof Promise || result instanceof RSVP.Promise) {
        await result;
      }
      outcome = expectNoAssertion('');
    } catch (e) {
      outcome = expectNoAssertion(e.message);
    }

    this.pushResult(outcome);
  };
}
