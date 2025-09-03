// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Handler } from '../request.ts';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { Fetch } from '../request/-private/fetch.ts';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { RequestManager } from '../request/-private/manager.ts';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { FetchError } from '../request/-private/utils.ts';
import type { Store } from '../store/-private.ts';
import { getOrSetGlobal, getOrSetUniversal } from './-private.ts';
import type { ResourceKey } from './identifier.ts';
import type { QueryParamsSerializationOptions } from './params.ts';
import type { TypeFromInstanceOrString } from './record.ts';
import type { ResourceIdentifierObject } from './spec/json-api-raw.ts';
import type { RequestSignature } from './symbols.ts';

export const SkipCache: '___(unique) Symbol(SkipCache)' = getOrSetUniversal('SkipCache', Symbol.for('wd:skip-cache'));
export const EnableHydration: '___(unique) Symbol(EnableHydration)' = getOrSetUniversal(
  'EnableHydration',
  Symbol.for('wd:enable-hydration')
);
export const IS_FUTURE: '___(unique) Symbol(IS_FUTURE)' = getOrSetGlobal('IS_FUTURE', Symbol('IS_FUTURE'));
export const STRUCTURED: '___(unique) Symbol(DOC)' = getOrSetGlobal('DOC', Symbol('DOC'));

export type HTTPMethod =
  | 'QUERY'
  | 'GET'
  | 'OPTIONS'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'CONNECT'
  | 'TRACE';

/**
 * Use these options to adjust {@link CacheHandler} behavior for a request
 * via {@link RequestInfo.cacheOptions}.
 *
 */
export interface CacheOptions {
  /**
   * A key that uniquely identifies this request. If not present, the url wil be used
   * as the key for any GET request, while all other requests will not be cached.
   *
   */
  key?: string;
  /**
   * If true, the request will be made even if a cached response is present
   * and not expired.
   *
   */
  reload?: boolean;
  /**
   * If true, and a cached response is present and not expired, the request
   * will be made in the background and the cached response will be returned.
   *
   */
  backgroundReload?: boolean;
  /**
   * Useful for metadata around when to invalidate the cache. Typically used
   * by strategies that invalidate requests by resource type when a new resource
   * of that type has been created. See the CachePolicy implementation
   * provided by `@ember-data/request-utils` for an example.
   *
   * It is recommended to only use this for query/queryRecord requests where
   * new records created later would affect the results, though using it for
   * findRecord requests is also supported if desired where it may be useful
   * when a create may affect the result of a sideloaded relationship.
   *
   * Generally it is better to patch the cache directly for relationship updates
   * than to invalidate findRecord requests for one.
   *
   */
  // TODO: Ideally this would be T extends TypedRecordInstance ? ExtractSuggestedCacheTypes<T>[] : string[];
  // but that leads to `Type instantiation is excessively deep and possibly infinite.`
  // issues when `T` has many properties.
  types?: string[];

  /**
   * If true, the request will never be handled by the cache-manager and thus
   * will never resolve from cache nor update the cache.
   *
   * Generally this is only used for legacy request that manage resource cache
   * updates in a non-standard way via the LegacyNetworkHandler.
   *
   */
  [SkipCache]?: boolean;
}
export type FindRecordRequestOptions<RT = unknown, T = unknown> = {
  url: string;
  method: 'GET';
  headers: Headers;
  cacheOptions?: CacheOptions;
  op: 'findRecord';
  records: [ResourceIdentifierObject<TypeFromInstanceOrString<T>>];
  [RequestSignature]?: RT;
};

export type QueryRequestOptions<RT = unknown> = {
  url: string;
  method: 'GET';
  headers: Headers;
  cacheOptions?: CacheOptions;
  op: 'query';
  [RequestSignature]?: RT;
};

export type PostQueryRequestOptions<RT = unknown> = {
  url: string;
  method: 'POST' | 'QUERY';
  headers: Headers;
  body?: string | BodyInit | FormData;
  cacheOptions: CacheOptions & { key: string };
  op: 'query';
  [RequestSignature]?: RT;
};

export type DeleteRequestOptions<RT = unknown, T = unknown> = {
  url: string;
  method: 'DELETE';
  headers: Headers;
  op: 'deleteRecord';
  body?: string | BodyInit | FormData;
  data: {
    record: ResourceKey<TypeFromInstanceOrString<T>>;
  };
  records: [ResourceIdentifierObject<TypeFromInstanceOrString<T>>];
  [RequestSignature]?: RT;
};

