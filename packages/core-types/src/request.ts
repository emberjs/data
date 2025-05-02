import { getOrSetGlobal, getOrSetUniversal } from './-private';
import type { ExtractSuggestedCacheTypes, TypedRecordInstance, TypeFromInstanceOrString } from './record';
import type { ResourceIdentifierObject } from './spec/json-api-raw';
import type { RequestSignature } from './symbols';

type Store = unknown;

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
 * Use these options to adjust CacheHandler behavior for a request.
 *
 * @typedoc
 */
export interface CacheOptions<T = unknown> {
  /**
   * A key that uniquely identifies this request. If not present, the url wil be used
   * as the key for any GET request, while all other requests will not be cached.
   *
   * @typedoc
   */
  key?: string;

  /**
   * If true, the request will be made even if a cached response is present
   * and not expired.
   *
   * @typedoc
   */
  reload?: boolean;

  /**
   * If true, and a cached response is present and not expired, the request
   * will be made in the background and the cached response will be returned.
   *
   * @typedoc
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
   * @typedoc
   */
  types?: T extends TypedRecordInstance ? ExtractSuggestedCacheTypes<T>[] : string[];

  /**
   * If present, should contain the identifiers of the records that are
   * involved in the request. For transactional (or bulk) operations
   * where multiple records are being created, updated, or deleted
   * this list will be used to trigger the cache lifecycle events
   * for each record involved in the request.
   *
   * In the case of a bulk create, if the response has not reflected the
   * `lid` of the created records, the order of the records in this array
   * should match the order of the records in the response.
   *
   * This replaces `request.records`
   *
   * @typedoc
   */
  records?: ResourceIdentifierObject<TypeFromInstanceOrString<T>>[];

  /**
   * The store that the CacheHandler should use when fulfilling the request.
   *
   * This replaces `request.store`
   *
   * @typedoc
   */
  store?: Store;

  /**
   * If true, the resulting response will be a raw response object instead of
   * a reactive document containing reactive resources.
   *
   * This replaces `request[EnableHydration]`
   *
   * @typedoc
   */
  raw?: boolean;

  /**
   * If true, the request will never be handled by the cache-manager and thus
   * will never resolve from cache nor update the cache.
   *
   * Generally this is only used for legacy requests that manage resource cache
   * updates in a non-standard way via the LegacyNetworkHandler.
   *
   * This replaces `request.cacheOptions[SkipCache]`
   *
   * @typedoc
   */
  skipCache?: boolean;
  /**
   * An older version of `skipCache` that is used to skip the cache for a request.
   *
   * @typedoc
   */
  [SkipCache]?: boolean;
}

interface StructuredResponse {
  [STRUCTURED]?: true;
  /**
   * @see {@link ImmutableRequestInfo}
   * @typedoc
   */
  request: ImmutableRequestInfo;
  response: Response | ResponseInfo | null;
}

export interface StructuredDataDocument<T> extends StructuredResponse {
  content: T;
}

interface StructuredError<T = unknown> extends StructuredResponse, Error {
  error: string | object;
  content?: T;
}

interface StructuredAggregateError<T = unknown> extends StructuredResponse, AggregateError {
  errors: unknown[];
  error: string | object;
  content?: T;
}

export type StructuredErrorDocument<T = unknown> = StructuredError<T> | StructuredAggregateError<T>;

export type StructuredDocument<T> = StructuredDataDocument<T> | StructuredErrorDocument<T>;

/**
 * JavaScript's native Request class.
 *
 * WarpDrive provides our own typings due to incompleteness in the native typings.
 *
 * @typedoc
 */
