/* global Testem */
import { IS_CI } from '@warp-drive/core/build-config/env';

import type {
  GlobalCallback,
  GlobalConfig,
  GlobalHooks,
  HooksCallback,
  ModuleInfo,
  ParamConfig,
  TestContext,
} from '../-types';
import { assert } from '../-utils';

const url = new URL(window.location.href);
const urlParams = url.searchParams;

const tests = new Set(urlParams.getAll('t'));
const modules = new Set(urlParams.getAll('m'));

export type ParamConfigScaffold =
  | {
      id: string;
      label: string;
      value: boolean;
      reload?: boolean;
    }
  | {
      id: string;
      label: string;
      value: string;
      reload?: boolean;
    };

function withParam<T extends ParamConfigScaffold>(value: T): ParamConfig {
  const val = value as ParamConfig;
  val.defaultValue = value.value;
  const param = urlParams.get(value.id);

  if (param === null) {
    return val;
  }

  if (typeof value.value === 'boolean') {
    // '' is treated as true, 'false' or '0' as false
    value.value = param === 'false' || param === '0' ? false : true;
  } else if (typeof value.value === 'string') {
    value.value = param;
  } else {
    throw new Error(`Unexpected parameter type for ${(value as ParamConfig).id}: ${typeof param}`);
  }

  return val;
}

export const Config: GlobalConfig = {
  name: {
    org: '@warp-drive/',
    package: 'diagnostic',
  },
  globalHooks: {
    beforeEach: [],
    afterEach: [],
    beforeModule: [],
    afterModule: [],
    onSuiteStart: [],
    onSuiteFinish: [],
  },
  // @ts-expect-error
  useTestem: typeof Testem !== 'undefined',
  // @ts-expect-error
  useDiagnostic: typeof Testem === 'undefined',
  testTimeoutMs: 50,
  concurrency: 1,
  modules,
  tests,
  params: {
    search: withParam({
      id: 'search',
      label: 'Filter Tests',
      value: '',
      reload: true,
    }),
    hideReport: withParam({
      id: 'hideReport',
      label: 'Hide Report',
      value: IS_CI ? true : false,
    }),
    useConcurrency: withParam({
      id: 'useConcurrency',
      label: 'Enable Concurrency',
      value: false,
      reload: true,
    }),
    memory: withParam({
      id: 'memory',
      label: 'Instrument Memory',
      value: false,
      reload: true,
    }),
    instrument: withParam({
      id: 'performance',
      label: 'Instrument Performance',
      value: IS_CI ? false : true,
      reload: true,
    }),
    groupLogs: withParam({
      id: 'groupLogs',
      label: 'Group Logs',
      value: false,
    }),
    debug: withParam({
      id: 'debug',
      label: 'Debug Mode',
      value: IS_CI ? false : true,
    }),
    timeline: withParam({
      id: 'timeline',
      label: 'Show Timeline',
      value: IS_CI ? false : true,
    }),
    hidecontainer: withParam({
      id: 'hidecontainer',
      label: 'Hide Container',
      value: true,
    }),
    noTryCatch: withParam({
      id: 'noTryCatch',
      label: 'No Try/Catch',
      value: false,
      reload: true,
    }),
  },
  totals: {
    tests: 0,
    primaryModules: 0,
    modules: 0,
    skipped: 0,
    todo: 0,
  },
  _current: null,
};