type ImmutableRequest<T> = Readonly<T> & {
  readonly headers: ImmutableHeaders;
  readonly records: [ResourceKey];
};

export type UpdateRequestOptions<RT = unknown, T = unknown> = {
  url: string;
  method: 'PATCH' | 'PUT';
  headers: Headers;
  op: 'updateRecord';
  body?: string | BodyInit | FormData;
  data: {
    record: ResourceKey<TypeFromInstanceOrString<T>>;
  };
  records: [ResourceIdentifierObject<TypeFromInstanceOrString<T>>];
  [RequestSignature]?: RT;
};

export type CreateRequestOptions<RT = unknown, T = unknown> = {
  url: string;
  method: 'POST';
  headers: Headers;
  op: 'createRecord';
  body?: string | BodyInit | FormData;
  data: {
    record: ResourceKey<TypeFromInstanceOrString<T>>;
  };
  records: [ResourceIdentifierObject<TypeFromInstanceOrString<T>>];
  [RequestSignature]?: RT;
};

export type ImmutableDeleteRequestOptions = ImmutableRequest<DeleteRequestOptions>;
export type ImmutableUpdateRequestOptions = ImmutableRequest<UpdateRequestOptions>;
export type ImmutableCreateRequestOptions = ImmutableRequest<CreateRequestOptions>;

export type RemotelyAccessibleIdentifier<T extends string = string> = {
  id: string;
  type: T;
  lid?: string;
};

export interface ConstrainedRequestOptions {
  reload?: boolean;
  backgroundReload?: boolean;
  host?: string;
  namespace?: string;
  resourcePath?: string;
  urlParamsSettings?: QueryParamsSerializationOptions;
}

export interface FindRecordOptions extends ConstrainedRequestOptions {
  include?: string | string[];
}

/**
 * When a handler chain resolves, it returns an object
 * containing the original request, the response set by the handler
 * chain (if any), and the processed content.
 */
export interface StructuredDataDocument<T> {
  [STRUCTURED]?: true;
  /**
   * @see {@link ImmutableRequestInfo}
   */
  request: ImmutableRequestInfo;
  response: Response | ResponseInfo | null;
  content: T;
}

/**
 * When a handler chain rejects, it throws an Error that maintains the
 * `{ request, response, content }` shape but is also an Error instance
 * itself.
 *
 * If using the error originates from the {@link Fetch | Fetch Handler}
 * the error will be a {@link FetchError}
 */
export interface StructuredErrorDocument<T = unknown> extends Error {
  [STRUCTURED]?: true;
  request: ImmutableRequestInfo;
  response: Response | ResponseInfo | null;
  error: string | object;
  content?: T;
}

/**
 * A union of the resolve/reject data types for a request.
 *
 * See the docs for:
 *
 * - {@link StructuredDataDocument} (resolved/successful requests)
 * - {@link StructuredErrorDocument} (rejected/failed requests)
 */
export type StructuredDocument<T> = StructuredDataDocument<T> | StructuredErrorDocument<T>;

/**
 * The {@link RequestInit} interface accepted by the native {@link fetch} API.
 *
 * WarpDrive provides our own typings due to incompleteness in the native typings.
 *
 * @privateRemarks
 * - [MDN Reference (fetch)](https://developer.mozilla.org/docs/Web/API/Window/fetch)
 * - [MDN Reference (RequestInit)](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit)
 * - [MDN Reference (Request)](https://developer.mozilla.org/docs/Web/API/Request)
 *
 */
