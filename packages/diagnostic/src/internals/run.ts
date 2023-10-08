import { getChain } from "../-utils";
import { ModuleInfo, HooksCallback, TestInfo, } from "../-types";
import { TestReport, ModuleReport } from "../-types/report";
import { Diagnostic } from "../internals/diagnostic";
import { Config, groupLogs, instrument } from "./config";
import { DelegatingReporter } from "./delegating-reporter";

export async function runTest(beforeChain: HooksCallback[], test: TestInfo, afterChain: HooksCallback[]) {
  const testContext = {};
  const testReport: TestReport = {
    id: test.id,
    name: test.name,
    skipped: test.skip,
    todo: test.todo,
    start: null,
    end: null,
    measure: null,
    result: {
      diagnostics: [],
      passed: true,
      failed: false,
    }
  }
  testReport.start = instrument() && performance.mark(`test:${test.module.moduleName} > ${test.name}:start`);
  const Assert = new Diagnostic(DelegatingReporter, Config, test, testReport);

  groupLogs() && console.groupCollapsed(test.name);
  DelegatingReporter.onTestStart(testReport);

  if (test.skip) {
    groupLogs() && console.groupEnd();
    testReport.end = instrument() && performance.mark(`test:${test.module.moduleName} > ${test.name}:end`);
    testReport.measure = instrument() && performance.measure(`test:${test.module.moduleName} > ${test.name}`, testReport.start.name, testReport.end.name);

    DelegatingReporter.onTestFinish(testReport);
    return;
  }


  for (const hook of beforeChain) {
    await hook.call(testContext, Assert);
  }

  try {
    await test.cb.call(testContext, Assert);
  } catch (err) {
    Assert.pushResult({
      message: `Unexpected Test Failure: ${(err as Error).message}`,
      stack: (err as Error).stack!,
      passed: false,
      actual: false,
      expected: true,
    });
    if (!Config.params.tryCatch.value) {
      throw err;
    }
  }

  for (const hook of afterChain) {
    await hook.call(testContext, Assert);
  }
  Assert._finalize();

  groupLogs() && console.groupEnd();
  testReport.end = instrument() && performance.mark(`test:${test.module.moduleName} > ${test.name}:end`);
  testReport.measure = instrument() && performance.measure(`test:${test.module.moduleName} > ${test.name}`, testReport.start.name, testReport.end.name);

  DelegatingReporter.onTestFinish(testReport);
}

export async function runModule(module: ModuleInfo, parents: ModuleInfo[] | null) {
  groupLogs() && console.groupCollapsed(module.name);
  const moduleReport: ModuleReport = {
    name: module.moduleName,
    start: null,
    end: null,
    measure: null,
    passed: true,
    failed: false,
  }
  moduleReport.start = instrument() && performance.mark(`module:${module.moduleName}:start`);

  DelegatingReporter.onModuleStart(moduleReport);
  for (const hook of Config.globalHooks.beforeModule) {
    await hook();
  }

  for (const hook of module.config.beforeModule) {
    await hook();
  }

  // run tests
  const beforeChain = getChain(module, parents, 'beforeEach');
  const afterChain = getChain(module, parents, 'afterEach');
  for (const test of module.tests.byOrder) {
    await runTest(beforeChain, test, afterChain);
  }

  // run modules
  for (const childModule of module.modules.byOrder) {
    await runModule(childModule, [...(parents || []), module]);
  }

  for (const hook of module.config.afterModule) {
    await hook();
  }

  for (const hook of Config.globalHooks.afterModule) {
    await hook();
  }
  groupLogs() && console.groupEnd();
  moduleReport.end = instrument() && performance.mark(`module:${module.moduleName}:end`);
  moduleReport.measure = instrument() && performance.measure(`module:${module.moduleName}`, moduleReport.start.name, moduleReport.end.name);
  DelegatingReporter.onModuleFinish(moduleReport);
}
