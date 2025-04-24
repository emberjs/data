import { tagForProperty } from '@ember/-internals/metal';
// temporary so we can remove the glimmer and ember imports elsewhere
// eslint-disable-next-line no-restricted-imports
import { dependentKeyCompat as compat } from '@ember/object/compat';
import { consumeTag, dirtyTag } from '@glimmer/validator';

import { DEPRECATE_COMPUTED_CHAINS } from '@warp-drive/build-config/deprecations';
import { DEBUG } from '@warp-drive/build-config/env';
import { getOrSetGlobal } from '@warp-drive/core-types/-private';

type Tag = { ref: null; t: boolean };

function maybeConsume(tag: ReturnType<typeof tagForProperty> | null): void {
  if (tag) {
    consumeTag(tag);
  }
}

function maybeDirty(tag: ReturnType<typeof tagForProperty> | null): void {
  if (tag) {
    // @ts-expect-error - we are using Ember's Tag not Glimmer's
    dirtyTag(tag);
  }
}

/**
 * If there is a current transaction, ensures that the relevant tag (and any
 * array computed chains symbols, if applicable) will be consumed during the
 * transaction.
 *
 * If there is no current transaction, will consume the tag(s) immediately.
 *
 * @internal
 * @param obj
 */
export function subscribe(obj: Tag | Signal): void {
  if ('tag' in obj) {
    if (DEPRECATE_COMPUTED_CHAINS) {
      maybeConsume(obj['[]']);
      maybeConsume(obj['@length']);
    }
    consumeTag(obj.tag);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    obj.ref;
  }
}

export function invalidateSignal(obj: Tag | Signal): void {
  if (DEBUG) {
    try {
      if ('tag' in obj) {
        if (DEPRECATE_COMPUTED_CHAINS) {
          maybeDirty(obj['[]']);
          maybeDirty(obj['@length']);
        }
        // @ts-expect-error - we are using Ember's Tag not Glimmer's
        dirtyTag(obj.tag);
      } else {
        obj.ref = null;
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (e.message.includes('You attempted to update `undefined`')) {
          // @ts-expect-error
          const key = `<${obj._debug_base}>.${obj.key}`;
          e.message = e.message.replace('You attempted to update `undefined`', `You attempted to update ${key}`);
          e.stack = e.stack?.replace('You attempted to update `undefined`', `You attempted to update ${key}`);

          const lines = e.stack?.split(`\n`);
          const finalLines: string[] = [];
          let lastFile: string | null = null;

          lines?.forEach((line) => {
            if (line.trim().startsWith('at ')) {
              // get the last string in the line which contains the code source location
              const location = line.split(' ').at(-1)!;
              // remove the line and char offset info

              if (location.includes(':')) {
                const parts = location.split(':');
                parts.pop();
                parts.pop();
                const file = parts.join(':');
                if (file !== lastFile) {
                  lastFile = file;
                  finalLines.push('');
                }
              }
              finalLines.push(line);
            }
          });

          const splitstr = '`undefined` was first used:';
          const parts = e.message.split(splitstr);
          parts.splice(1, 0, `Original Stack\n=============\n${finalLines.join(`\n`)}\n\n\`${key}\` was first used:`);

          e.message = parts.join('');
        }
      }
      throw e;
    }
  } else {
    if ('tag' in obj) {
      if (DEPRECATE_COMPUTED_CHAINS) {
        maybeDirty(obj['[]']);
        maybeDirty(obj['@length']);
      }
      // @ts-expect-error - we are using Ember's Tag not Glimmer's
      dirtyTag(obj.tag);
    } else {
      obj.ref = null;
    }
  }
}

export const Signals = getOrSetGlobal('Signals', Symbol('Signals'));

/**
 *  use to add a signal property to the prototype of something.
 *
 *  First arg is the thing to define on
 *  Second arg is the property name
 *  Third agg is the initial value of the property if any.
 *
 *  for instance
 *
 *  ```ts
 *  class Model {}
 *  defineSignal(Model.prototype, 'isLoading', false);
 *  ```
 *
 *  This is sort of like using a stage-3 decorator but works today
 *  while we are still on legacy decorators.
 *
 *  e.g. it is equivalent to
 *
 *  ```ts
 *  class Model {
 *    @signal accessor isLoading = false;
 *  }
 *  ```
 *
 *  @internal
 */
export function defineSignal<T extends object>(obj: T, key: string, v?: unknown) {
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: false,
    get(this: T & { [Signals]: Map<string, Signal> }) {
      const signals = (this[Signals] = this[Signals] || new Map());
      const existing = signals.has(key);
      const _signal = entangleSignal(signals, this, key);
      if (!existing && v !== undefined) {
        _signal.lastValue = v;
      }
      return _signal.lastValue;
    },
    set(this: T & { [Signals]: Map<string, Signal> }, value: unknown) {
      const signals = (this[Signals] = this[Signals] || new Map());
      let _signal = signals.get(key);
      if (!_signal) {
        _signal = createSignal(this, key);
        signals.set(key, _signal);
      }
      if (_signal.lastValue !== value) {
        _signal.lastValue = value;
        invalidateSignal(_signal);
      }
    },
  });
}

