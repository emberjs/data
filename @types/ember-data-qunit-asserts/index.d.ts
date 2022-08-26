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
    }
  }

  interface QUnit {
    assert: Assert;
  }
}

export default Assert;
