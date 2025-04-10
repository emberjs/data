import type { CompatTestReport, Emitter } from '../-types';
import type { DiagnosticReport, ModuleReport, Reporter, SuiteReport, TestReport } from '../-types/report';
import { getSettings, updateConfigValue, updateSuiteState } from '../internals/config';

type SuiteLayout = {
  report: HTMLElement;
  current: HTMLElement;
  resultsList: HTMLElement;
  results: Map<TestReport, HTMLElement[] | null>;
  cleanup: (() => void)[];
  updateStats: () => void;
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
  };
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
    this.stats.diagnosticsPassed += test.result.diagnostics.filter((d) => d.passed).length;

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
      compatTestReport.items = test.result.diagnostics.map((d) => {
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
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        this.settings.params.debug.value && console.log(test, compatTestReport);
      }

      this._socket.emit('test-finish', compatTestReport);
    } else if (test.result.failed) {
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
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
    const isDebug = this.settings.params.debug.value;
    this.suite.results.forEach((elements, test) => {
      i++;
      if (elements) {
        return;
      }
      const tr = document.createElement('tr');
      elements = [tr];
      fragment.appendChild(tr);
      tr.classList.add(classForTestStatus(test));
      const checksTr = document.createElement('tr');

      makeRow(tr, checksTr, [
        i + '.',
        `${iconForTestStatus(test)} ${labelForTestStatus(test)}`,
        durationForTest(test),
        `${test.module.name} > `,
        `${test.name} (${test.result.diagnostics.length})`,
        [getURL(test.id), getURL(test.module.id, 'module')],
      ]);

      checksTr.classList.add('diagnostic-checks');
      fragment.appendChild(checksTr);
      const td = document.createElement('td');
      td.colSpan = 6;
      checksTr.appendChild(td);
      const pre = document.createElement('pre');
      pre.textContent = test.result.diagnostics
        .map((d) => {
          const checkText = `\t${d.passed ? '✅' : '❌'} – ${d.message}`;
          if (isDebug) {
            return d.passed ? checkText : `${checkText}\n${diffResult(d, 2)}`;
          }
        })
        .join('\n');
      td.appendChild(pre);

      elements.push(checksTr);

      this.suite.results.set(test, elements);
    });
    this.suite.resultsList.appendChild(fragment);
    this.suite.updateStats();
  }
}

function makeRow(tr: HTMLTableRowElement, checksTr: HTMLTableRowElement, cells: Array<string | [string, string]>) {
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const td = document.createElement('td');
    if (i === 3) {
      const strong = document.createElement('strong');
      const text = document.createTextNode(cell as string);
      strong.appendChild(text);
      td.appendChild(strong);
      i++;
      const text2 = document.createTextNode(cells[i] as string);
      td.appendChild(text2);
      td.addEventListener('click', () => {
        checksTr.classList.toggle('expanded');
      });
    } else if (i === 5) {
      const [testUrl, moduleUrl] = cell as [string, string];
      const a2 = document.createElement('a');
      a2.href = moduleUrl;
      a2.appendChild(document.createTextNode('module'));
      td.appendChild(a2);
      td.appendChild(document.createTextNode(' | '));
      const a = document.createElement('a');
      a.href = testUrl;
      a.appendChild(document.createTextNode('rerun'));
      td.appendChild(a);
    } else {
      const text = document.createTextNode(cell as string);
      td.appendChild(text);
      td.addEventListener('click', () => {
        checksTr.classList.toggle('expanded');
      });
    }
    tr.appendChild(td);
  }
}

function getURL(id: string, type: 'test' | 'module' = 'test') {
  const currentURL = new URL(window.location.href);
  currentURL.searchParams.set(type === 'test' ? 't' : 'm', id);
  return currentURL.href;
}

function durationForTest(test: TestReport) {
  if (!test.start || !test.end) {
    return 'N/A';
  }
  return `${(test.end.startTime - test.start.startTime).toLocaleString('en-US')}ms`;
}

function statusForTest(test: TestReport) {
  if (test.skipped) {
    return 'skipped';
  }

  if (test.todo && test.result.passed) {
    return 'todo';
  }

  if (test.result.passed) {
    return 'passed';
  }

  if (test.result.diagnostics.at(-1)?.message.startsWith('Unexpected Test Failure:')) {
    return 'broken';
  }

  if (test.result.diagnostics.at(0)?.message === 'Expected at least one assertion, but none were run') {
    return 'underConstruction';
  }

  if (test.todo) {
    return 'underConstruction';
  }

  return 'failed';
}

function labelForTestStatus(test: TestReport) {
  const status = statusForTest(test);

  switch (status) {
    case 'skipped':
      return 'Skip';
    case 'todo':
      return 'Todo';
    case 'passed':
      return 'Pass';
    case 'failed':
      return 'Fail';
    case 'broken':
      return 'Broken';
    case 'underConstruction':
      return 'Under Construction';
  }
}

function iconForTestStatus(test: TestReport) {
  const status = statusForTest(test);

  switch (status) {
    case 'skipped':
      return '⚠️';
    case 'todo':
      return '🛠️';
    case 'passed':
      return '✅';
    case 'failed':
      return '❌';
    case 'broken':
      return '💥';
    case 'underConstruction':
      return '🚧';
    default:
      return '❓❓❓❓';
  }
}

function classForTestStatus(test: TestReport) {
  return statusForTest(test);
}

