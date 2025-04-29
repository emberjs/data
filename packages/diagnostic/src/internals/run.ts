import type { HooksCallback, ModuleInfo, TestContext, TestInfo } from '../-types';
import type { ModuleReport, TestReport } from '../-types/report';
import { getChain } from '../-utils';
import { Config, groupLogs, instrument } from './config';
import { DelegatingReporter } from './delegating-reporter';
import { Diagnostic } from './diagnostic';

export const PublicTestInfo = Symbol('TestInfo');

function cancellable(promise: Promise<void>, timeout: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      reject(new Error('Test Timeout Exceeded: ' + timeout + 'ms'));
    }, timeout);
    promise.then(resolve, reject).finally(() => clearTimeout(id));
  });
}

export async function runTest<TC extends TestContext>(
  moduleReport: ModuleReport,
  beforeChain: HooksCallback<TC>[],
  test: TestInfo<TC>,
  afterChain: HooksCallback<TC>[]
) {
  if (Config.tests.size && !Config.tests.has(test.id)) {
    return;
  }

  const testContext = {
    [PublicTestInfo]: {
      id: test.id,
      name: test.testName,
    },
  } as unknown as TC;
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
    },
    module: moduleReport,
  };
  testReport.start = instrument() && performance.mark(`test:${test.module.moduleName} > ${test.name}:start`);
  const Assert = new Diagnostic(DelegatingReporter, Config, test, testReport);

  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  groupLogs() && console.groupCollapsed(test.name);
  DelegatingReporter.onTestStart(testReport);

  if (test.skip) {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    groupLogs() && console.groupEnd();
    testReport.end = instrument() && performance.mark(`test:${test.module.moduleName} > ${test.name}:end`);
    testReport.measure =
      instrument() &&
      performance.measure(`test:${test.module.moduleName} > ${test.name}`, testReport.start.name, testReport.end.name);

    DelegatingReporter.onTestFinish(testReport);
    return;
  }

  for (const hook of beforeChain) {
    try {
      await hook.call(testContext, Assert);
    } catch (err) {
      Assert.pushResult({
        message: `Unexpected Test Failure in beforeEach: ${(err as Error).message}`,
        stack: (err as Error).stack!,
        passed: false,
        actual: false,
        expected: true,
      });
      if (!Config.params.tryCatch.value) {
        throw err;
      }
    }
  }

  try {
    const promise = test.cb.call(testContext, Assert);

    if (promise instanceof Promise && Config.testTimeoutMs > 0) {
      await cancellable(promise, Config.testTimeoutMs);
    }

    await promise;
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
  } finally {
    for (const hook of afterChain) {
      try {
        await hook.call(testContext, Assert);
      } catch (e) {
        Assert.pushResult({
          message: `Unexpected Test Failure in afterEach: ${(e as Error).message}`,
          stack: (e as Error).stack!,
          passed: false,
          actual: false,
          expected: true,
        });
        if (!Config.params.tryCatch.value) {
          // eslint-disable-next-line no-unsafe-finally
          throw e;
        }
      }
    }
    Assert._finalize();

    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    groupLogs() && console.groupEnd();
    testReport.end = instrument() && performance.mark(`test:${test.module.moduleName} > ${test.name}:end`);
    testReport.measure =
      instrument() &&
      performance.measure(`test:${test.module.moduleName} > ${test.name}`, testReport.start.name, testReport.end.name);

    DelegatingReporter.onTestFinish(testReport);
  }
}

export async function runModule<TC extends TestContext>(
  module: ModuleInfo<TC>,
  parents: ModuleInfo<TC>[] | null,
  promises: Promise<void>[]
) {
  if (module.skipped) {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  groupLogs() && console.groupCollapsed(module.name);
  const moduleReport: ModuleReport = {
    id: module.id,
    name: module.moduleName,
    start: null,
    end: null,
    measure: null,
    passed: true,
    failed: false,
  };
  moduleReport.start = instrument() && performance.mark(`module:${module.moduleName}:start`);

  DelegatingReporter.onModuleStart(moduleReport);
  for (const hook of Config.globalHooks.beforeModule) {
    await hook();
  }

  for (const hook of module.config.beforeModule) {
    await hook();
  }

  // run tests
  const beforeChain = getChain<TC>(Config.globalHooks, module, parents, 'beforeEach');
  const afterChain = getChain<TC>(Config.globalHooks, module, parents, 'afterEach');

  if (Config.params.concurrency.value && Config.concurrency > 1) {
    const tests = module.tests.byOrder;
    let remainingTests = tests.length;
    let currentTest = 0;

    // once remaining tests is 0, we move on
    // to the next module after at least one race has completed
    while (remainingTests > 0) {
      const needed = Config.concurrency - promises.length;
      const available = Math.min(needed, remainingTests, Config.concurrency);
      for (let i = 0; i < available; i++) {
        const test = tests[currentTest++];
        remainingTests--;
        const promise = runTest(moduleReport, beforeChain, test, afterChain).finally(() => {
          const index = promises.indexOf(promise);
          void promises.splice(index, 1);
        });
        promises.push(promise);
      }

      if (promises.length === Config.concurrency) {
        await Promise.race(promises);
      }
    }
  } else {
    for (const test of module.tests.byOrder) {
      await runTest(moduleReport, beforeChain, test, afterChain);
    }
  }

  // run modules
  for (const childModule of module.modules.byOrder) {
    await runModule(childModule, [...(parents || []), module], promises);
  }

  for (const hook of module.config.afterModule) {
    await hook();
  }

  for (const hook of Config.globalHooks.afterModule) {
    await hook();
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  groupLogs() && console.groupEnd();
  moduleReport.end = instrument() && performance.mark(`module:${module.moduleName}:end`);
  moduleReport.measure =
    instrument() && performance.measure(`module:${module.moduleName}`, moduleReport.start.name, moduleReport.end.name);
  DelegatingReporter.onModuleFinish(moduleReport);
}
