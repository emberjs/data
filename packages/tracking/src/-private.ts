import { tagForProperty } from '@ember/-internals/metal';
import { consumeTag, dirtyTag } from '@glimmer/validator';

import { DEPRECATE_COMPUTED_CHAINS } from '@ember-data/deprecations';
import { DEBUG } from '@ember-data/env';

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
 * @returns result of invoking method
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
 * @returns result of invoking method
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
 * @returns a function that will invoke method in a transaction with any provided args and return its result
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

export function defineSignal<T extends object, K extends keyof T & string>(obj: T, key: K, v?: unknown) {
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: false,
    get(this: T & { [Signals]: Map<K, Signal> }) {
      const signals = (this[Signals] = this[Signals] || new Map());
      const existing = signals.has(key);
      const _signal = entangleSignal(signals, this, key);
      if (!existing && v !== undefined) {
        _signal.lastValue = v;
      }
      return _signal.lastValue;
    },
    set(this: T & { [Signals]: Map<K, Signal> }, value: unknown) {
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
  key: string;
  _debug_base?: string;

  t: boolean;
  shouldReset: boolean;
  tag: ReturnType<typeof tagForProperty>;
  '[]': ReturnType<typeof tagForProperty> | null;
  '@length': ReturnType<typeof tagForProperty> | null;
  lastValue: unknown;
}

export function createArrayTags<T extends object>(obj: T, signal: Signal) {
  if (DEPRECATE_COMPUTED_CHAINS) {
    signal['[]'] = tagForProperty(obj, '[]');
    signal['@length'] = tagForProperty(obj, 'length');
  }
}

export function createSignal<T extends object, K extends keyof T & string>(obj: T, key: K): Signal {
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
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-base-to-string
    const modelName = obj.modelName ?? obj.constructor?.modelName ?? '';
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-base-to-string
    const className = obj.constructor?.name ?? obj.toString?.() ?? 'unknown';
    _signal._debug_base = `${className}${modelName ? `:${modelName}` : ''}`;
  }

  return _signal;
}

export function entangleSignal<T extends object, K extends keyof T & string>(
  signals: Map<K, Signal>,
  obj: T,
  key: K
): Signal {
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

export function getSignal<T extends object, K extends keyof T & string>(obj: T, key: K, initialState: boolean): Signal {
  const signals = ((obj as Signaler)[Signals] = (obj as Signaler)[Signals] || new Map());
  let _signal = signals.get(key);
  if (!_signal) {
    _signal = createSignal(obj, key);
    _signal.shouldReset = initialState;
    signals.set(key, _signal);
  }
  return _signal;
}

export function peekSignal<T extends object, K extends keyof T & string>(obj: T, key: K): Signal | undefined {
  const signals = (obj as Signaler)[Signals];
  if (signals) {
    return signals.get(key);
  }
}
