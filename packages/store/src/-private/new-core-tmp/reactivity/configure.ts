import { deprecate } from '@ember/debug';

import { dependencySatisfies, importSync, macroCondition } from '@embroider/macros';

import { DEPRECATE_TRACKING_PACKAGE } from '@warp-drive/build-config/deprecations';
import { assert } from '@warp-drive/build-config/macros';

import { ARRAY_SIGNAL, type SignalRef } from './internal';

type MemoRef = unknown;
/**
 * The hooks which MUST be configured in order to use this library,
 * either for framework specfic signals or TC39 signals.
 *
 * Support for multiple frameworks simultaneously can be done via
 * this abstraction by returning multiple signals from the `createSignal`
 * method, and consuming the correct one via the correct framework via
 * the `consumeSignal` and `notifySignal` methods.
 */
export interface SignalHooks<T = SignalRef, M = MemoRef> {
  createSignal: (obj: object, key: string | symbol) => T;
  consumeSignal: (signal: T) => void;
  notifySignal: (signal: T) => void;
  compat?: (desc: PropertyDescriptor) => PropertyDescriptor;
  createMemo: (fn: () => unknown) => M;
  getMemoValue: (memo: M) => unknown;
}

export interface HooksOptions {
  wellknown: {
    Array: symbol | string;
  };
}

let signalHooks: SignalHooks | null = null;

/**
 * The public API for configuring the signal hooks.
 *
 * @internal
 */
export function setupSignals<T>(buildConfig: (options: HooksOptions) => SignalHooks<T>) {
  assert(`Cannot override configured signal hooks`, signalHooks === null);
  const hooks = buildConfig({
    wellknown: {
      Array: ARRAY_SIGNAL,
    },
  });
  signalHooks = hooks as SignalHooks;
}

/**
 * Internal method for consuming the configured `createSignal` hook
 *
 * @internal
 */
export function createSignal(obj: object, key: string | symbol): SignalRef {
  assert(`Signal hooks not configured`, signalHooks !== null);
  return signalHooks.createSignal(obj, key);
}

/**
 * Internal method for consuming the configured `consumeSignal` hook
 *
 * @internal
 */
export function consumeSignal(signal: SignalRef) {
  assert(`Signal hooks not configured`, signalHooks !== null);
  return signalHooks.consumeSignal(signal);
}

/**
 * Internal method for consuming the configured `notifySignal` hook
 *
 * @internal
 */
export function notifySignal(signal: SignalRef) {
  assert(`Signal hooks not configured`, signalHooks !== null);
  return signalHooks.notifySignal(signal);
}

export function isArraySignal(key: string | symbol): boolean {
  return key === ARRAY_SIGNAL;
}

export function compat(target: object, key: string | symbol, desc: PropertyDescriptor): PropertyDescriptor;
export function compat(desc: PropertyDescriptor): PropertyDescriptor;
export function compat(
  target: object | PropertyDescriptor,
  key?: string | symbol,
  desc?: PropertyDescriptor
): PropertyDescriptor {
  assert(`Signal hooks not configured`, signalHooks !== null);
  const actualDesc = arguments.length === 3 ? desc! : (target as PropertyDescriptor);
  if (!signalHooks.compat) {
    return actualDesc;
  }
  return signalHooks.compat(actualDesc);
}

export function createMemo<T>(fn: () => T): unknown {
  assert(`Signal hooks not configured`, signalHooks !== null);
  return signalHooks.createMemo(fn);
}

export function getMemoValue(memo: unknown): unknown {
  assert(`Signal hooks not configured`, signalHooks !== null);
  return signalHooks.getMemoValue(memo);
}

if (DEPRECATE_TRACKING_PACKAGE) {
  let hasEmberDataTracking = false;
  if (macroCondition(dependencySatisfies('@ember-data/tracking', '*'))) {
    hasEmberDataTracking = true;
    // @ts-expect-error
    const { buildSignalConfig } = importSync('@ember-data/tracking');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    setupSignals(buildSignalConfig);
  }

  const message = [
    `Using WarpDrive with EmberJS requires configuring it to use Ember's reactivity system.`,
    `Previously this was provided by installing the package '@ember-data/tracking', but this package is now deprecated.`,
    ``,
    `To resolve this deprecation, follow these steps:`,
    hasEmberDataTracking
      ? `- remove "@ember-data/tracking" and (if needed) "@ember-data-types/tracking" from your project in both your package.json and tsconfig.json`
      : false,
    `- add "@warp-drive/ember" to your project in both your package.json and tsconfig.json`,
    '- add the following import to your app.js file:',
    '',
    '\t```',
    `\timport '@warp-drive/ember/install';`,
    '\t```',
    ``,
    '- mark this deprecation as resolved in your project by adding the following to your WarpDrive config in ember-cli-build.js:',
    '',
    '\t```',
    '\tconst { setConfig } = await import("@warp-drive/build-config");',
    '\tsetConfig(app, __dirname, {',
    '\t  deprecations: {',
    '\t    DEPRECATE_TRACKING_PACKAGE: false,',
    '\t  },',
    '\t});',
    '\t```',
    ``,
    `For more information, see the Package Unification RFC: https://rfcs.emberjs.com/id/1075-warp-drive-package-unification/`,
  ]
    .filter((l) => l !== false)
    .join('\n');

  deprecate(message, false, {
    id: 'warp-drive.deprecate-tracking-package',
    until: '6.0.0',
    for: 'warp-drive',
    since: {
      enabled: '5.3.4',
      available: '4.13',
    },
    url: 'https://deprecations.emberjs.com/id/warp-drive.deprecate-tracking-package',
  });
}
