interface DeprecationConfig {
  id: string;
  count?: number;
  until: string;
  message?: string;
}

interface Assert {
  expectDeprecation(callback: () => unknown, options: DeprecationConfig | string): Promise<void>;
  expectNoDeprecation(callback: () => unknown): Promise<void>;
}

declare namespace QUnit {
  export interface Assert {
    expectDeprecation(callback: () => unknown, options: DeprecationConfig | string): Promise<void>;
    expectNoDeprecation(callback: () => unknown): Promise<void>;
  }
}

declare interface QUnit {
  assert: Assert;
}
