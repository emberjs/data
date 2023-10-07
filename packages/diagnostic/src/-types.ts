export interface Hooks {
  beforeEach: (cb: HooksCallback) => void;
  afterEach: (cb: HooksCallback) => void;
  beforeModule: (cb: GlobalCallback) => void;
  afterModule: (cb: GlobalCallback) => void;
}

export interface TestContext {}

export type GlobalCallback = () => void | Promise<void>;
export interface GlobalHooks extends Hooks {
  onSuiteStart: (cb: GlobalCallback) => void;
  onSuiteFinish: (cb: GlobalCallback) => void;
}

export type HooksCallback = (this: TestContext, assert: Assert) => void | Promise<void>;
export type ModuleCallback = (hooks?: Hooks) => void | Promise<void>;
export type TestCallback = (this: TestContext, assert: Assert) => void | Promise<void>;

export interface TestInfo {
  name: string;
  cb: TestCallback;
  skip: boolean;
  todo: boolean;
}

export interface OrderedMap<T> {
  byName: Map<string, T>;
  byOrder: T[];
}

export interface ModuleInfo {
  moduleName: string;
  name: string;
  cb: ModuleCallback;
  config: {
    beforeEach: HooksCallback[];
    afterEach: HooksCallback[];
    beforeModule: GlobalCallback[];
    afterModule: GlobalCallback[];
  },
  tests: OrderedMap<TestInfo>;
  modules: OrderedMap<ModuleInfo>;
}

export interface Assert {
  equal<T>(actual: T, expected: T, message?: string): void;
  notEqual<T>(actual: T, expected: T, message?: string): void;
  strictEqual<T>(actual: T, expected: T, message?: string): void;
  notStrictEqual<T>(actual: T, expected: T, message?: string): void;
  deepEqual<T>(actual: T, expected: T, message?: string): void;
  notDeepEqual<T>(actual: T, expected: T, message?: string): void;
  throws(fn: () => void, expected?: string | RegExp, message?: string): void;
  doesNotThrow(fn: () => void, expected?: string | RegExp, message?: string): void;
}
