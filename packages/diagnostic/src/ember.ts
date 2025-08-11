import { run } from '@ember/runloop';
import { precompileTemplate } from '@ember/template-compilation';
import type { SetupContextOptions, TestContext as EmberTestContext } from '@ember/test-helpers';
import {
  getTestMetadata,
  hasCalledSetupRenderingContext,
  rerender,
  settled,
  setupContext,
  teardownContext,
} from '@ember/test-helpers';
import type { Owner } from '@ember/test-helpers/build-owner';

import { setup } from 'qunit-dom';

import AbstractTestLoader from 'ember-cli-test-loader/test-support/index';

import { module as _module, skip as _skip, test as _test, todo as _todo } from './-define';
import isComponent from './-ember/is-component';
import type { Hooks, ModuleCallback, TestCallback } from './-types';
import type { TestHelpers } from './helpers/install';
import { buildHelpers } from './helpers/install';
import { setupGlobalHooks } from './internals/config';
import { PublicTestInfo } from './internals/run';
import type { SpecTestContext } from './spec';

// const OUTLET_TEMPLATE = hbs`{{outlet}}`;
const INVOKE_PROVIDED_COMPONENT = precompileTemplate('<this.ProvidedComponent />', { strictMode: false }) as object;

export interface TestContext extends EmberTestContext {
  element: HTMLElement;
  h: TestHelpers;
}
export interface RenderingTestContext extends TestContext {
  [hasCalledSetupRenderingContext]: boolean;
  render(template: object): Promise<void>;
}

export function module<TC extends TestContext = TestContext>(name: string, cb: ModuleCallback<TC>): void {
  return _module<TC>(name, cb);
}

export function test<TC extends TestContext = TestContext>(name: string, cb: TestCallback<TC>): void {
  return _test(name, cb);
}

export function skip<TC extends TestContext = TestContext>(name: string, cb: TestCallback<TC>): void {
  return _skip(name, cb);
}

export function todo<TC extends TestContext = TestContext>(name: string, cb: TestCallback<TC>): void {
  return _todo(name, cb);
}

type RegistryType = 'component' | 'helper' | 'modifier' | 'service' | 'template' | 'route' | 'controller' | 'model';
type RegistryKey =
  | `${RegistryType}:${string}`
  | '-environment:main'
  | 'event_dispatcher:main'
  | 'outlet-view:main'
  | '-top-level-view:main'
  | 'view:-outlet';

type FullOwner = Owner & {
  factoryFor: (name: RegistryKey) => { create(args: object): unknown };
  lookup: (name: RegistryKey) => unknown;
  register: (name: RegistryKey, value: unknown) => void;
};

// fix bug with embroider/webpack/auto-import and test-loader
// prettier-ignore
// @ts-expect-error
const CLITestLoader: typeof AbstractTestLoader = AbstractTestLoader.default
  // @ts-expect-error
  ? AbstractTestLoader.default as typeof AbstractTestLoader
  : AbstractTestLoader;

export function setupTest<TC extends TestContext>(hooks: Hooks<TC>, opts?: SetupContextOptions): void {
  const options = { waitForSettled: false, ...opts };

  hooks.beforeEach(async function (assert) {
    const testMetadata = getTestMetadata(this);
    testMetadata.framework = 'qunit';

    await setupContext(this, Object.assign({}, options));

    assert.dom = () => {
      throw new Error('You must use `setupRenderingTest` not `setupTest` before using `assert.dom`');
    };

    let helpers: TestHelpers | null = null;
    Object.defineProperty(this, 'h', {
      configurable: true,
      enumerable: true,
      get() {
        if (!helpers) {
          helpers = buildHelpers(this, {
            render: async <T>(fn: () => T): Promise<Awaited<T>> => {
              const result = await fn();
              await settled();
              return result;
            },
            rerender: rerender,
            settled: settled,
          });
        }
        return helpers;
      },
    });
  });

  hooks.afterEach(function (this: TestContext) {
    return teardownContext(this, options);
  });
}

type Outlet = { appendTo: (element: Element) => void; setOutletState: (state: object) => void };

function upgradeContext(context: TestContext): asserts context is RenderingTestContext & {
  [PublicTestInfo]: { id: string; name: string };
  rootElement: HTMLDivElement;
} {
  (context as unknown as RenderingTestContext)[hasCalledSetupRenderingContext] = true;
}

function upgradeOwner(owner: Owner): asserts owner is FullOwner {}

declare module './-types' {
  interface Diagnostic {
    dom: Assert['dom'];
  }
}

