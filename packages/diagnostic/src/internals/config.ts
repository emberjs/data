/* global emit, Testem */
import { assert } from "../-utils";
import { GlobalHooks, GlobalCallback, HooksCallback, GlobalConfig, ModuleInfo, ParamConfig } from "../-types";

export const Config: GlobalConfig = {
  globalHooks: {
    beforeEach: [],
    afterEach: [],
    beforeModule: [],
    afterModule: [],
    onSuiteStart: [],
    onSuiteFinish: []
  },
  // @ts-expect-error
  useTestem: typeof Testem !== 'undefined',
  concurrency: 1,
  params: {
    hideReport: {
      id: 'hideReport',
      label: 'Hide Report',
      value: true
    },
    concurrency: {
      id: 'concurrency',
      label: 'Enable Concurrency',
      value: false
    },
    memory: {
      id: 'memory',
      label: 'Instrument Memory',
      value: false
    },
    instrument: {
      id: 'performance',
      label: 'Instrument Performance',
      value: true
    },
    groupLogs: {
      id: 'groupLogs',
      label: 'Group Logs',
      value: true
    },
    debug: {
      id: 'debug',
      label: 'Debug Mode',
      value: false
    },
    container: {
      id: 'container',
      label: 'Hide Container',
      value: true
    },
    tryCatch: {
      id: 'tryCatch',
      label: 'No Try/Catch',
      value: true
    },
  },
  totals: {
    tests: 0,
    primaryModules: 0,
    modules: 0,
    skipped: 0,
    todo: 0,
  },
  _current: null,
}

let currentModule: ModuleInfo;
let isResolvingGlobalHooks = false;
export const HooksDelegate = {
  beforeEach(cb: HooksCallback): void {
    if (isResolvingGlobalHooks) {
      Config.globalHooks.beforeEach.push(cb);
    } else {
      currentModule.config.beforeEach.push(cb);
    }
  },
  afterEach(cb: HooksCallback): void {
    if (isResolvingGlobalHooks) {
      Config.globalHooks.afterEach.push(cb);
    } else {
      currentModule.config.afterEach.push(cb);
    }
  },
  beforeModule(cb: GlobalCallback): void {
    if (isResolvingGlobalHooks) {
      Config.globalHooks.beforeModule.push(cb);
    } else {
      currentModule.config.beforeModule.push(cb);
    }
  },
  afterModule(cb: GlobalCallback): void {
    if (isResolvingGlobalHooks) {
      Config.globalHooks.afterModule.push(cb);
    } else {
      currentModule.config.afterModule.push(cb);
    }
  },
  onSuiteStart(cb: GlobalCallback): void {
    assert(`Cannot add a global onSuiteStart hook inside of a module`, isResolvingGlobalHooks);
    Config.globalHooks.onSuiteStart.push(cb);
  },
  onSuiteFinish(cb: GlobalCallback): void {
    assert(`Cannot add a global onSuiteFinish hook inside of a module`, isResolvingGlobalHooks);
    Config.globalHooks.onSuiteFinish.push(cb);
  },
}

export function getCurrentModule() {
  return currentModule;
}

export function setCurrentModule(module: ModuleInfo) {
  currentModule = module;
}

export function setupGlobalHooks(cb: (hooks: GlobalHooks) => void): void {
  isResolvingGlobalHooks = true;
  cb(HooksDelegate);
  isResolvingGlobalHooks = false;
}

export type ConfigOptions = {
  concurrency: number;
  instrument: boolean;
  tryCatch: boolean;
  debug: boolean;
  groupLogs: boolean;
  memory: boolean;
  container: boolean;
  hideReport: boolean;
  params: Record<string, ParamConfig>;
  useTestem: boolean;
};
const configOptions = ['concurrency', 'tryCatch', 'instrument', 'hideReport', 'memory', 'groupLogs', 'debug', 'container'] as const;
export function configure(options: ConfigOptions): void {
  if ('useTestem' in options && typeof options.useTestem === 'boolean') {
    Config.useTestem = options.useTestem;
  }
  if ('concurrency' in options && typeof options.concurrency === 'number') {
    Config.concurrency = options.concurrency;
    // @ts-expect-error
    options.concurrency = options.concurrency > 1;
  }
  configOptions.forEach(key => {
    if (key in options && typeof options[key] === 'boolean') {
      Config.params[key].value = options[key] as boolean;
    }
    // don't allow setting these params via configure
    if (options.params?.[key]) {
      delete options.params[key];
    }
  });

  // copy over any remaining params
  Object.assign(Config.params, options.params);
}

export function getSettings() {
  return {
    useTestem: Config.useTestem,
    concurrency: Config.concurrency,
    params: Config.params,
  }
}

export function instrument() {
  return (Config.params.instrument.value || null) as unknown as PerformanceMark;
}

export function groupLogs() {
  return Config.params.groupLogs.value;
}

// 0 - stop
// 1 - start
// 2 - back
// 3 - forward
// 4 - restart
export function updateSuiteState(value: number) {}
export function updateConfigValue(key: string, value: boolean) {}