let currentModule: ModuleInfo<TestContext>;
let isResolvingGlobalHooks = false;
export const HooksDelegate = {
  beforeEach<TC extends TestContext>(cb: HooksCallback<TC>): void {
    if (isResolvingGlobalHooks) {
      // @ts-expect-error TS poorly handles subtype constraints
      Config.globalHooks.beforeEach.push(cb);
    } else {
      // @ts-expect-error TS poorly handles subtype constraints
      currentModule.config.beforeEach.push(cb);
    }
  },
  afterEach<TC extends TestContext>(cb: HooksCallback<TC>): void {
    if (isResolvingGlobalHooks) {
      // @ts-expect-error TS poorly handles subtype constraints
      Config.globalHooks.afterEach.push(cb);
    } else {
      // @ts-expect-error TS poorly handles subtype constraints
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
};

export function getCurrentModule<TC extends TestContext>(): ModuleInfo<TC> {
  return currentModule;
}

export function setCurrentModule<TC extends TestContext>(module: ModuleInfo<TC>): void {
  // @ts-expect-error TS poorly handles subtype constraints
  currentModule = module;
}

export function setupGlobalHooks<TC extends TestContext>(cb: (hooks: GlobalHooks<TC>) => void): void {
  isResolvingGlobalHooks = true;
  cb(HooksDelegate);
  isResolvingGlobalHooks = false;
}

export type ConfigOptions = {
  org: string;
  package: string;
  concurrency: number;
  useConcurrency: boolean;
  instrument: boolean;
  noTryCatch: boolean;
  debug: boolean;
  groupLogs: boolean;
  memory: boolean;
  hidecontainer: boolean;
  timeline: boolean;
  hideReport: boolean;
  params: Record<string, ParamConfig>;
  useTestem: boolean;
  useDiagnostic: boolean;
  testTimeoutMs: number;
};
const configOptions = [
  'useConcurrency',
  'noTryCatch',
  'instrument',
  'hideReport',
  'timeline',
  'memory',
  'groupLogs',
  'debug',
  'hidecontainer',
] as const;
export function configure(options: Partial<ConfigOptions>): void {
  if (options.useTestem && options.useDiagnostic) {
    throw new Error(
      `Cannot use both Testem and Diagnostic at the same time. Please remove one of these options or set it to false.`
    );
  }
  if ('useTestem' in options && typeof options.useTestem === 'boolean') {
    Config.useTestem = options.useTestem;
    Config.useDiagnostic = !options.useTestem;
  }
  if ('useDiagnostic' in options && typeof options.useDiagnostic === 'boolean') {
    Config.useDiagnostic = options.useDiagnostic;
    Config.useTestem = !options.useDiagnostic;
  }

  if ('concurrency' in options && typeof options.concurrency === 'number') {
    Config.concurrency = options.concurrency;
  }

  Config.name = { org: '@warp-drive/', package: 'diagnostic' };

  if ('org' in options && typeof options.org === 'string') {
    Config.name.org = options.org;
  } else if ('package' in options && typeof options.package === 'string') {
    Config.name.org = '';
  }
  if ('package' in options && typeof options.package === 'string') {
    Config.name.package = options.package;
  } else if ('org' in options && typeof options.org === 'string') {
    Config.name.package = '';
  }

  configOptions.forEach((key) => {
    if (key in options && typeof options[key] === 'boolean') {
      const param = Config.params[key];
      // only copy over if not overridden by the URL
      if (param.value === param.defaultValue) {
        Config.params[key].value = options[key];
      }
    }
    // don't allow setting these params via configure
    if (options.params?.[key]) {
      delete options.params[key];
    }
  });

  Config.testTimeoutMs = options.testTimeoutMs ?? 0;

  // copy over any remaining params
  Object.assign(Config.params, options.params);
}

export function getSettings(): {
  name: {
    org: string;
    package: string;
  };
  useTestem: boolean;
  useDiagnostic: boolean;
  concurrency: number;
  params: {
    useConcurrency: ParamConfig;
    noTryCatch: ParamConfig;
    instrument: ParamConfig;
    hideReport: ParamConfig;
    memory: ParamConfig;
    groupLogs: ParamConfig;
    debug: ParamConfig;
    hidecontainer: ParamConfig;
    search: ParamConfig;
  };
} {
  return {
    name: Config.name,
    useTestem: Config.useTestem,
    useDiagnostic: Config.useDiagnostic,
    concurrency: Config.concurrency,
    params: Config.params,
  };
}

export function instrument() {
  return (Config.params.instrument.value || null) as unknown as PerformanceMark;
}

export function groupLogs(): string | boolean {
  return Config.params.groupLogs.value;
}

// 0 - stop
// 1 - start
// 2 - back
// 3 - forward
// 4 - restart
export function updateSuiteState(value: number): void {}
export function updateConfigValue<T extends ParamConfig>(paramConfig: T, newValue: T['value']): void {
  // update our value
  paramConfig.value = newValue;
  // update the URL
  if (paramConfig.value === paramConfig.defaultValue) {
    urlParams.delete(paramConfig.id);
  } else if (typeof paramConfig.value === 'boolean') {
    urlParams.set(paramConfig.id, paramConfig.value ? 'true' : 'false');
  }

  history.replaceState(null, '', url.toString());

  // if the config specifies reload, reload
  if (paramConfig.reload) {
    location.reload();
  }
}
