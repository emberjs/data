import type { StoreRequestContext } from '@warp-drive/core';
import type { Handler, NextFn } from '@warp-drive/core/request';
import type { StructuredDataDocument } from '@warp-drive/core/types/request';

/**
 * MetaDocHandler processes requests that are marked as meta requests.
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
 * options.isMetaRequest = true
 * ```
 *
 * For instance
 *
 * ```ts
 * store.request({
 *   url: '/example',
 *   options: {
 *     isMetaRequest: true
 *   }
 * });
 * ```
 *
 * Errors are not processed by this handler, so if the request fails and the error response
 * is not in {json:api} format additional processing may be needed.
 *
 * @group Handlers
 */
export const MetaDocHandler: Handler = {
  request<T>(context: StoreRequestContext, next: NextFn<T>): Promise<T | StructuredDataDocument<T> | Awaited<T>> {
    if (!context.request.options?.isMetaRequest) {
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
