type OpaqueFn = (...args: unknown[]) => unknown;
type Tag = { _ref: null };
type Transaction = {
  cbs: Set<OpaqueFn>;
  props: Set<Tag>;
  parent: Transaction | null;
}
let TRANSACTION: Transaction | null = null;

function createTransaction() {
  let transaction: Transaction = {
    cbs: new Set(),
    props: new Set(),
    parent: null
  };
  if (TRANSACTION) {
    transaction.parent = TRANSACTION;
  }
  TRANSACTION = transaction;
}

function flushTransaction() {
  let transaction = TRANSACTION!;
  TRANSACTION = transaction.parent;
  transaction.cbs.forEach((cb) => {
    cb();
  });
  transaction.props.forEach((obj: Tag) => {
    obj._ref = null;
  });
}

export function addToTransaction(obj: Tag): void {
  if (TRANSACTION) {
    TRANSACTION.props.add(obj);
  } else {
    obj._ref = null;
  }
}
export function addTransactionCB(method: OpaqueFn): void {
  if (TRANSACTION) {
    TRANSACTION.cbs.add(method);
  } else {
    method();
  }
}

export function transact<T extends OpaqueFn>(method: T): ReturnType<T> {
  createTransaction();
  const ret = method();
  flushTransaction();
  return ret as ReturnType<T>;
}

export function memoTransact<T extends OpaqueFn>(method: T): (...args: unknown[]) => ReturnType<T> {
  return function(...args: unknown[]) {
    createTransaction();
    const ret = method();
    flushTransaction();
    return ret as ReturnType<T>;
  }
}
