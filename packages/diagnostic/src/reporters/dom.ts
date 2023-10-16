/* global Testem */
import { CompatTestReport, Emitter } from "../-types";
import { DiagnosticReport, ModuleReport, Reporter, SuiteReport, TestReport } from "../-types/report";
import { getSettings, updateConfigValue, updateSuiteState } from "../internals/config";

type SuiteLayout = {
  report: HTMLElement;
  current: HTMLElement;
  resultsList: HTMLElement;
  results: Map<TestReport, HTMLElement | null>;
  cleanup: (() => void)[];
};

export class DOMReporter implements Reporter {
  declare element: HTMLElement;
  declare settings: ReturnType<typeof getSettings>;
  declare suite: SuiteLayout;
  declare suiteReport: SuiteReport;
  declare currentTests: Map<string, CompatTestReport>;
  declare nextTestId: number;
  declare stats: {
    diagnostics: number;
    diagnosticsPassed: number;
    modules: number;
    modulesPassed: number;
  }
  declare _pendingUpdate: number | null;
  declare _socket: Emitter | null;

  constructor(element: HTMLElement, emitter?: Emitter | null) {
    this.nextTestId = 1;
    this.element = element;
    this.settings = getSettings();
    this.stats = {
      diagnostics: 0,
      diagnosticsPassed: 0,
      modules: 0,
      modulesPassed: 0,
    };
    this._pendingUpdate = null;
    this.currentTests = new Map();
    this._socket = emitter || null;
  }

  onSuiteStart(report: SuiteReport): void {
    if (this.element.children.length) {
      this.element.innerHTML = '';
    }
    const fragment = document.createDocumentFragment();
    this.suite = renderSuite(fragment, report);
    this.element.appendChild(fragment);
    this.suiteReport = report;
    this._socket?.emit('suite-start', report);
  }

  onSuiteFinish(report: SuiteReport): void {
    this._socket?.emit('suite-finish', report);
  }

  onTestStart(test: TestReport): void {
    this.scheduleUpdate();
    if (this._socket) {
      const compatTestReport = {
        id: this.nextTestId++,
        name: test.module.name + ':' + test.name,
        items: [],
        failed: 0,
        passed: 0,
        skipped: test.skipped,
        todo: test.todo,
        total: 0,
        runDuration: 0,
        testId: test.id,
      };
      this.currentTests.set(test.id, compatTestReport);
      this._socket.emit('test-start', compatTestReport);
    }
  }

  onTestFinish(test: TestReport): void {
    this.stats.diagnostics += test.result.diagnostics.length;
    this.stats.diagnosticsPassed += test.result.diagnostics.filter(d => d.passed).length;

    if (this._socket) {
      const compatTestReport = this.currentTests.get(test.id)!;
      console.log(compatTestReport.id, test.name);
      this.currentTests.delete(test.id);
      compatTestReport.failed += test.result.failed ? 1 : 0;
      compatTestReport.passed += test.result.passed ? 1 : 0;
      compatTestReport.skipped = test.skipped;
      compatTestReport.todo = test.todo;
      compatTestReport.total = test.result.diagnostics.length;
      compatTestReport.runDuration = test.end!.startTime - test.start!.startTime;
      compatTestReport.items = test.result.diagnostics.map(d => {
        // more expensive to serialize the whole diagnostic
        if (this.settings.params.debug.value) {
          return d;
        }
        return {
          passed: d.passed,
          message: d.message,
        };
      });

      if (compatTestReport.failed > 0 || test.result.failed) {
        this.settings.params.debug.value && console.log(test, compatTestReport);
      }

      this._socket.emit('test-finish', compatTestReport);
    } else if (test.result.failed) {
      this.settings.params.debug.value && console.log(test);
    }

    if (this.settings.params.hideReport.value) {
      return;
    }
    // @ts-expect-error
    test.moduleName = test.module.name;
    this.suite.results.set(test, null);
    this.scheduleUpdate();
  }

  onModuleStart(module: ModuleReport): void {}

  onModuleFinish(module: ModuleReport): void {
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
    const fragment = document.createDocumentFragment();
    this.suite.results.forEach((element, test) => {
      i++;
      if (element) {
        return;
      }
      const tr = document.createElement('tr');
      fragment.appendChild(tr);
      tr.classList.add(classForTestStatus(test));
      makeRow(tr, [
        i + '.',
        `${iconForTestStatus(test)} ${labelForTestStatus(test)}`,
        durationForTest(test),
        `${test.module.name} > `,
        `${test.name} (${test.result.diagnostics.length})`,
        getURL(test.id),
      ]);
      this.suite.results.set(test, tr);
    });
    this.suite.resultsList.appendChild(fragment);
  }
}

function makeRow(tr: HTMLTableRowElement, cells: string[]) {
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const td = document.createElement('td');
    if (i === 3) {
      const strong = document.createElement('strong');
      const text = document.createTextNode(cell);
      strong.appendChild(text);
      td.appendChild(strong);
      i++;
      const text2 = document.createTextNode(cells[i]);
      td.appendChild(text2);
    } else if (i === 5) {
      const a = document.createElement('a');
      a.href = cell;
      a.appendChild(document.createTextNode('rerun'));
      td.appendChild(a);
    } else {
      const text = document.createTextNode(cell);
      td.appendChild(text);
    }
    tr.appendChild(td);
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

function renderSuite(element: DocumentFragment, suiteReport: SuiteReport): SuiteLayout {
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
