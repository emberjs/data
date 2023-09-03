declare global {
  interface DeprecationConfig {
    id: string;
    count?: number;
    until: string;
    message?: string;
    url?: string;
  }
  interface WarningConfig {
    id: string;
    count?: number;
    until?: string;
    message?: string;
    url?: string;
  }

  interface Assert {
    expectDeprecation(options: { id: string; count: number; until?: string }): void;
    expectDeprecation(callback: () => unknown, options: DeprecationConfig | string | RegExp): Promise<void>;
    expectNoDeprecation(callback: () => unknown): Promise<void>;
    expectWarning(callback: () => unknown, options: WarningConfig | string | RegExp): Promise<void>;
    expectNoWarning(callback: () => unknown): Promise<void>;
    expectAssertion(callback: () => unknown, matcher: string | RegExp): Promise<void>;
    expectNoAssertion(callback: () => unknown): Promise<void>;
    /**
     * Asserts that each member of actual strictly matches the corresponding member of expected.
     * Asserts that actual is an array and has the same length as expected.
     */
    arrayStrictEquals<T>(actual: unknown, expected: T[], message: string): void;
  }

  namespace QUnit {
    export interface Assert {
      expectDeprecation(options: { id: string; count: number; until?: string }): void;
      expectDeprecation(callback: () => unknown, options: DeprecationConfig | string | RegExp): Promise<void>;
      expectNoDeprecation(callback: () => unknown): Promise<void>;
      expectWarning(callback: () => unknown, options: WarningConfig | string | RegExp): Promise<void>;
      expectNoWarning(callback: () => unknown): Promise<void>;
      expectAssertion(callback: () => unknown, matcher: string | RegExp): Promise<void>;
      expectNoAssertion(callback: () => unknown): Promise<void>;
      arrayStrictEquals<T>(unknown, expected: T[], message: string): void;
    }
  }

  interface QUnit {
    assert: Assert;
  }
}

export default Assert;