function renderSuite(element: DocumentFragment, suiteReport: SuiteReport): SuiteLayout {
  const results = new Map<TestReport, HTMLElement[] | null>();
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

    if (typeof value.value === 'string') {
      input.type = 'text';
      input.value = value.value;
    } else {
      input.type = 'checkbox';
      input.checked = value.value;
    }

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

  // ---- Create the Stats Section
  const stats = document.createElement('div');
  stats.id = 'warp-drive__diagnostic-stats';
  report.appendChild(stats);
  const statsTable = document.createElement('table');
  stats.appendChild(statsTable);
  const statsOverview = document.createElement('thead');
  const statsHeader = document.createElement('tr');
  statsOverview.appendChild(statsHeader);
  statsHeader.appendChild(document.createElement('th')).innerText = 'Passing';
  statsHeader.appendChild(document.createElement('th')).innerText = 'Failing';
  statsHeader.appendChild(document.createElement('th')).innerText = 'Broken';
  statsHeader.appendChild(document.createElement('th')).innerText = 'Under Construction';
  statsHeader.appendChild(document.createElement('th')).innerText = 'Skipped';
  statsHeader.appendChild(document.createElement('th')).innerText = 'Todo';
  statsHeader.appendChild(document.createElement('th')).innerText = 'Total';

  const clipboardButton = document.createElement('th');
  statsHeader.appendChild(clipboardButton).innerText = '📋';

  clipboardButton.addEventListener('click', async () => {
    const tableText = [
      '',
      `### Testing Status`,
      '',
      `| Passing | Failing | Broken | Under Construction | Skipped | Todo | Total |`,
      `| ------- | ------- | ------ | ------------------ | ------- | ---- | ----- |`,
      `| ${STATS_CELLS.passing.innerText} | ${STATS_CELLS.failing.innerText} | ${STATS_CELLS.broken.innerText} | ${STATS_CELLS.underConstruction.innerText} | ${STATS_CELLS.skipped.innerText} | ${STATS_CELLS.todo.innerText} | ${STATS_CELLS.total.innerText} |`,
      '',
    ].join('\n');
    const statusText = Array.from(results.keys())
      .map((test) => {
        return `- ${iconForTestStatus(test)} ${test.name}`;
      })
      .join('\n');
    await navigator.clipboard.writeText(`${tableText}\n${statusText}\n`);
  });

  statsTable.appendChild(statsOverview);
  const statsBody = document.createElement('tbody');
  statsTable.appendChild(statsBody);
  const statsRow = document.createElement('tr');
  statsBody.appendChild(statsRow);
  const STATS_CELLS = {
    passing: statsRow.appendChild(document.createElement('td')),
    failing: statsRow.appendChild(document.createElement('td')),
    broken: statsRow.appendChild(document.createElement('td')),
    underConstruction: statsRow.appendChild(document.createElement('td')),
    skipped: statsRow.appendChild(document.createElement('td')),
    todo: statsRow.appendChild(document.createElement('td')),
    total: statsRow.appendChild(document.createElement('td')),
  };
  statsRow.appendChild(document.createElement('td'));

  const updateStats = () => {
    const passed = suiteReport.passed - suiteReport.skipped - suiteReport.todo;
    const tests = Array.from(results.keys());
    const broken = tests.filter((test) => statusForTest(test) === 'broken').length;
    const underConstruction = tests.filter((test) => statusForTest(test) === 'underConstruction').length;
    const failed = suiteReport.failed - broken - underConstruction;
    const total = suiteReport.passed + suiteReport.failed;

    STATS_CELLS.passing.innerText = `✅ ${passed}`;
    STATS_CELLS.failing.innerText = `❌ ${failed}`;
    STATS_CELLS.broken.innerText = `💥 ${broken}`;
    STATS_CELLS.underConstruction.innerText = `🚧 ${underConstruction}`;
    STATS_CELLS.skipped.innerText = `⚠️ ${suiteReport.skipped}`;
    STATS_CELLS.todo.innerText = `🛠️ ${suiteReport.todo}`;
    STATS_CELLS.total.innerText = `${total}`;
  };

  updateStats();

  const current = document.createElement('div');
  current.classList.add('current-diagnostic');
  element.appendChild(current);

  const resultsTable = document.createElement('table');
  element.appendChild(resultsTable);

  const resultsList = document.createElement('tbody');
  resultsList.classList.add('diagnostic-results');
  resultsTable.appendChild(resultsList);

  return { cleanup, report, current, resultsList, results, updateStats };
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

function indentLines(str: string, indent = 2) {
  const indentStr = `\t`.repeat(indent);
  return str
    .split('\n')
    .map((line) => indentStr + line)
    .join('\n');
}

function isPrimitive(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    value === true ||
    value === false ||
    typeof value === 'number' ||
    typeof value === 'string' ||
    typeof value === 'bigint' ||
    typeof value === 'symbol'
  );
}

function diffResult(report: DiagnosticReport, indent?: number) {
  if (isPrimitive(report.expected) && isPrimitive(report.actual)) {
    return indentLines(`Expected: ${String(report.expected)}\nActual: ${String(report.actual)}`, 2);
  }
  const actualText = JSON.stringify(report.actual, null, 2);
  const expectedText = JSON.stringify(report.expected, null, 2);

  return indentLines(`Expected:\n${expectedText}\n\nActual:\n${actualText}`, 2);
}
