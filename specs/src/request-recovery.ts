import { RequestManager } from '@warp-drive/core';
import { createRequestSubscription, type RequestSubscription } from '@warp-drive/core/reactive';
import { createDeferred, type Deferred } from '@warp-drive/core/request';
import { DISPOSE } from '@warp-drive/core/signals/-leaked';
import type { RequestContext } from '@warp-drive/core/types/request';

export interface RecoveryDocument {
  data: { name: string };
}

interface RecoveryResponse extends Deferred<RecoveryDocument> {
  started: Deferred<void>;
}

export interface RecoveryControl {
  manager: RequestManager;
  subscription: RequestSubscription<RecoveryDocument, unknown>;
  responses: RecoveryResponse[];
  readonly calls: number;
  dispose(): void;
}

export function setupRecoveryRequests(): RecoveryControl {
  const responses = Array.from({ length: 4 }, () => ({
    ...createDeferred<RecoveryDocument>(),
    started: createDeferred<void>(),
  }));
  let calls = 0;
  const manager = new RequestManager().use([
    {
      request<T>(context: RequestContext): Promise<T> {
        const response = responses[calls++];
        if (!response) {
          throw new Error('Unexpected recovery request');
        }

        const signal = context.request.signal;
        const abort = () => response.reject(signal?.reason);
        if (signal?.aborted) {
          abort();
        } else {
          signal?.addEventListener('abort', abort, { once: true });
        }
        const cleanup = () => signal?.removeEventListener('abort', abort);
        void response.promise.then(cleanup, cleanup);
        response.started.resolve();

        return response.promise.then((document) => document as T);
      },
    },
  ]);
  const subscription = createRequestSubscription<RecoveryDocument, unknown>(manager, {
    query: { url: '/request-recovery', method: 'GET' },
  });

  return {
    manager,
    subscription,
    responses,
    get calls() {
      return calls;
    },
    dispose() {
      for (const response of responses) {
        response.resolve({ data: { name: 'Cleanup' } });
      }
      subscription[DISPOSE]();
    },
  };
}