export function defineSubscription<T extends object>(obj: T, key: string, desc: PropertyDescriptor) {
  const options = Object.assign(
    { enumerable: true, configurable: false },
    subscribed(obj, key as keyof T & string, desc)
  );
  Object.defineProperty(obj, key, options);
}

export interface Signal {
  /**
   * Key on the associated object
   * @internal
   */
  key: string;
  _debug_base?: string;

  /**
   * Whether to "bust" the lastValue cache
   * @internal
   */
  shouldReset: boolean;

  /**
   * The reason this signal is dirty
   *
   * @internal
   */
  reason: string | null;

  /**
   * The framework specific "signal" e.g. glimmer "tracked"
   * or starbeam "cell" to consume/invalidate when appropriate.
   *
   * @internal
   */
  tag: ReturnType<typeof tagForProperty>;

  /**
   * In classic ember, arrays must entangle a `[]` symbol
   * in addition to any other tag in order for array chains to work.
   *
   * Note, this symbol MUST be the one that ember itself generates
   *
   * @internal
   */
  '[]': ReturnType<typeof tagForProperty> | null;
  /**
   * In classic ember, arrays must entangle a `@length` symbol
   * in addition to any other tag in order for array chains to work.
   *
   * Note, this symbol MUST be the one that ember itself generates
   *
   * @internal
   */
  '@length': ReturnType<typeof tagForProperty> | null;

  /**
   * The lastValue computed for this signal when
   * a signal is also used for storage.
   * @internal
   */
  lastValue: unknown;
}

export function createArrayTags<T extends object>(obj: T, signal: Signal) {
  if (DEPRECATE_COMPUTED_CHAINS) {
    signal['[]'] = tagForProperty(obj, '[]');
    signal['@length'] = tagForProperty(obj, 'length');
  }
}

/**
 * Create a signal for the key/object pairing.
 *
 * @internal
 * @param obj Object we're creating the signal on
 * @param key Key to create the signal for
 * @return the signal
 */
export function createSignal<T extends object>(obj: T, key: string): Signal {
  const _signal: Signal = {
    key,
    tag: tagForProperty(obj, key),
    reason: null,

    shouldReset: false,
    '[]': null,
    '@length': null,
    lastValue: undefined,
  };

  if (DEBUG) {
    function tryGet<T1 = string>(prop: string): T1 | undefined {
      try {
        return obj[prop as keyof typeof obj] as unknown as T1;
      } catch {
        return;
      }
    }
    const modelName =
      tryGet('$type') ?? tryGet('modelName') ?? tryGet<{ modelName?: string }>('constructor')?.modelName ?? '';

    const className = obj.constructor?.name ?? obj.toString?.() ?? 'unknown';
    _signal._debug_base = `${className}${modelName && !className.startsWith('SchemaRecord') ? `:${modelName}` : ''}`;
  }

  return _signal;
}

/**
 * Create a signal for the key/object pairing and subscribes to the signal.
 *
 * Use when you need to ensure a signal exists and is subscribed to.
 *
 * @internal
 * @param signals Map of signals
 * @param obj Object we're creating the signal on
 * @param key Key to create the signal for
 * @return the signal
 */
export function entangleSignal<T extends object>(signals: Map<string, Signal>, obj: T, key: string): Signal {
  let _signal = signals.get(key);
  if (!_signal) {
    _signal = createSignal(obj, key);
    signals.set(key, _signal);
  }
  subscribe(_signal);
  return _signal;
}

interface Signaler {
  [Signals]: Map<string, Signal>;
}

export function getSignal<T extends object>(obj: T, key: string, initialState: boolean): Signal {
  let signals = (obj as Signaler)[Signals];

  if (!signals) {
    signals = new Map();
    (obj as Signaler)[Signals] = signals;
  }

  let _signal = signals.get(key);
  if (!_signal) {
    _signal = createSignal(obj, key);
    _signal.shouldReset = initialState;
    signals.set(key, _signal);
  }
  return _signal;
}

export function peekSignal<T extends object>(obj: T, key: string): Signal | undefined {
  const signals = (obj as Signaler)[Signals];
  if (signals) {
    return signals.get(key);
  }
}

export function subscribed<T extends object, K extends keyof T & string>(_target: T, key: K, desc: PropertyDescriptor) {
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const getter = desc.get as (this: T) => unknown;
  // eslint-disable-next-line @typescript-eslint/unbound-method
  const setter = desc.set as (this: T, v: unknown) => void;

  desc.get = function (this: T) {
    const signal = getSignal(this, key, true);
    subscribe(signal);

    if (signal.shouldReset) {
      signal.shouldReset = false;
      signal.lastValue = getter.call(this);
    }

    return signal.lastValue;
  };
  desc.set = function (this: T, v: unknown) {
    getSignal(this, key, true); // ensure signal is setup in case we want to use it.
    // probably notify here but not yet.
    setter.call(this, v);
  };
  compat(desc);
  return desc;
}
export { compat };

export function notifySignal<T extends object, K extends keyof T & string>(obj: T, key: K) {
  const signal = peekSignal(obj, key);
  if (signal) {
    signal.shouldReset = true;
    invalidateSignal(signal);
  }
}