export function setupRenderingTest<TC extends TestContext>(hooks: Hooks<TC>, options: SetupContextOptions = {}): void {
  const _options = { waitForSettled: false, ...options } as unknown as SetupContextOptions & {
    rootElement: HTMLDivElement;
    waitForSettled: boolean;
  };

  hooks.beforeEach(async function (assert) {
    upgradeContext(this);

    this.render = (template: object) => render(this, template);
    const opts = Object.assign({}, _options);
    const testMetadata = getTestMetadata(this);
    testMetadata.setupTypes.push('setupRenderingContext');
    testMetadata.framework = 'qunit';

    const container = document.getElementById('ember-testing');
    const testContainer = document.createElement('div');
    testContainer.className = 'ember-test-container';
    container!.appendChild(testContainer);
    opts.rootElement = testContainer;
    this.rootElement = testContainer;

    setup(assert);
    // @ts-expect-error this is private
    assert.dom.rootElement = testContainer;

    await setupContext(this, opts);

    const { owner } = this;
    upgradeOwner(owner);

    const OutletView = owner.factoryFor('view:-outlet')!;
    const environment = owner.lookup('-environment:main');
    const template = owner.lookup('template:-outlet');
    testContainer.setAttribute('test-id', this[PublicTestInfo].id);
    testContainer.setAttribute('test-name', this[PublicTestInfo].name);

    const toplevelView = OutletView.create({
      template,
      environment,
    }) as Outlet;

    owner.register('-top-level-view:main', {
      create() {
        return toplevelView;
      },
    });
    toplevelView.appendTo(testContainer);

    Object.defineProperty(this, 'element', {
      configurable: true,
      enumerable: true,
      value: testContainer,
      writable: false,
    });

    let helpers: TestHelpers | null = null;
    Object.defineProperty(this, 'h', {
      configurable: true,
      enumerable: true,
      get() {
        if (!helpers) {
          helpers = buildHelpers(this, {
            render: async <T>(fn: () => T): Promise<Awaited<T>> => {
              const result = await fn();
              await settled();
              return result;
            },
            rerender: rerender,
            settled: settled,
          });
        }
        return helpers;
      },
    });
  });

  hooks.afterEach(async function (this: TestContext) {
    await teardownContext(this, _options);
    upgradeContext(this);
    this.rootElement.remove();
  });
}

let moduleLoadFailures: Error[] = [];

class TestLoader extends CLITestLoader {
  moduleLoadFailure(moduleName: string, error: Error) {
    moduleLoadFailures.push(error);
  }
}

/**
   Load tests following the default patterns:

   * The module name ends with `-test`
   * The module name ends with `.jshint`

 */
function loadTests() {
  TestLoader.load();
}

export function configure(): void {
  setupGlobalHooks((hooks) => {
    hooks.onSuiteFinish(() => {
      const length = moduleLoadFailures.length;

      try {
        if (length === 0) {
          // do nothing
        } else if (length === 1) {
          throw moduleLoadFailures[0];
        } else {
          throw new Error('\n' + moduleLoadFailures.join('\n'));
        }
      } finally {
        // ensure we release previously captured errors.
        moduleLoadFailures = [];
      }
    });
  });

  loadTests();
}

export function isRenderingTestContext(context: TestContext): context is RenderingTestContext {
  return hasCalledSetupRenderingContext in context;
}

function isTemplateFunction(template: unknown): template is (owner: Owner) => object {
  return typeof template === 'function';
}

function lookupTemplate(owner: Owner, templateFullName: RegistryKey): object | undefined {
  upgradeOwner(owner);
  const template = owner.lookup(templateFullName) as object | ((owner: Owner) => object) | undefined;
  if (isTemplateFunction(template)) return template(owner);
  return template;
}

function lookupOutletTemplate(owner: Owner): object {
  upgradeOwner(owner);
  const OutletTemplate = lookupTemplate(owner, 'template:-outlet');
  if (!OutletTemplate) {
    throw new Error(`Could not find -outlet template`);
    // owner.register('template:-outlet', OUTLET_TEMPLATE);
    // OutletTemplate = lookupTemplate(owner, 'template:-outlet');
  }

  return OutletTemplate;
}

let templateId = 0;
// eslint-disable-next-line @typescript-eslint/require-await
export async function render(context: TestContext, template: object): Promise<void> {
  if (!template) {
    throw new Error('you must pass a template to `render()`');
  }

  if (!context || !isRenderingTestContext(context)) {
    throw new Error('Cannot call `render` without having first called `setupRenderingContext`.');
  }

  const { owner } = context;
  upgradeOwner(owner);
  const testMetadata = getTestMetadata(context);
  testMetadata.usedHelpers.push('render');

  // SAFETY: this is all wildly unsafe, because it is all using private API.
  // At some point we should define a path forward for this kind of internal
  // API. For now, just flagging it as *NOT* being safe!

  const toplevelView = owner.lookup('-top-level-view:main') as Outlet;
  const OutletTemplate = lookupOutletTemplate(owner);

  let controllerContext: object = context;
  if (isComponent(template)) {
    controllerContext = {
      ProvidedComponent: template,
    };
    template = INVOKE_PROVIDED_COMPONENT;
  }

  templateId += 1;
  const templateFullName = `template:-undertest-${templateId}` as const;
  owner.register(templateFullName, template);
  const finalTemplate = lookupTemplate(owner, templateFullName);

  const outletState = {
    render: {
      owner,
      into: undefined,
      outlet: 'main',
      name: 'application',
      controller: undefined,
      ViewClass: undefined,
      template: OutletTemplate,
    },

    outlets: {
      main: {
        render: {
          owner,
          into: undefined,
          outlet: 'main',
          name: 'index',
          controller: controllerContext,
          ViewClass: undefined,
          template: finalTemplate,
          outlets: {},
        },
        outlets: {},
      },
    },
  };

  run(() => {
    toplevelView.setOutletState(outletState);
  });
}

export function useEmber(): { name: 'ember'; setup<TC extends SpecTestContext<object>>(hooks: Hooks<TC>): void } {
  return {
    name: 'ember',
    setup: setupRenderingTest,
  } as { name: 'ember'; setup<TC extends SpecTestContext<object>>(hooks: Hooks<TC>): void };
}