interface Request {
  /** Returns the cache mode associated with request, which is a string indicating how the request will interact with the browser's cache when fetching.
   * @typedoc
   */
  cache?: RequestCache;
  /** Returns the credentials mode associated with request, which is a string indicating whether credentials will be sent with the request always, never, or only when sent to a same-origin URL.
   * @typedoc
   */
  credentials?: RequestCredentials;
  /** Returns the kind of resource requested by request, e.g., "document" or "script".
   * @typedoc
   */
  destination?: RequestDestination;
  /** Returns a Headers object consisting of the headers associated with request. Note that headers added in the network layer by the user agent will not be accounted for in this object, e.g., the "Host" header.
   * @typedoc
   */
  headers?: Headers;
  /** Returns request's subresource integrity metadata, which is a cryptographic hash of the resource being fetched. Its value consists of multiple hashes separated by whitespace. [SRI]
   * @typedoc
   */
  integrity?: string;
  /** Returns a boolean indicating whether or not request can outlive the global in which it was created.
   * @typedoc
   */
  keepalive?: boolean;
  /** Returns request's HTTP method, which is "GET" by default.
   * @typedoc
   */
  method?: HTTPMethod;
  /** Returns the mode associated with request, which is a string indicating whether the request will use CORS, or will be restricted to same-origin URLs.
   * @typedoc
   */
  mode?: RequestMode;
  /** Returns the redirect mode associated with request, which is a string indicating how redirects for the request will be handled during fetching. A request will follow redirects by default.
   * @typedoc
   */
  redirect?: RequestRedirect;
  /** Returns the referrer of request. Its value can be a same-origin URL if explicitly set in init, the empty string to indicate no referrer, and "about:client" when defaulting to the global's default. This is used during fetching to determine the value of the `Referer` header of the request being made.
   * @typedoc
   */
  referrer?: string;
  /** Returns the referrer policy associated with request. This is used during fetching to compute the value of the request's referrer.
   * @typedoc
   */
  referrerPolicy?: ReferrerPolicy;
  /** Returns the signal associated with request, which is an AbortSignal object indicating whether or not request has been aborted, and its abort event handler.
   * @typedoc
   */
  signal?: AbortSignal;
  /** Returns the URL of request as a string.
   * @typedoc
   */
  url?: string;
  /** Any body that you want to add to your request. Note that a GET or HEAD request may not have a body.
   * @typedoc
   */
  body?: BodyInit | null;
}

export interface ImmutableHeaders extends Headers {
  toJSON(): Record<string, string>;
}

/**
 * Extends JavaScript's native {@link Request} object with additional
 * properties specific to the RequestManager's capabilities.
 *
 * @typedoc
 */
export interface RequestInfo<T = unknown, RT = unknown> extends Request {
  /**
   * If provided, used instead of the AbortController auto-configured for each request by the RequestManager
   *
   * @typedoc
   */
  controller?: AbortController;

  /**
   * @see {@link CacheOptions}
   * @typedoc
   */
  cacheOptions?: CacheOptions<T>;

  /**
   * The store for the CacheHandler to use for the request.
   *
   * @deprecated use {@link CacheOptions.store} instead
   * @typedoc
   */
  store?: Store;

  /**
   * An operation name that identifies the purpose of the request.
   *
   * Some op codes have special meanings for the store's CacheHandler,
   * see its documentation for more details.
   *
   * @typedoc
   */
  op?: string;

  /**
   * The identifiers of the primary resources involved in the request
   * (if any). This may be used by handlers to perform transactional
   * operations on the store.
   *
   * @deprecated use {@link CacheOptions.records} instead
   * @typedoc
   */
  records?: ResourceIdentifierObject<TypeFromInstanceOrString<T>>[];

  disableTestWaiter?: boolean;
  /**
   * data that a handler should convert into
   * the query (GET) or body (POST).
   *
   * Note: It is recommended that builders set query params
   * and body directly in most scenarios.
   *
   * @typedoc
   */
  data?: unknown;
  /**
   * options specifically intended for handlers
   * to utilize to process the request
   *
   * @typedoc
   */
  options?: Record<string, unknown>;

  [RequestSignature]?: RT;

  /**
   * Whether to convert the response into a reactive document
   * or return the raw response object.
   *
   * @deprecated use {@link CacheOptions.raw} instead
   * @typedoc
   */
  [EnableHydration]?: boolean;
}

/**
 * Immutable version of {@link RequestInfo}. This is what is passed to handlers.
 *
 * @typedoc
 */
export interface ImmutableRequestInfo<T = unknown, RT = unknown>
  extends Readonly<Omit<RequestInfo<T, RT>, 'controller'>> {
  readonly cacheOptions?: Readonly<CacheOptions<T>>;
  readonly headers?: ImmutableHeaders;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly options?: Readonly<Record<string, unknown>>;

  /** Whether the request body has been read.
   * @typedoc
   */
  readonly bodyUsed?: boolean;
}

/**
 * A serialized/serializable subset of a processed Response
 *
 * @typedoc
 */
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
   * @typedoc
   */
  request: ImmutableRequestInfo;
  id: number;

  setStream(stream: ReadableStream | Promise<ReadableStream | null>): void;
  setResponse(response: Response | ResponseInfo | null): void;
}
