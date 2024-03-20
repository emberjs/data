import type { GlobalConfig, TestContext, TestInfo } from '../-types';
import type { DiagnosticReport, Reporter, TestReport } from '../-types/report';
import equiv from '../legacy/equiv';

class InternalCompat<TC extends TestContext> {
  declare _diagnostic: Diagnostic<TC>;

  constructor(diagnostic: Diagnostic<TC>) {
    this._diagnostic = diagnostic;
  }

  get testId() {
    return this._diagnostic.__currentTest.id;
  }

  get expected() {
    return this._diagnostic.expected;
  }
  set expected(value) {
    this._diagnostic.expected = value;
  }
}

export class Diagnostic<TC extends TestContext> {
  declare __currentTest: TestInfo<TC>;
  declare __report: TestReport;
  declare __config: GlobalConfig;
  declare __reporter: Reporter;
  declare expected: number | null;
  declare _steps: string[];

  // QUnit private API compat
  declare test: InternalCompat<TC>;

  constructor(reporter: Reporter, config: GlobalConfig, test: TestInfo<TC>, report: TestReport) {
    this.__currentTest = test;
    this.__report = report;
    this.__config = config;
    this.__reporter = reporter;
    this.expected = null;
    this._steps = [];
    this.test = new InternalCompat(this);
  }

  pushResult(
    result: Pick<DiagnosticReport, 'actual' | 'expected' | 'message' | 'passed' | 'stack'> & { result?: boolean }
  ): void {
    const diagnostic = Object.assign({ passed: result.passed ?? result.result }, result, {
      testId: this.__currentTest.id,
    });
    this.__report.result.diagnostics.push(diagnostic);

    if (!diagnostic.passed) {
      this.__report.result.passed = false;
      this.__report.result.failed = true;
    }

    this.__reporter.onDiagnostic(diagnostic);
  }

  equal<T>(actual: T, expected: T, message?: string): void {
    if (actual !== expected) {
      if (this.__config.params.tryCatch.value) {
        try {
          throw new Error(message || `Expected ${String(actual)} to equal ${String(expected)}`);
        } catch (err) {
          this.pushResult({
            message: message || 'equal',
            stack: (err as Error).stack!,
            passed: false,
            actual,
            expected,
          });
        }
      } else {
        this.pushResult({
          message: message || 'equal',
          stack: '',
          passed: false,
          actual,
          expected,
        });
      }
    } else {
      this.pushResult({
        message: message || 'equal',
        stack: '',
        passed: true,
        actual: true,
        expected: true,
      });
    }
  }

  notEqual<T>(actual: T, expected: T, message?: string): void {
    if (actual === expected) {
      throw new Error(message || `Expected ${String(actual)} to not equal ${String(expected)}`);
    }
  }

  deepEqual<T>(actual: T, expected: T, message?: string): void {
    const isEqual = equiv(actual, expected, true);
    if (!isEqual) {
      if (this.__config.params.tryCatch.value) {
        try {
          throw new Error(message || `Expected items to be equivalent`);
        } catch (err) {
          this.pushResult({
            message: message || 'deepEqual',
            stack: (err as Error).stack!,
            passed: false,
            actual,
            expected,
          });
        }
      } else {
        this.pushResult({
          message: message || 'deepEqual',
          stack: '',
          passed: false,
          actual,
          expected,
        });
      }
    } else {
      this.pushResult({
        message: message || 'deepEqual',
        stack: '',
        passed: true,
        actual: true,
        expected: true,
      });
    }
  }

  /**
   * Checks if the actual object satisfies the expected object.
   *
   * This is a deep comparison that will check if all the properties
   * of the expected object are present in the actual object with the
   * same values.
   *
   * This differs from deepEqual in that extra properties on the actual
   * object are allowed.
   *
   * This is great for contract testing APIs that may accept a broader
   * object from which a subset of properties are used, or for testing
   * higher priority or more stable properties of an object in a dynamic
   * environment.
   *
   * @typedoc
   */
  satisfies<T extends object, J extends T>(actual: J, expected: T, message?: string): void {
    const isEqual = equiv(actual, expected, false);
    if (!isEqual) {
      if (this.__config.params.tryCatch.value) {
        try {
          throw new Error(message || `Expected items to be equivalent`);
        } catch (err) {
          this.pushResult({
            message: message || 'satisfies',
            stack: (err as Error).stack!,
            passed: false,
            actual,
            expected,
          });
        }
      } else {
        this.pushResult({
          message: message || 'satisfies',
          stack: '',
          passed: false,
          actual,
          expected,
        });
      }
    } else {
      this.pushResult({
        message: message || 'satisfies',
        stack: '',
        passed: true,
        actual: true,
        expected: true,
      });
    }
  }

