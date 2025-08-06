import type { StoreRequestContext } from '@warp-drive/core';
import type { Future, Handler, NextFn } from '@warp-drive/core/request';
import type {
  RequestContext,
  RequestInfo,
  StructuredDataDocument,
  StructuredErrorDocument,
} from '@warp-drive/core/types/request';

export interface IMUXRequestOptions {
  /**
   * The list of additional requests to be made as part of the IMUX operation.
   * In addition to the main request, these requests will be made in parallel.
   *
   * Each request should be a {@link RequestInfo} object.
   */
  requests: RequestInfo[];
}

interface ResolvedPromise {
  status: 'fulfilled';
  value: StructuredDataDocument<unknown>;
}
interface RejectedPromise {
  status: 'rejected';
  reason: StructuredErrorDocument;
}

export interface IMUXHandlerOptions<T = unknown> {
  checkFn: (context: RequestContext) => boolean;
  mergeFn: (
    request: RequestInfo,
    response: StructuredDataDocument<T>,
    results: Array<ResolvedPromise | RejectedPromise>
  ) => unknown;
}

/**
 * The IMUXHandler is an [inverse multiplexer](https://en.wikipedia.org/wiki/Inverse_multiplexer)
 * that transforms a single request into multiple requests and then recombines them into a single
 * response.
 *
 * This is useful for scenarios where conceptually a single request for data is optimal, but for
 * which the data is actually fetched from multiple sources or endpoints.
 *
 * To activate this handler, a request's {@link RequestInfo.options | options} should include
 * the `imux` key with a value of {@link IMUXOptions}.
 *
 * ::: code-group
 *
 * ```ts
 * options.imux = {
 *  requests: [
 *    {
 *      method: 'GET',
 *      url: '/example/1',
 *    }
 *  ]
 * }
 * ```
 *
 * :::
 *
 * For instance, the below code demonstrates how to use the IMUX handler:
 *
 * ```ts
 * store.request({
 *   url: '/api/users',
 *   method: 'GET',
 *   options: {
 *     imux: {
 *       requests: [
 *         {
 *           method: 'POST',
 *           url: '/api/ml-recommendations/users',
 *           headers: new Headers({ 'x-http-method-override': 'QUERY' }),
 *           body: JSON.stringify({ context: 'potential-friends', userId: '123' }),
 *         }
 *       ]
 *     }
 *   }
 * });
 * ```
 *
 * The handler will then process the main request and all additional requests in parallel,
 * and return a response that combines the results of all requests.
 *
 * If the primary request fails, the handler will not process the additional requests.
 *
 * If any of the additional requests fail, the handler can choose to either recover
 * from the error or propagate it, depending on the implementation.
 *
 * @group Handlers
 */
export class IMUXHandler implements Handler {
  private config: IMUXHandlerOptions;
  constructor(config: IMUXHandlerOptions) {
    this.config = config;
  }

  request<T>(context: StoreRequestContext, next: NextFn<T>): Promise<T | StructuredDataDocument<T> | Awaited<T>> {
    if (!isImuxRequest(context.request) || !this.config.checkFn(context)) {
      return next(context.request);
    }

    // we trigger the primary request first since its the most important one
    const primaryRequest = next(context.request);

    const promises: Future<unknown>[] = [];
    for (const request of context.request.options.imux.requests) {
      promises.push(next(request));
    }

    return primaryRequest.then(async (result) => {
      const results = await Promise.allSettled(promises);
      return this.config.mergeFn(context.request, result, results) as StructuredDataDocument<T>;
    });
  }
}

function isImuxRequest(request: RequestInfo): request is RequestInfo & { options: { imux: IMUXRequestOptions } } {
  return Boolean(request.options?.imux);
}
