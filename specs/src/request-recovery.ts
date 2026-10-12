import { RequestManager } from '@warp-drive/core';
import { createRequestSubscription } from '@warp-drive/core/reactive';
import { createDeferred } from '@warp-drive/core/request';
import { DISPOSE } from '@warp-drive/core/signals/-leaked';
import type { RequestContext } from '@warp-drive/core/types/request';

export interface RecoveryDocument {
  data: { name: string };
}

export function setupRecoveryRequests() {
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
