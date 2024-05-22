import { createDeferred } from '@ember-data/request';
import type { Context } from '@ember-data/request/-private/context';
import type { Deferred, NextFn } from '@ember-data/request/-private/types';
import type Store from '@ember-data/store';

const SkipCache = Symbol.for('ember-data:skip-cache');
const isServerEnv = typeof FastBoot !== 'undefined';

interface WorkerEvent {
  type: 'response';
  id: string;
  data: unknown;
}

export class WorkerFetch {
  declare worker: SharedWorker;
  declare store: Store;
  declare threadId: string;
  declare pending: Map<string, { context: Context; deferred: Deferred }>;

  constructor(store: Store, workerUrl: Url) {
    this.threadId = isServerEnv ? '' : crypto.randomUUID();
    this.store = store;
    const worker = (this.worker = new SharedWorker(workerUrl);
    worker.port.onmessage = (event: WorkerEvent) => {};
  }

  request<T>(context: Context, next: NextFn): Promise<T> {
    // if we have no cache or no cache-key skip cache handling
    if (isServerEnv || !context.request.store || context.request.cacheOptions?.[SkipCache]) {
      return next(context.request);
    }

    const deferred = createDeferred();
    const id = `${this.threadId}:${context.id}`;
    this.pending.set(id, { context, deferred });

    this.worker.port.postMessage({
      type: 'request',
      id: `${this.threadId}:${context.id}`,
      data: context.request,
    });

    return deferred.promise;
  }
}
