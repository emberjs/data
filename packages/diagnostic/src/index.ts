import { assert, generateHash } from "./-utils";
import { ModuleInfo, TestInfo, ModuleCallback, TestCallback, OrderedMap, TestContext } from "./-types";
import { SuiteReport } from "./-types/report";

import { Config, HooksDelegate, getCurrentModule, instrument, setCurrentModule } from "./internals/config";
import { DelegatingReporter } from "./internals/delegating-reporter";
import { runModule } from "./internals/run";

export { registerReporter } from "./internals/delegating-reporter";
export { setupGlobalHooks, configure } from "./internals/config";

const Modules: OrderedMap<ModuleInfo<TestContext>> = {
  byName: new Map(),
  byOrder: []
}

export type { Diagnostic, Hooks as NestedHooks, GlobalHooks, TestContext } from './-types';

export function module<TC extends TestContext = TestContext>(name: string, cb: ModuleCallback<TC>): void {
  const parentModule = getCurrentModule<TC>() ?? null;
  let moduleName = name;
  if (parentModule) {
    moduleName = `${parentModule.name} > ${name}`;
  } else {
    Config.totals.primaryModules++;
  }
  Config.totals.modules++;

  assert(`Cannot add the same module name twice: ${moduleName}`, !Modules.byName.has(moduleName));
  const moduleConfig: ModuleInfo<TC>['config'] = {
    beforeEach: [],
    afterEach: [],
    beforeModule: [],
    afterModule: []
  };
  const tests: OrderedMap<TestInfo<TC>> = { byName: new Map(), byOrder: [] };
  const modules: OrderedMap<ModuleInfo<TC>> = { byName: new Map(), byOrder: [] };
  const moduleInfo = {
    moduleName,
    name,
    cb,
    config: moduleConfig,
    tests,
    modules,
    parent: parentModule,
  };

  setCurrentModule(moduleInfo);

  if (parentModule) {
    parentModule.modules.byName.set(name, moduleInfo);
    parentModule.modules.byOrder.push(moduleInfo);
  } else {
    // @ts-expect-error TS poorly handles subtype constraints
    Modules.byName.set(name, moduleInfo);
    // @ts-expect-error TS poorly handles subtype constraints
    Modules.byOrder.push(moduleInfo);
  }

  cb(HooksDelegate);
  setCurrentModule(parentModule as unknown as ModuleInfo<TC>);
}

export function test<TC extends TestContext = TestContext>(name: string, cb: TestCallback<TC>): void {
  const currentModule = getCurrentModule<TC>();
  assert(`Cannot add a test outside of a module`, !!currentModule);
  assert(`Cannot add the same test name twice: ${name}`, !currentModule.tests.byName.has(name));
  Config.totals.tests++;

  const testInfo = {
    id: generateHash(currentModule.moduleName + ' > ' + name),
    name,
    cb,
    skip: false,
    todo: false,
    module: currentModule,
  };

  currentModule.tests.byName.set(name, testInfo);
  currentModule.tests.byOrder.push(testInfo);
}

export function todo<TC extends TestContext = TestContext>(name: string, cb: TestCallback<TC>): void {
  const currentModule = getCurrentModule<TC>();
  assert(`Cannot add a test outside of a module`, !!currentModule);
  assert(`Cannot add the same test name twice: ${name}`, !currentModule.tests.byName.has(name));
  Config.totals.todo++;

  const testInfo = {
    id: generateHash(currentModule.moduleName + ' > ' + name),
    name,
    cb,
    skip: false,
    todo: true,
    module: currentModule,
  };

  currentModule.tests.byName.set(name, testInfo);
  currentModule.tests.byOrder.push(testInfo);
}

export function skip<TC extends TestContext = TestContext>(name: string, cb: TestCallback<TC>): void {
  const currentModule = getCurrentModule<TC>();
  assert(`Cannot add a test outside of a module`, !!currentModule);
  assert(`Cannot add the same test name twice: ${name}`, !currentModule.tests.byName.has(name));
  Config.totals.skipped++;

  const testInfo = {
    id: generateHash(currentModule.moduleName + ' > ' + name),
    name,
    cb,
    skip: true,
    todo: false,
    module: currentModule,
  };

  currentModule.tests.byName.set(name, testInfo);
  currentModule.tests.byOrder.push(testInfo);
}

export async function start() {
  const report: SuiteReport = {
    totals: Object.assign({}, Config.totals),
    passed: 0,
    failed: 0,
    skipped: 0,
    todo: 0,
    start: null,
    end: null,
    measure: null,
  };
  Config._current = report;
  report.start = instrument() && performance.mark('@warp-drive/diagnostic:start');

  DelegatingReporter.onSuiteStart(report);
  for (const hook of Config.globalHooks.onSuiteStart) {
    await hook();
  }

  const promises: Promise<void>[] = [];
  for (const module of Modules.byOrder) {
    await runModule(module, null, promises);
  }
  if (promises.length) {
    await Promise.all(promises);
  }

  for (const hook of Config.globalHooks.onSuiteFinish) {
    await hook();
  }
  report.end = instrument() && performance.mark('@warp-drive/diagnostic:end');
  report.measure = instrument() && performance.measure('@warp-drive/diagnostic:run', report.start.name, report.end.name);
  DelegatingReporter.onSuiteFinish(report);
}
