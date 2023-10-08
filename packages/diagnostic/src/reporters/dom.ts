/* global Testem */
import { DiagnosticReport, ModuleReport, Reporter, SuiteReport, TestReport } from "../-types/report";
import { getSettings, updateConfigValue, updateSuiteState } from "../internals/config";

type SuiteLayout = {
  report: HTMLElement;
  current: HTMLElement;
  resultsList: HTMLElement;
  results: Map<TestReport, HTMLElement | null>;
  cleanup: (() => void)[];
};

type CompatTestReport = {
  id: number;
  name: string;
  items: [];
  failed: boolean;
  passed: boolean;
  skipped: boolean;
  todo: boolean;
  total: number;
  runDuration: number;
  testId: string;
}

export class DOMReporter implements Reporter {
  declare element: HTMLElement;
  declare settings: ReturnType<typeof getSettings>;
  declare suite: SuiteLayout;
  declare suiteReport: SuiteReport;
  declare currentTest: TestReport | null;
  declare stats: {
    diagnostics: number;
    diagnosticsPassed: number;
    modules: number;
    modulesPassed: number;
  }
  declare modulePath: ModuleReport[];
  declare _pendingUpdate: number | null;
  declare _compatTestReport: CompatTestReport;
  declare _socket?: { emit: (name: string, data?: CompatTestReport) => void };

  constructor(element: HTMLElement) {
    this.element = element;
    this.settings = getSettings();
    this.stats = {
      diagnostics: 0,
      diagnosticsPassed: 0,
      modules: 0,
      modulesPassed: 0,
    };
    this.modulePath = [];
    this._pendingUpdate = null;

    if (this.settings.useTestem) {
      // @ts-expect-error
      if (typeof window.Testem !== 'undefined') {
        // @ts-expect-error
        window.Testem.useCustomAdapter((socket) => {
          this._socket = socket;
        });
      }
    }
  }

  onSuiteStart(report: SuiteReport): void {
    this.element.innerHTML = '';
    this.suite = renderSuite(this.element, report);
    this.suiteReport = report;
    if (this.settings.useTestem) {
      this._socket?.emit('tests-start');
    }
  }

  onSuiteFinish(_report: SuiteReport): void {
    if (this.settings.useTestem) {
      this._socket?.emit('all-test-results');
    }
  }

  onTestStart(test: TestReport): void {
    this.currentTest = test;
    this.scheduleUpdate();
    if (this.settings.useTestem) {
      this._compatTestReport = {
        id: this.suite.results.size + 1,
        name: this.modulePath.at(-1)!.name + ':' + test.name,
        items: [],
        failed: false,
        passed: false,
        skipped: test.skipped,
        todo: test.todo,
        total: 0,
        runDuration: 0,
        testId: test.name,
      };
      this._socket?.emit('tests-start', this._compatTestReport);
    }
  }

  onTestFinish(test: TestReport): void {
    this.currentTest = null;
    this.stats.diagnostics += test.result.diagnostics.length;
    this.stats.diagnosticsPassed += test.result.diagnostics.filter(d => d.passed).length;

    if (this.settings.useTestem) {
      this._compatTestReport.failed = test.result.failed;
      this._compatTestReport.passed = test.result.passed;
      this._compatTestReport.skipped = test.skipped;
      this._compatTestReport.todo = test.todo;
      this._compatTestReport.total = test.result.diagnostics.length;
      this._compatTestReport.runDuration = test.end!.startTime - test.start!.startTime;
      this._socket?.emit('test-result', this._compatTestReport);
      this._compatTestReport = null as unknown as CompatTestReport;
    }

    if (this.settings.params.hideReport.value) {
      return;
    }
    // @ts-expect-error
    test.moduleName = this.modulePath.at(-1)!.name;
    this.suite.results.set(test, null);
    this.scheduleUpdate();
  }

  onModuleStart(module: ModuleReport): void {
    this.modulePath.push(module);
  }

  onModuleFinish(module: ModuleReport): void {
    this.modulePath.pop();
    this.stats.modules++;
    this.stats.modulesPassed += module.passed ? 1 : 0;
    this.scheduleUpdate();
  }

  onDiagnostic(_diagnostic: DiagnosticReport): void {
    this.scheduleUpdate();
  }

  scheduleUpdate() {
    if (this._pendingUpdate) {
      return;
    }
    this._pendingUpdate = requestAnimationFrame(() => {
      this._pendingUpdate = null;
      this._updateRender();
    });
  }

  _updateRender() {
    // render infos
    // render any tests
    let i = 0;
    this.suite.results.forEach((element, test) => {
      i++;
      if (element) {
        return;
      }
      const tr = document.createElement('tr');
      tr.classList.add('diagnostic-result');
      tr.classList.add(classForTestStatus(test));
      tr.innerHTML = `<td>${i}.</td><td>${iconForTestStatus(test)} ${labelForTestStatus(test)}</td><td>${durationForTest(test)}</td><td><strong>${(test as unknown as { moduleName: string}).moduleName} ></strong> ${test.name} (${test.result.diagnostics.length}) </td><td><a href="${getURL(test.id)}">rerun</a></td>`;
      this.suite.resultsList.appendChild(tr);
      this.suite.results.set(test, tr);
    });
  }
}

