import type { StoreRequestContext } from '@warp-drive/core';
import type { Handler, NextFn } from '@warp-drive/core/request';
import type { StructuredDataDocument } from '@warp-drive/core/types/request';

/**
 * LegacyMetaHandler processes requests that are marked as legacy meta requests.
 *
 * It treats the response body as "entirely meta" transforming
 *
 * ```ts
 * {
 *   some: "key",
 *   another: "thing"
 * }
 * ```
 *
 * into
 *
 * ```ts
 * {
 * 	 meta: {
 *     some: "key",
 *     another: "thing"
 *   }
 * }
 * ```
 *
 * To activate this handler, a request should specify
 *
 * ```ts
 * options.isLegacyMetaRequest = true
 * ```
 *
 * For instance
 *
 * ```ts
 * store.request({
 *   url: '/example',
 *   options: {
 *     isLegacyMetaRequest: true
 *   }
 * });
 * ```
 *
 * Errors are not processed by this handler, so if the request fails and the error response
 * is not in {JSON:API} format additional processing may be needed.
 *
 * @group Handlers
 */
export const ResourceDocHandler: Handler = {
  request<T>(context: StoreRequestContext, next: NextFn<T>): Promise<T | StructuredDataDocument<T> | Awaited<T>> {
    if (!context.request.options?.isLegacyMetaRequest) {
      return next(context.request);
    }

    return next(context.request).then((response) => {
      return processResponse<T>(response);
    });
  },
};

function processResponse<T>(response: StructuredDataDocument<T>): T {
  return {
    meta: response.content,
  } as T;
}
