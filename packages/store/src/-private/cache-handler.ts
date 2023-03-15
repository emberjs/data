import type {
  Future,
  Handler,
  ImmutableRequestInfo,
  NextFn,
  RequestContext,
  StructuredErrorDocument,
} from '@ember-data/request/-private/types';
import type Store from '@ember-data/store';
import { CollectionResourceDataDocument, ResourceDataDocument } from '@ember-data/types/cache/document';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';

export type HTTPMethod = 'GET' | 'OPTIONS' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface LifetimesService {
  isHardExpired(key: string, url: string, method: HTTPMethod): boolean;
  isSoftExpired(key: string, url: string, method: HTTPMethod): boolean;
}

export interface StoreRequestInfo extends ImmutableRequestInfo {
  cacheOptions?: { key?: string; reload?: boolean; backgroundReload?: boolean };
  store: Store;

  op?:
    | 'findRecord'
    | 'updateRecord'
    | 'query'
    | 'queryRecord'
    | 'findBelongsTo'
    | 'findHasMany'
    | 'createRecord'
    | 'deleteRecord';
  records?: StableRecordIdentifier[];
}

export interface StoreRequestContext extends RequestContext {
  request: StoreRequestInfo;
}

function getHydratedContent<T>(store: Store, request: ImmutableRequestInfo, document: ResourceDataDocument): T {
  if (Array.isArray(document.data)) {
    const { lid } = document;
    const { recordArrayManager } = store;
    if (!lid) {
      return recordArrayManager.createArray({
        identifiers: document.data,
        doc: document as CollectionResourceDataDocument,
        query: request,
      }) as T;
    }
    let managed = recordArrayManager._keyedArrays.get(lid);
    if (!managed) {
      managed = recordArrayManager.createArray({
        identifiers: document.data,
        doc: document as CollectionResourceDataDocument,
      });
      recordArrayManager._keyedArrays.set(lid, managed);
    } else {
      recordArrayManager.populateManagedArray(managed, document.data, document as CollectionResourceDataDocument);
    }
    return managed as T;
  } else {
    return (document.data ? store.peekRecord(document.data) : null) as T;
  }
}

export const CacheHandler: Handler = {
  request<T>(context: StoreRequestContext, next: NextFn<T>): Promise<T> | Future<T> {
    const { store } = context.request;
    const { cacheOptions, url, method } = context.request;
    const lid = cacheOptions?.key || (method === 'GET' && url) ? url : false;
    const peeked = lid ? store.cache.peekRequest({ lid }) : null;

    // determine if we should skip cache
    const shouldFetch =
      cacheOptions?.reload || !peeked || (lid && url && method)
        ? store.lifetimes?.isHardExpired(lid as string, url as string, method as HTTPMethod)
        : false;

    // if we have not skipped cache, determine if we should update behind the scenes
    const shouldBackgroundFetch =
      !shouldFetch &&
      (cacheOptions?.backgroundReload || (lid && url && method)
        ? store.lifetimes?.isSoftExpired(lid as string, url as string, method as HTTPMethod)
        : false);

    let promise: Promise<T>;
    if (shouldFetch || shouldBackgroundFetch) {
      promise = next(context.request).then(
        (document) => {
          const response = store.cache.put(document);

          if (shouldFetch) {
            return getHydratedContent(store, context.request, response as ResourceDataDocument);
          }
        },
        (error: StructuredErrorDocument) => {
          store.cache.put(error);
          // TODO @runspired this is probably not the right thing to throw so make sure we add a test
          if (!shouldBackgroundFetch) {
            throw error;
          }
        }
      ) as Promise<T>;
    }

    if (shouldFetch) {
      return promise!;
    }

    if ('error' in peeked!) {
      throw peeked.error;
    }
    return Promise.resolve(getHydratedContent<T>(store, context.request, peeked!.content as ResourceDataDocument));
  },
};
