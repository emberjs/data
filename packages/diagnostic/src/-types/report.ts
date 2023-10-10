export interface SuiteReport {
  totals: {
    tests: number;
    primaryModules: number;
    modules: number;
    skipped: number;
    todo: number;
  };
  passed: number;
  failed: number;
  skipped: number;
  todo: number;
  start: PerformanceMark | null;
  end: PerformanceMark | null;
  measure: PerformanceMeasure | PerformanceMark | null;
}
export interface TestReport {
  id: string;
  name: string;
  skipped: boolean;
  todo: boolean;
  start: PerformanceMark | null;
  end: PerformanceMark | null;
  measure: PerformanceMeasure | PerformanceMark | null;
  result: {
    diagnostics: DiagnosticReport[];
    passed: boolean;
    failed: boolean;
  }
  module: ModuleReport;
}
export interface ModuleReport {
  name: string;
  start: PerformanceMark | null;
  end: PerformanceMark | null;
  measure: PerformanceMeasure | PerformanceMark | null;
  passed: boolean;
  failed: boolean;
}
export interface DiagnosticReport {
  testId: string;
  message: string;
  passed: boolean;
  expected: unknown;
  actual: unknown;
  stack: string;
}

export interface Reporter {
  onSuiteStart: (report: SuiteReport) => void;
  onSuiteFinish: (report: SuiteReport) => void;
  onTestStart: (test: TestReport) => void;
  onTestFinish: (test: TestReport) => void;
  onModuleStart: (module: ModuleReport) => void;
  onModuleFinish: (module: ModuleReport) => void;
  onDiagnostic: (diagnostic: DiagnosticReport) => void;
}
