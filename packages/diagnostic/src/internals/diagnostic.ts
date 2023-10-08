import { GlobalConfig, TestInfo } from "../-types";
import { DiagnosticReport, Reporter, TestReport } from "../-types/report";
import equiv from "../legacy/equiv";

export class Diagnostic {
  declare __currentTest: TestInfo;
  declare __report: TestReport;
  declare __config: GlobalConfig;
  declare __reporter: Reporter;
  declare expected: number | null;
  declare _steps: string[];

  constructor(reporter: Reporter, config: GlobalConfig, test: TestInfo, report: TestReport) {
    this.__currentTest = test;
    this.__report = report;
    this.__config = config;
    this.__reporter = reporter;
    this.expected = null;
    this._steps = [];
  }

  pushResult(result: Pick<DiagnosticReport, 'actual' | 'expected' | 'message' | 'passed' | 'stack'>): void {
    const diagnostic = Object.assign({}, result, { testId: this.__currentTest.id });
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
          throw new Error(message || `Expected ${actual} to equal ${expected}`);
        } catch (err) {
          this.pushResult({
            message: message || 'equal',
            stack: (err as Error).stack!,
            passed: false,
            actual: false,
            expected: true
          });
        }
      } else {
        this.pushResult({
          message: message || 'equal',
          stack: '',
          passed: false,
          actual: false,
          expected: true
        });
      }
    } else {
      this.pushResult({
        message: message || 'equal',
        stack: '',
        passed: true,
        actual: true,
        expected: true
      });
    }
  }

  notEqual<T>(actual: T, expected: T, message?: string): void {
    if (actual === expected) {
      throw new Error(message || `Expected ${actual} to not equal ${expected}`);
    }
  }

  deepEqual<T>(actual: T, expected: T, message?: string): void {
    const isEqual = equiv(actual, expected);
    if (!isEqual) {
      if (this.__config.params.tryCatch.value) {
        try {
          throw new Error(message || `Expected items to be equivalent`);
        } catch (err) {
          this.pushResult({
            message: message || 'deepEqual',
            stack: (err as Error).stack!,
            passed: false,
            actual: false,
            expected: true
          });
        }
      } else {
        this.pushResult({
          message: message || 'deepEqual',
          stack: '',
          passed: false,
          actual: false,
          expected: true
        });
      }
    } else {
      this.pushResult({
        message: message || 'deepEqual',
        stack: '',
        passed: true,
        actual: true,
        expected: true
      });
    }
  }

  notDeepEqual<T>(actual: T, expected: T, message?: string): void {
    const isEqual = equiv(actual, expected);
    if (isEqual) {
      if (this.__config.params.tryCatch.value) {
        try {
          throw new Error(message || `Expected items to not be equivalent`);
        } catch (err) {
          this.pushResult({
            message: message || 'notDeepEqual',
            stack: (err as Error).stack!,
            passed: false,
            actual: false,
            expected: true
          });
        }
      } else {
        this.pushResult({
          message: message || 'notDeepEqual',
          stack: '',
          passed: false,
          actual: false,
          expected: true
        });
      }
    } else {
      this.pushResult({
        message: message || 'notDeepEqual',
        stack: '',
        passed: true,
        actual: true,
        expected: true
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
        expected: true
      });
    }
    if (this.__report.result.diagnostics.length === 0) {
      this.pushResult({
        message: `Expected at least one assertion, but none were run`,
        stack: '',
        passed: false,
        actual: false,
        expected: true
      });
    }
    if (this._steps.length) {
      this.pushResult({
        message: `Expected 0 steps remaining to verify, but ${this._steps.length} were run`,
        stack: '',
        passed: false,
        actual: false,
        expected: true
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

      return resolved.then(() => {
        throw new Error(`Expected function to throw ${expected}`);
      }, (err) => {
        if (expected) {
          if (typeof expected === 'string') {
            this.equal(err.message, expected, message);
          } else {
            this.equal(expected.test(err.message), true, message);
          }
        }
      });
    } catch (err) {
      if (expected) {
        if (typeof expected === 'string') {
          this.equal(err instanceof Error ? err.message : err, expected, message);
        } else {
          this.equal(expected.test(err instanceof Error ? err.message : err as string), true, message);
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

      return resolved.then(() => {
        return;
      }, (err) => {
        if (expected) {
          if (typeof expected === 'string') {
            this.equal(err.message, expected, message);
          } else {
            this.equal(expected.test(err.message), true, message);
          }
        }
      });
    } catch (err) {
      if (expected) {
        if (typeof expected === 'string') {
          this.equal(err instanceof Error ? err.message : err, expected, message);
        } else {
          this.equal(expected.test(err instanceof Error ? err.message : err as string), true, message);
        }
      }
    }
  }
}