function getURL(id: string) {
  const currentURL = new URL(window.location.href);
  currentURL.searchParams.set('test', id);
  return currentURL.href;
}

function durationForTest(test: TestReport) {
  if (!test.start || !test.end) {
    return 'N/A';
  }
  return `${(test.end.startTime - test.start.startTime).toLocaleString('en-US')}ms`;
}

function labelForTestStatus(test: TestReport) {
  if (test.skipped) {
    return 'Skip';
  }
  if (test.todo && test.result.passed) {
    return 'Todo';
  }
  if (test.result.passed) {
    return 'Pass';
  }
  return 'Fail';
}

function iconForTestStatus(test: TestReport) {
  if (test.skipped) {
    return '⚠️';
  }
  if (test.todo && test.result.passed) {
    return '🛠️';
  }
  if (test.result.passed) {
    return '✅' + '';
  }
  return '💥';
}

function classForTestStatus(test: TestReport) {
  if (test.skipped) {
    return 'skipped';
  }
  if (test.todo && test.result.passed) {
    return 'todo';
  }
  if (test.result.passed) {
    return 'passed';
  }
  return 'failed';
}

function renderSuite(element: HTMLElement, suiteReport: SuiteReport): SuiteLayout {
  const cleanup: (() => void)[] = [];

  // ==== Create the Header Section
  const header = document.createElement('header');
  header.id = 'warp-drive__diagnostic-header';
  element.appendChild(header);

  const title = document.createElement('h1');
  title.innerHTML = `<span class="logo-main">@warp-drive/</span><span class="logo-pink">diagnostic</span>`;
  header.appendChild(title);

  const paramsList = document.createElement('ul');
  header.appendChild(paramsList);

  const params = getSettings().params;
  type Params = keyof typeof params;
  const keys = Object.keys(params) as Params[];
  keys.forEach((key) => {
    const value = params[key];
    const param = document.createElement('li');
    paramsList.appendChild(param);
    const label = document.createElement('label');
    param.appendChild(label);

    const input = document.createElement('input');
    input.id = value.id;
    input.name = value.id;
    input.type = 'checkbox';
    input.checked = value.value;

    function update() {
        value.value = input.checked;
        updateConfigValue(key, value.value);
    }

    input.addEventListener('change', update);
    cleanup.push(() => input.removeEventListener('change', update));

    label.appendChild(input);
    label.appendChild(document.createTextNode(` ${value.label || value.id}`));
  });

  // ==== Create the Controls Section
  const controls = document.createElement('div');
  controls.id = 'warp-drive__diagnostic-controls';
  element.appendChild(controls);

  function runPrev() {
    updateSuiteState(2);
  }
  function runNext() {
    updateSuiteState(3);
  }
  function runRestart() {
    updateSuiteState(4);
  }

  const prevButton = el('button', 'prev');
  prevButton.innerText = 'Prev ⏪️';
  prevButton.addEventListener('click', runPrev);
  cleanup.push(() => prevButton.removeEventListener('click', runPrev));
  controls.appendChild(prevButton);

  const nextButton = el('button', 'next');
  nextButton.innerText = 'Next ⏩️';
  nextButton.addEventListener('click', runNext);
  cleanup.push(() => nextButton.removeEventListener('click', runNext));
  controls.appendChild(nextButton);

  let isRunning = false;
  const runButton = el('button', 'pauseResume');
  runButton.innerText = 'Run ▶️';

  function updateRunState() {
    isRunning = !isRunning;
    updateSuiteState(isRunning ? 1 : 0);
    if (isRunning) {
      runButton.innerText = 'Pause ⏸️';
    } else {
      runButton.innerText = 'Run ▶️';
    }
  }
  runButton.addEventListener('click', updateRunState);
  cleanup.push(() => runButton.removeEventListener('click', updateRunState));
  controls.appendChild(runButton);

  const restartButton = el('button', 'restart');
  restartButton.innerText = 'Restart 🔄';
  restartButton.addEventListener('click', runRestart);
  cleanup.push(() => restartButton.removeEventListener('click', runRestart));
  controls.appendChild(restartButton);

  // ==== Create the Report Section
  const report = document.createElement('div');
  report.id = 'warp-drive__diagnostic-report';
  element.appendChild(report);

  const current = document.createElement('div');
  current.classList.add('current-diagnostic');
  element.appendChild(current);

  const resultsTable = document.createElement('table');
  element.appendChild(resultsTable);

  const resultsList = document.createElement('tbody');
  resultsList.classList.add('diagnostic-results');
  resultsTable.appendChild(resultsList);

  const results = new Map<TestReport, HTMLElement | null>();

  return { cleanup, report, current, resultsList, results };
}

function el(tag: 'button', name: string): HTMLButtonElement;
function el(tag: 'div', name: string): HTMLDivElement;
function el(tag: 'div' | 'button', name: string) {
  const element = document.createElement(tag);
  element.id = `warp-drive__diagnostic-${name}`;
  if (tag === 'button') {
    (element as HTMLButtonElement).type = 'button';
  }
  return element;
}