  notDeepEqual<T>(actual: T, expected: T, message?: string): void {
    const isEqual = equiv(actual, expected, true);
    if (isEqual) {
      if (this.__config.params.tryCatch.value) {
        try {
          throw new Error(message || `Expected items to not be equivalent`);
        } catch (err) {
          this.pushResult({
            message: message || 'notDeepEqual',
            stack: (err as Error).stack!,
            passed: false,
            actual,
            expected,
          });
        }
      } else {
        this.pushResult({
          message: message || 'notDeepEqual',
          stack: '',
          passed: false,
          actual,
          expected,
        });
      }
    } else {
      this.pushResult({
        message: message || 'notDeepEqual',
        stack: '',
        passed: true,
        actual: true,
        expected: true,
      });
    }
  }

  true(actual: boolean, message?: string): void {
    this.equal(actual, true, message);
  }

  false(actual: boolean, message?: string): void {
    this.equal(actual, false, message);
  }

  ok(actual: unknown, message?: string): void {
    this.equal(!!actual, true, message);
  }

  notOk(actual: unknown, message?: string): void {
    this.equal(!!actual, false, message);
  }

  expect(count: number): void {
    this.expected = count;
  }

  step(name: string): void {
    this._steps.push(name);
  }

  verifySteps(steps: string[], message?: string): void {
    this.deepEqual(this._steps, steps, message);
    this._steps = [];
  }

  _finalize(): void {
    if (this.expected !== null && this.expected !== this.__report.result.diagnostics.length) {
      this.pushResult({
        message: `Expected ${this.expected} assertions, but ${this.__report.result.diagnostics.length} were run`,
        stack: '',
        passed: false,
        actual: false,
        expected: true,
      });
    }
    if (this.__report.result.diagnostics.length === 0) {
      this.pushResult({
        message: `Expected at least one assertion, but none were run`,
        stack: '',
        passed: false,
        actual: false,
        expected: true,
      });
    }
    if (this._steps.length) {
      this.pushResult({
        message: `Expected 0 steps remaining to verify, but ${this._steps.length} were run`,
        stack: '',
        passed: false,
        actual: false,
        expected: true,
      });
    }
  }

  throws(fn: () => Promise<void>, expected?: string | RegExp, message?: string): Promise<void>;
  throws(fn: () => void, expected?: string | RegExp, message?: string): void;
  throws(fn: () => void | Promise<void>, expected?: string | RegExp, message?: string): Promise<void> | void {
    try {
      const result = fn();
      const resolved = Promise.resolve(result);
      const isPromise = resolved === result;

      if (!isPromise) {
        throw new Error(`Expected function to throw ${expected}`);
      }

      return resolved.then(
        () => {
          throw new Error(`Expected function to throw ${expected}`);
        },
        (err: Error | string) => {
          if (expected) {
            if (typeof expected === 'string') {
              this.equal(typeof err === 'string' ? err : err.message, expected, message);
            } else {
              this.equal(typeof err === 'string' ? err : expected.test(err.message), true, message);
            }
          }
        }
      );
    } catch (err) {
      if (expected) {
        if (typeof expected === 'string') {
          this.equal(err instanceof Error ? err.message : err, expected, message);
        } else {
          this.equal(expected.test(err instanceof Error ? err.message : (err as string)), true, message);
        }
      }
    }
  }

  doesNotThrow(fn: () => Promise<void>, expected?: string | RegExp, message?: string): Promise<void>;
  doesNotThrow(fn: () => void, expected?: string | RegExp, message?: string): void;
  doesNotThrow(fn: () => void | Promise<void>, expected?: string | RegExp, message?: string): Promise<void> | void {
    try {
      const result = fn();
      const resolved = Promise.resolve(result);
      const isPromise = resolved === result;

      if (!isPromise) {
        return;
      }

      return resolved.then(
        () => {
          return;
        },
        (err: Error | string) => {
          if (expected) {
            if (typeof expected === 'string') {
              this.equal(typeof err === 'string' ? err : err.message, expected, message);
            } else {
              this.equal(expected.test(typeof err === 'string' ? err : err.message), true, message);
            }
          }
        }
      );
    } catch (err) {
      if (expected) {
        if (typeof expected === 'string') {
          this.equal(err instanceof Error ? err.message : err, expected, message);
        } else {
          this.equal(expected.test(err instanceof Error ? err.message : (err as string)), true, message);
        }
      }
    }
  }
}
