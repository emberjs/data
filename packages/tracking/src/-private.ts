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
export type Tag = { ref: null; t: boolean };
type Transaction = {
  cbs: Set<OpaqueFn>;
  props: Set<Tag>;
  sub: Set<Tag>;
  parent: Transaction | null;
};
let TRANSACTION: Transaction | null = null;

function createTransaction() {
  let transaction: Transaction = {
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

export function subscribe(obj: Tag): void {
  if (TRANSACTION) {
    TRANSACTION.sub.add(obj);
  } else {
    obj.ref;
  }
}

function updateRef(obj: Tag): void {
  if (DEBUG) {
    try {
      obj.ref = null;
    } catch (e: unknown) {
      if (e instanceof Error) {
        if (e.message.includes('You attempted to update `ref` on `Tag`')) {
          e.message = e.message.replace(
            'You attempted to update `ref` on `Tag`',
            // @ts-expect-error
            `You attempted to update <${obj._debug_base}>.${obj._debug_prop}` // eslint-disable-line
          );
          e.stack = e.stack?.replace(
            'You attempted to update `ref` on `Tag`',
            // @ts-expect-error
            `You attempted to update <${obj._debug_base}>.${obj._debug_prop}` // eslint-disable-line
          );

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

          const splitstr = '`ref` was first used:';
          const parts = e.message.split(splitstr);
          parts.splice(1, 0, `Original Stack\n=============\n${finalLines.join(`\n`)}\n\n${splitstr}`);

          e.message = parts.join('');
        }
      }
      throw e;
    }
  } else {
    obj.ref = null;
  }
}

function flushTransaction() {
  let transaction = TRANSACTION!;
  TRANSACTION = transaction.parent;
  transaction.cbs.forEach((cb) => {
    cb();
  });
  transaction.props.forEach((obj: Tag) => {
    // mark this mutation as part of a transaction
    obj.t = true;
    updateRef(obj);
  });
  transaction.sub.forEach((obj: Tag) => {
    obj.ref;
  });
}
async function untrack() {
  let transaction = TRANSACTION!;
  TRANSACTION = transaction.parent;

  // defer writes
  await Promise.resolve();
  transaction.cbs.forEach((cb) => {
    cb();
  });
  transaction.props.forEach((obj: Tag) => {
    // mark this mutation as part of a transaction
    obj.t = true;
    updateRef(obj);
  });
}

export function addToTransaction(obj: Tag): void {
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
