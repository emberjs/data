import { Modules } from './-define';
import type { SuiteReport } from './-types/report';
import { Config, instrument } from './internals/config';
import { DelegatingReporter } from './internals/delegating-reporter';
import { runModule } from './internals/run';

export { registerReporter } from './internals/delegating-reporter';
export { setupGlobalHooks, configure } from './internals/config';
export { PublicTestInfo } from './internals/run';

export { module, test, todo, skip } from './-define';

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
  for (const _module of Modules.byOrder) {
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