interface NativeRequestInit {
  /** Returns the cache mode associated with request, which is a string indicating how the request will interact with the browser's cache when fetching.
   */
  cache?: RequestCache;
  /** Returns the credentials mode associated with request, which is a string indicating whether credentials will be sent with the request always, never, or only when sent to a same-origin URL.
   */
  credentials?: RequestCredentials;
  /** Returns the kind of resource requested by request, e.g., "document" or "script".
   */
  destination?: RequestDestination;
  /** Returns a Headers object consisting of the headers associated with request. Note that headers added in the network layer by the user agent will not be accounted for in this object, e.g., the "Host" header.
   */
  headers?: Headers;
  /** Returns request's subresource integrity metadata, which is a cryptographic hash of the resource being fetched. Its value consists of multiple hashes separated by whitespace. [SRI]
   */
  integrity?: string;
  /** Returns a boolean indicating whether or not request can outlive the global in which it was created.
   */
  keepalive?: boolean;
  /** Returns request's HTTP method, which is "GET" by default.
   */
  method?: HTTPMethod;
  /** Returns the mode associated with request, which is a string indicating whether the request will use CORS, or will be restricted to same-origin URLs.
   *
   * `no-cors` is not allowed for streaming request bodies.
   *
   */
  mode?: RequestMode;
  /** Returns the redirect mode associated with request, which is a string indicating how redirects for the request will be handled during fetching. A request will follow redirects by default.
   */
  redirect?: RequestRedirect;
  /** Returns the referrer of request. Its value can be a same-origin URL if explicitly set in init, the empty string to indicate no referrer, and "about:client" when defaulting to the global's default. This is used during fetching to determine the value of the `Referer` header of the request being made.
   */
  referrer?: string;
  /** Returns the referrer policy associated with request. This is used during fetching to compute the value of the request's referrer.
   */
  referrerPolicy?: ReferrerPolicy;
  /** Returns the signal associated with request, which is an AbortSignal object indicating whether or not request has been aborted, and its abort event handler.
   */
  signal?: AbortSignal;
  /** Returns the URL of request as a string.
   */
  url?: string;
  /** Any body that you want to add to your request. Note that a GET or HEAD request may not have a body.
   */
  body?: BodyInit | null;

  /**
   * When sending a ReadableStream as the body of a request, 'half' must be
   * specified.
   *
   * [Half Duplex Further Reading](https://developer.chrome.com/docs/capabilities/web-apis/fetch-streaming-requests#half_duplex)
   *
   */
  duplex?: 'half';
}

export interface ImmutableHeaders extends Headers {
  clone?(): Headers;
  toJSON(): [string, string][];
}

/**
 * Extends JavaScript's native {@link fetch} {@link NativeRequestInit | RequestInit} with additional
 * properties specific to the {@link RequestManager | RequestManager's} capabilities.
 *
 * This interface is used to define the shape of a request that can be made via
 * either the {@link RequestManager.request} or {@link Store.request} methods.
 *
 * @privateRemarks
 * - [MDN Reference (fetch)](https://developer.mozilla.org/docs/Web/API/Window/fetch)
 * - [MDN Reference (RequestInit)](https://developer.mozilla.org/en-US/docs/Web/API/RequestInit)
 * - [MDN Reference (Request)](https://developer.mozilla.org/docs/Web/API/Request)
 *
 * @public
 * @since 4.12
 */
export interface RequestInfo<RT = unknown> extends NativeRequestInit {
  /**
   * If provided, used instead of the AbortController auto-configured for each request by the RequestManager
   *
   */
  controller?: AbortController;

  /**
   * @see {@link CacheOptions}
   */
  cacheOptions?: CacheOptions;
  store?: Store;

  op?: string;

  /**
   * The {@link ResourceKey | ResourceKeys} of the primary resources involved in the request
   * (if any). This may be used by handlers to perform transactional
   * operations on the store.
   *
   */
  records?: ResourceKey[];

  disableTestWaiter?: boolean;
  /**
   * data that a handler should convert into
   * the query (GET) or body (POST).
   *
   * Note: It is recommended that builders set query params
   * and body directly in most scenarios.
   *
   */
  data?: Record<string, unknown>;
  /**
   * options specifically intended for {@link Handler | Handlers}
   * to utilize to process the request
   *
   */
  options?: Record<string, unknown>;

  [RequestSignature]?: RT;

  [EnableHydration]?: boolean;
}

/**
 * Immutable version of {@link RequestInfo}. This is what is passed to handlers.
 *
 */
export type ImmutableRequestInfo<RT = unknown> = Readonly<Omit<RequestInfo<RT>, 'controller'>> & {
  readonly cacheOptions?: Readonly<CacheOptions>;
  readonly headers?: ImmutableHeaders;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly options?: Readonly<Record<string, unknown>>;

  /** Whether the request body has been read.
   */
  readonly bodyUsed?: boolean;
};

export interface ResponseInfo {
  readonly headers: ImmutableHeaders; // to do, maybe not this?
  readonly ok: boolean;
  readonly redirected: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly type: ResponseType;
  readonly url: string;
}

export interface RequestContext {
  /**
   * @see {@link ImmutableRequestInfo}
   */
  request: ImmutableRequestInfo;
  id: number;

  setStream(stream: ReadableStream | Promise<ReadableStream | null>): void;
  setResponse(response: Response | ResponseInfo | null): void;
}
