/**
 * @module @ember-data/tracking
 */
type OpaqueFn = (...args: unknown[]) => unknown;
type Tag = { ref: null; t: boolean };
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

function flushTransaction() {
  let transaction = TRANSACTION!;
  TRANSACTION = transaction.parent;
  transaction.cbs.forEach((cb) => {
    cb();
  });
  transaction.props.forEach((obj: Tag) => {
    obj.t = true;
    obj.ref = null;
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
    obj.t = true;
    obj.ref = null;
  });
}

export function addToTransaction(obj: Tag): void {
  if (TRANSACTION) {
    TRANSACTION.props.add(obj);
  } else {
    obj.ref = null;
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
 *
 * @function transact
 * @public
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
 *
 * @method memoTransact
 * @public
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
