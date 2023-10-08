import { assert, generateHash } from "./-utils";
import { ModuleInfo, TestInfo, ModuleCallback, TestCallback, OrderedMap } from "./-types";
import { SuiteReport } from "./-types/report";

import { Config, HooksDelegate, getCurrentModule, instrument, setCurrentModule } from "./internals/config";
import { DelegatingReporter } from "./internals/delegating-reporter";
import { runModule } from "./internals/run";

export { registerReporter } from "./internals/delegating-reporter";
export { setupGlobalHooks, configure } from "./internals/config";

const Modules: OrderedMap<ModuleInfo> = {
  byName: new Map(),
  byOrder: []
}

export function module(name: string, cb: ModuleCallback): void {
  const parentModule = getCurrentModule() ?? null;
  let moduleName = name;
  if (parentModule) {
    moduleName = `${parentModule.name} > ${name}`;
  } else {
    Config.totals.primaryModules++;
  }
  Config.totals.modules++;

  assert(`Cannot add the same module name twice: ${moduleName}`, !Modules.byName.has(moduleName));
  const moduleConfig = {
    beforeEach: [],
    afterEach: [],
    beforeModule: [],
    afterModule: []
  };
  const tests: OrderedMap<TestInfo> = { byName: new Map(), byOrder: [] };
  const modules: OrderedMap<ModuleInfo> = { byName: new Map(), byOrder: [] };
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
    Modules.byName.set(name, moduleInfo);
    Modules.byOrder.push(moduleInfo);
  }

  cb(HooksDelegate);
  setCurrentModule(parentModule as unknown as ModuleInfo);
}

export function test(name: string, cb: TestCallback): void {
  const currentModule = getCurrentModule();
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

export function todo(name: string, cb: TestCallback): void {
  const currentModule = getCurrentModule();
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

export function skip(name: string, cb: TestCallback): void {
  const currentModule = getCurrentModule();
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

  for (const module of Modules.byOrder) {
    await runModule(module, null);
  }

  for (const hook of Config.globalHooks.onSuiteFinish) {
    await hook();
  }
  report.end = instrument() && performance.mark('@warp-drive/diagnostic:end');
  report.measure = instrument() && performance.measure('@warp-drive/diagnostic:run', report.start.name, report.end.name);
  DelegatingReporter.onSuiteFinish(report);
}
