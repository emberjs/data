import { Config } from '../../internals/config';
import type { HelperContext } from './-helper-context';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Hook = (...args: any[]) => void | Promise<void>;
export type HookLabel = 'start' | 'end' | 'targetFound';
export type HookUnregister = {
  unregister: () => void;
};

const registeredHooks = new Map<string, Set<Hook>>();

/**
 * @private
 * @param {string} helperName The name of the test helper in which to run the hook.
 * @param {string} label A label to help identify the hook.
 * @returns {string} The compound key for the helper.
 */
function getHelperKey(helperName: string, label: string): string {
  return `${helperName}:${label}`;
}

/**
 * Registers a function to be run during the invocation of a test helper.
 *
 * @param {string} helperName The name of the test helper in which to run the hook.
 *                            Test helper names include `blur`, `click`, `doubleClick`, `fillIn`,
 *                            `fireEvent`, `focus`, `render`, `scrollTo`, `select`, `tab`, `tap`, `triggerEvent`,
 *                            `triggerKeyEvent`, `typeIn`, and `visit`.
 * @param {string} label A label to help identify the hook. Built-in labels include `start`, `end`,
 *                       and `targetFound`, the former designating either the start or end of
 *                       the helper invocation.
 * @param {Function} hook The hook function to run when the test helper is invoked.
 * @returns {HookUnregister} An object containing an `unregister` function that unregisters
 *                           the specific hook initially registered to the helper.
 * @example
 * <caption>
 *   Registering a hook for the `end` point of the `click` test helper invocation
 * </caption>
 *
 * const hook = registerHook('click', 'end', () => {
 *   console.log('Running `click:end` test helper hook');
 * });
 *
 * // Unregister the hook at some later point in time
 * hook.unregister();
 */
export function registerHook(helperName: string, label: HookLabel, hook: Hook): HookUnregister {
  const helperKey = getHelperKey(helperName, label);
  let hooksForHelper = registeredHooks.get(helperKey);

  if (hooksForHelper === undefined) {
    hooksForHelper = new Set<Hook>();
    registeredHooks.set(helperKey, hooksForHelper);
  }

  hooksForHelper.add(hook);

  return {
    unregister() {
      hooksForHelper.delete(hook);
    },
  };
}

function registerStarHook(hook: Hook): HookUnregister {
  let hooksForHelper = registeredHooks.get('*');

  if (hooksForHelper === undefined) {
    hooksForHelper = new Set<Hook>();
    registeredHooks.set('*', hooksForHelper);
  }

  hooksForHelper.add(hook);

  return {
    unregister() {
      hooksForHelper.delete(hook);
    },
  };
}

/**
 * Runs all hooks registered for a specific test helper.
 *
 * @param {string} helperName The name of the test helper in which to run the hook.
 *                            Test helper names include `blur`, `click`, `doubleClick`, `fillIn`,
 *                            `fireEvent`, `focus`, `render`, `scrollTo`, `select`, `tab`, `tap`, `triggerEvent`,
 *                            `triggerKeyEvent`, `typeIn`, and `visit`.
 * @param {string} label A label to help identify the hook. Built-in labels include `start`, `end`,
 *                       and `targetFound`, the former designating either the start or end of
 *                       the helper invocation.
 * @param {unknown[]} args Any arguments originally passed to the test helper.
 * @returns {Promise<void>} A promise representing the serial invocation of the hooks.
 */
export function runHooks(helperName: string, label: HookLabel, ...args: unknown[]): Promise<void> {
  const hooks = registeredHooks.get(getHelperKey(helperName, label)) || new Set<Hook>();
  const promises: Array<void | Promise<void>> = [];

  const starHooks = registeredHooks.get('*') || new Set<Hook>();
  starHooks.forEach((hook) => {
    const hookResult = hook(helperName, label);

    promises.push(hookResult);
  });

  hooks.forEach((hook) => {
    const hookResult = hook(...args);

    promises.push(hookResult);
  });

  return Promise.all(promises).then(() => {});
}

export const TEST_CONTEXT: unique symbol = Symbol('scope');

let EventSeries = 0;
export async function withHooks<T = Promise<void>>(options: {
  scope: HelperContext;
  name: string;
  render: boolean;
  cb: () => T;
  args?: unknown[];
}): Promise<Awaited<T>> {
  if (Config.params.timeline.value) {
    const series = `traceId:${EventSeries++}`;
    const token = registerStarHook((type: string, subtype: string) => {
      options.scope.assert.pushInteraction({ type, subtype, series });
    });
    if (options.render) {
      return await options.scope.config.render(() =>
        runHooks(options.name, 'start', ...(options.args ?? []))
          .then(options.cb)
          .finally(() => runHooks(options.name, 'end', ...(options.args ?? [])))
          .finally(token.unregister)
      );
    }
    return await Promise.resolve()
      .then(() => runHooks(options.name, 'start', ...(options.args ?? [])))
      .then(options.cb)
      .finally(() => runHooks(options.name, 'end', ...(options.args ?? [])))
      .finally(token.unregister);
  }
  if (options.render) {
    return await options.scope.config.render(() =>
      runHooks(options.name, 'start', ...(options.args ?? []))
        .then(options.cb)
        .finally(() => runHooks(options.name, 'end', ...(options.args ?? [])))
    );
  }
  return await Promise.resolve()
    .then(() => runHooks(options.name, 'start', ...(options.args ?? [])))
    .then(options.cb)
    .finally(() => runHooks(options.name, 'end', ...(options.args ?? [])));
}
