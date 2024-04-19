import { tagForProperty } from '@ember/-internals/metal';
import { consumeTag, dirtyTag } from '@glimmer/validator';

import { DEPRECATE_COMPUTED_CHAINS } from '@warp-drive/build-config/deprecations';
import { DEBUG } from '@warp-drive/build-config/env';

/**
 * This package provides primitives that allow powerful low-level
 * adjustments to change tracking notification behaviors.
 *
 * Typically you want to use these primitives when you want to divorce
 * property accesses on EmberData provided objects from the current
 * tracking context. Typically this sort of thing occurs when serializing
 * tracked data to send in a request: the data itself is often ancillary
 * to the thing which triggered the request in the first place and you
 * would not want to re-trigger the request for any update to the data.
 *
 * @module @ember-data/tracking
 * @main @ember-data/tracking
 */
type OpaqueFn = (...args: unknown[]) => unknown;
type Tag = { ref: null; t: boolean };
type Transaction = {
  cbs: Set<OpaqueFn>;
  props: Set<Tag | Signal>;
  sub: Set<Tag | Signal>;
  parent: Transaction | null;
};
let TRANSACTION: Transaction | null = null;

function createTransaction() {
  const transaction: Transaction = {
    cbs: new Set(),
    props: new Set(),
    sub: new Set(),
    parent: null,
  };
  if (TRANSACTION) {
    transaction.parent = TRANSACTION;
  }
  TRANSACTION = transaction;
}

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
  if (TRANSACTION) {
    TRANSACTION.sub.add(obj);
  } else if ('tag' in obj) {
    if (DEPRECATE_COMPUTED_CHAINS) {
      maybeConsume(obj['[]']);
      maybeConsume(obj['@length']);
    }
    consumeTag(obj.tag);
  } else {
    obj.ref;
  }
}

function updateRef(obj: Tag | Signal): void {
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

function flushTransaction() {
  const transaction = TRANSACTION!;
  TRANSACTION = transaction.parent;
  transaction.cbs.forEach((cb) => {
    cb();
  });
  transaction.props.forEach((obj) => {
    // mark this mutation as part of a transaction
    obj.t = true;
    updateRef(obj);
  });
  transaction.sub.forEach((obj) => {
    if ('tag' in obj) {
      if (DEPRECATE_COMPUTED_CHAINS) {
        maybeConsume(obj['[]']);
        maybeConsume(obj['@length']);
      }
      consumeTag(obj.tag);
    } else {
      obj.ref;
    }
  });
}
async function untrack() {
  const transaction = TRANSACTION!;
  TRANSACTION = transaction.parent;

  // defer writes
  await Promise.resolve();
  transaction.cbs.forEach((cb) => {
    cb();
  });
  transaction.props.forEach((obj) => {
    // mark this mutation as part of a transaction
    obj.t = true;
    updateRef(obj);
  });
}

export function addToTransaction(obj: Tag | Signal): void {
  if (TRANSACTION) {
    TRANSACTION.props.add(obj);
  } else {
    updateRef(obj);
  }
}
export function addTransactionCB(method: OpaqueFn): void {
  if (TRANSACTION) {
    TRANSACTION.cbs.add(method);
  } else {
    method();
  }
}

/**
 * Run `method` without subscribing to any tracked properties
 * controlled by EmberData.
 *
 * This should rarely be used except by libraries that really
 * know what they are doing. It is most useful for wrapping
 * certain kinds of fetch/query logic from within a `Resource`
 * `hook` or other similar pattern.
 *
 * @function untracked
 * @public
 * @static
 * @for @ember-data/tracking
 * @param method
 * @return result of invoking method
 */
export function untracked<T extends OpaqueFn>(method: T): ReturnType<T> {
  createTransaction();
  const ret = method();
  void untrack();
  return ret as ReturnType<T>;
}

/**
 * Run the method, subscribing to any tracked properties
 * managed by EmberData that were accessed or written during
 * the method's execution as per-normal but while allowing
 * interleaving of reads and writes.
 *
 * This is useful when for instance you want to perform
 * a mutation based on existing state that must be read first.
 *
 * @function transact
 * @public
 * @static
 * @for @ember-data/tracking
 * @param method
 * @return result of invoking method
 */
export function transact<T extends OpaqueFn>(method: T): ReturnType<T> {
  createTransaction();
  const ret = method();
  flushTransaction();
  return ret as ReturnType<T>;
}

/**
 * A helpful utility for creating a new function that
 * always runs in a transaction. E.G. this "memoizes"
 * calling `transact(fn)`, currying args as necessary.
 *
 * @method memoTransact
 * @public
 * @static
 * @for @ember-data/tracking
 * @param method
 * @return a function that will invoke method in a transaction with any provided args and return its result
 */
export function memoTransact<T extends OpaqueFn>(method: T): (...args: unknown[]) => ReturnType<T> {
  return function (...args: unknown[]) {
    createTransaction();
    const ret = method(...args);
    flushTransaction();
    return ret as ReturnType<T>;
  };
}

export const Signals = Symbol('Signals');

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
        addToTransaction(_signal);
      }
    },
  });
}

export interface Signal {
  /**
   * Key on the associated object
   * @internal
   */
  key: string;
  _debug_base?: string;

  /**
   * Whether this signal is part of an active transaction.
   * @internal
   */
  t: boolean;

  /**
   * Whether to "bust" the lastValue cache
   * @internal
   */
  shouldReset: boolean;

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

    t: false,
    shouldReset: false,
    '[]': null,
    '@length': null,
    lastValue: undefined,
  };

  if (DEBUG) {
    // eslint-disable-next-line no-inner-declarations
    function tryGet<T1 = string>(prop: string): T1 | undefined {
      try {
        return obj[prop as keyof typeof obj] as unknown as T1;
      } catch {
        return;
      }
    }
    const modelName =
      tryGet('$type') ?? tryGet('modelName') ?? tryGet<{ modelName?: string }>('constructor')?.modelName ?? '';
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
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
