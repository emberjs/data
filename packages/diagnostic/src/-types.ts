import { SuiteReport } from './-types/report';

export type CompatTestReport = {
  id: number;
  name: string;
  items: { passed: boolean; message: string }[];
  failed: number;
  passed: number;
  total: number;
  runDuration: number;
  skipped: boolean;
  todo: boolean;
  testId: string;
};

export interface Emitter {
  emit(name: 'suite-start', data: SuiteReport): void;
  emit(name: 'suite-finish', data: SuiteReport): void;
  emit(name: 'test-start', data: CompatTestReport): void;
  emit(name: 'test-finish', data: CompatTestReport): void;
}

export type ParamConfig = {
  id: string;
  label: string;
  value: boolean;
};

export type GlobalHooksStorage<TC extends TestContext> = {
  onSuiteStart: GlobalCallback[];
  onSuiteFinish: GlobalCallback[];
  beforeModule: GlobalCallback[];
  afterModule: GlobalCallback[];
  beforeEach: HooksCallback<TC>[];
  afterEach: HooksCallback<TC>[];
};

export type GlobalConfig<TC extends TestContext = TestContext> = {
  params: {
    [key in
      | 'concurrency'
      | 'tryCatch'
      | 'instrument'
      | 'hideReport'
      | 'memory'
      | 'groupLogs'
      | 'debug'
      | 'container']: ParamConfig;
  };
  _current: SuiteReport | null;
  useTestem: boolean;
  useDiagnostic: boolean;
  concurrency: number;
  globalHooks: GlobalHooksStorage<TC>;
  totals: {
    tests: number;
    primaryModules: number;
    modules: number;
    skipped: number;
    todo: number;
  };
};

export interface Diagnostic {
  equal<T>(actual: T, expected: T, message?: string): void;
  notEqual<T>(actual: T, expected: T, message?: string): void;
  deepEqual<T>(actual: T, expected: T, message?: string): void;
  notDeepEqual<T>(actual: T, expected: T, message?: string): void;
  throws(fn: () => Promise<void>, expected?: string | RegExp, message?: string): Promise<void>;
  throws(fn: () => void, expected?: string | RegExp, message?: string): void;
  doesNotThrow(fn: () => Promise<void>, expected?: string | RegExp, message?: string): Promise<void>;
  doesNotThrow(fn: () => void, expected?: string | RegExp, message?: string): void;
  true(actual: boolean, message?: string): void;
  false(actual: boolean, message?: string): void;
  ok(actual: unknown, message?: string): void;
  notOk(actual: unknown, message?: string): void;
  expect(count: number): void;
  step(name: string): void;
  verifySteps(steps: string[], message?: string): void;
}

export interface TestContext {}

export type GlobalCallback = () => void | Promise<void>;

export interface Hooks<TC extends TestContext = TestContext> {
  beforeEach: (cb: HooksCallback<TC>) => void;
  afterEach: (cb: HooksCallback<TC>) => void;
  beforeModule: (cb: GlobalCallback) => void;
  afterModule: (cb: GlobalCallback) => void;
}
export interface GlobalHooks<TC extends TestContext> extends Hooks<TC> {
  onSuiteStart: (cb: GlobalCallback) => void;
  onSuiteFinish: (cb: GlobalCallback) => void;
}

export type HooksCallback<TC extends TestContext> = (this: TC, assert: Diagnostic) => void | Promise<void>;
export type ModuleCallback<TC extends TestContext> = ((hooks: Hooks<TC>) => void) | (() => void);
export type TestCallback<TC extends TestContext> = (this: TC, assert: Diagnostic) => void | Promise<void>;

export interface TestInfo<TC extends TestContext> {
  id: string;
  name: string;
  cb: TestCallback<TC>;
  skip: boolean;
  todo: boolean;
  module: ModuleInfo<TC>;
}

export interface OrderedMap<T> {
  byName: Map<string, T>;
  byOrder: T[];
}

export interface ModuleInfo<TC extends TestContext> {
  moduleName: string;
  name: string;
  cb: ModuleCallback<TC>;
  config: {
    beforeEach: HooksCallback<TC>[];
    afterEach: HooksCallback<TC>[];
    beforeModule: GlobalCallback[];
    afterModule: GlobalCallback[];
  };
  tests: OrderedMap<TestInfo<TC>>;
  modules: OrderedMap<ModuleInfo<TC>>;
}
