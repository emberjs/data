import { Assert, ModuleInfo, GlobalHooks, HooksCallback, TestInfo, ModuleCallback, TestCallback, OrderedMap, GlobalCallback } from "./-types";

const Config: { globalHooks: {
  beforeEach: HooksCallback[];
  afterEach: HooksCallback[];
  beforeModule: GlobalCallback[];
  afterModule: GlobalCallback[];
  onSuiteStart: GlobalCallback[];
  onSuiteFinish: GlobalCallback[];
} } = {
  globalHooks: {
    beforeEach: [],
    afterEach: [],
    beforeModule: [],
    afterModule: [],
    onSuiteStart: [],
    onSuiteFinish: []
  }
}
const Modules: OrderedMap<ModuleInfo> = {
  byName: new Map(),
  byOrder: []
}
let currentModule: ModuleInfo;
let isResolvingGlobalHooks = false;

const HooksDelegate = {
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

export function setupGlobalHooks(cb: (hooks: GlobalHooks) => void): void {
  isResolvingGlobalHooks = true;
  cb(HooksDelegate);
  isResolvingGlobalHooks = false;
}

export function module(name: string, cb: ModuleCallback): void {
  let parentModule = null;
  let moduleName = name;
  if (currentModule) {
    moduleName = `${currentModule.name} > ${name}`;
    parentModule = currentModule;
  }

  assert(`Cannot add the same module name twice: ${moduleName}`, !Modules.byName.has(moduleName));
  const moduleConfig = {
    beforeEach: [],
    afterEach: [],
    beforeModule: [],
    afterModule: []
  };
  const tests: OrderedMap<TestInfo> = { byName: new Map(), byOrder: [] };
  const modules: OrderedMap<ModuleInfo> = { byName: new Map(), byOrder: [] };
  const moduleInfo = {
    moduleName,
    name,
    cb,
    config: moduleConfig,
    tests,
    modules,
    parent: parentModule,
  };

  currentModule = moduleInfo;

  if (parentModule) {
    parentModule.modules.byName.set(name, moduleInfo);
    parentModule.modules.byOrder.push(moduleInfo);
  } else {
    Modules.byName.set(name, moduleInfo);
    Modules.byOrder.push(moduleInfo);
  }

  cb(HooksDelegate);
  currentModule = parentModule as unknown as ModuleInfo;
}

function assert(message: string, test: unknown): asserts test {
  if (!test) {
    throw new Error(message);
  }
}

export function test(name: string, cb: TestCallback): void {
  assert(`Cannot add a test outside of a module`, !!currentModule);
  assert(`Cannot add the same test name twice: ${name}`, !currentModule.tests.byName.has(name));

  const testInfo = {
    name,
    cb,
    skip: false,
    todo: false,
    module: currentModule,
  };

  currentModule.tests.byName.set(name, testInfo);
  currentModule.tests.byOrder.push(testInfo);
}

export function todo(name: string, cb: TestCallback): void {
  assert(`Cannot add a test outside of a module`, !!currentModule);
  assert(`Cannot add the same test name twice: ${name}`, !currentModule.tests.byName.has(name));

  const testInfo = {
    name,
    cb,
    skip: false,
    todo: true,
    module: currentModule,
  };

  currentModule.tests.byName.set(name, testInfo);
  currentModule.tests.byOrder.push(testInfo);
}

export function skip(name: string, cb: TestCallback): void {
  assert(`Cannot add a test outside of a module`, !!currentModule);
  assert(`Cannot add the same test name twice: ${name}`, !currentModule.tests.byName.has(name));

  const testInfo = {
    name,
    cb,
    skip: true,
    todo: false,
    module: currentModule,
  };

  currentModule.tests.byName.set(name, testInfo);
  currentModule.tests.byOrder.push(testInfo);
}

function getChain(module: ModuleInfo, parents: ModuleInfo[] | null, prop: 'beforeEach' | 'afterEach'): HooksCallback[] {
  const chain: HooksCallback[] = [];
  if (parents) {
    for (const parent of parents) {
      if (parent.config[prop].length) {
        chain.push(...parent.config[prop]);
      }
    }
  }
  if (module.config[prop].length) {
    chain.push(...module.config[prop]);
  }

  if (prop === 'afterEach') {
    chain.reverse();
  }

  return chain;
}

const Reporter = {
  report(event: unknown): void {}
}

async function runTest(beforeChain: HooksCallback[], test: TestInfo, afterChain: HooksCallback[]) {
  const testContext = {};
  const Assert = {} as Assert;

  if (test.skip) {
    Reporter.report({ type: 'skip', test });
    return;
  }

  for (const hook of beforeChain) {
    await hook.call(testContext, Assert);
  }

  await test.cb.call(testContext, Assert);

  for (const hook of afterChain) {
    await hook.call(testContext, Assert);
  }
}

async function runModule(module: ModuleInfo, parents: ModuleInfo[] | null) {
  for (const hook of Config.globalHooks.beforeModule) {
    await hook();
  }

  for (const hook of module.config.beforeModule) {
    await hook();
  }

  // run tests
  const beforeChain = getChain(module, parents, 'beforeEach');
  const afterChain = getChain(module, parents, 'afterEach');
  for (const test of module.tests.byOrder) {
    await runTest(beforeChain, test, afterChain);
  }

  // run modules

  for (const hook of module.config.afterModule) {
    await hook();
  }

  for (const hook of Config.globalHooks.afterModule) {
    await hook();
  }
}


export async function start() {
  for (const hook of Config.globalHooks.onSuiteStart) {
    await hook();
  }

  for (const module of Modules.byOrder) {
    await runModule(module, null);
  }

  for (const hook of Config.globalHooks.onSuiteFinish) {
    await hook();
  }
}
