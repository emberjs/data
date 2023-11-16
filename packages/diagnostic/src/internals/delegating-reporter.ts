import type { Reporter, SuiteReport } from '../-types/report';

const Reporters = new Set<Reporter>();
export function registerReporter(reporter: Reporter) {
  Reporters.add(reporter);
}

let activeSuite: SuiteReport;
export const DelegatingReporter: Reporter = {
  onSuiteStart(report) {
    if (activeSuite) {
      throw new Error(`Cannot start a test suite while another suite is active`);
    }
    activeSuite = report;
    for (const reporter of Reporters) {
      reporter.onSuiteStart(report);
    }
  },
  onSuiteFinish(report) {
    activeSuite = null as unknown as SuiteReport;
    for (const reporter of Reporters) {
      reporter.onSuiteFinish(report);
    }
  },
  onTestStart(report) {
    for (const reporter of Reporters) {
      reporter.onTestStart(report);
    }
  },
  onTestFinish(report) {
    activeSuite.passed += report.result.passed ? 1 : 0;
    activeSuite.failed += report.result.failed ? 1 : 0;
    activeSuite.skipped += report.skipped ? 1 : 0;
    activeSuite.todo += report.result.passed && report.todo ? 1 : 0;

    const module = report.module;
    module.failed = report.result.failed || module.failed;
    module.passed = !module.failed;

    for (const reporter of Reporters) {
      reporter.onTestFinish(report);
    }
  },
  onModuleStart(report) {
    for (const reporter of Reporters) {
      reporter.onModuleStart(report);
    }
  },
  onModuleFinish(report) {
    for (const reporter of Reporters) {
      reporter.onModuleFinish(report);
    }
  },
  onDiagnostic(report) {
    for (const reporter of Reporters) {
      reporter.onDiagnostic(report);
    }
  },
};
