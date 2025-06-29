import type { TestContext } from './-define';
import { Modules } from './-define';
import type { ModuleInfo } from './-types';
import type { SuiteReport } from './-types/report';
import { Config, instrument } from './internals/config';
import { DelegatingReporter } from './internals/delegating-reporter';
import { runModule } from './internals/run';

export { registerReporter } from './internals/delegating-reporter';
export { setupGlobalHooks, configure } from './internals/config';
export { PublicTestInfo } from './internals/run';

export { module, test, todo, skip } from './-define';

function shouldSkipModule<TC extends TestContext>(module: ModuleInfo<TC>): boolean {
  // if we have no filters, we should run everything
  if (!Config.modules.size && !Config.tests.size) {
    module.skipped = false;
    return false;
  }

  // if we have specific tests, only run if the test is in the list
  // or a descendent list
  if (Config.tests.size) {
    let found = false;
    for (const test of module.tests.byOrder) {
      if (Config.tests.has(test.id)) {
        found = true;
        break;
      }
    }
    if (!found) {
      for (const subModule of module.modules.byOrder) {
        if (!shouldSkipModule(subModule)) {
          found = true;
          break;
        }
      }
    }
    module.skipped = !found;
    return !found;
  }

  // if we have specific modules, only run if the module is in the list
  // or a descendent list
  if (Config.modules.has(module.id)) {
    module.skipped = false;
    return false;
  }

  let found = false;
  for (const subModule of module.modules.byOrder) {
    if (!shouldSkipModule(subModule)) {
      found = true;
      break;
    }
  }
  module.skipped = !found;
  return !found;
}

export async function start(): Promise<void> {
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
  for (const _module of Modules.byOrder) {
    if (shouldSkipModule(_module)) {
      continue;
    }
    await runModule(_module, null, promises);
  }
  if (promises.length) {
    await Promise.all(promises);
  }

  for (const hook of Config.globalHooks.onSuiteFinish) {
    await hook();
  }
  report.end = instrument() && performance.mark('@warp-drive/diagnostic:end');
  report.measure =
    instrument() && performance.measure('@warp-drive/diagnostic:run', report.start.name, report.end.name);
  DelegatingReporter.onSuiteFinish(report);
}
