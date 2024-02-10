import type { StableRecordIdentifier } from './identifier';
import type { QueryParamsSerializationOptions } from './params';
import type { ResourceIdentifierObject } from './spec/raw';

type Store = unknown;

export const SkipCache = Symbol.for('wd:skip-cache');
export const EnableHydration = Symbol.for('wd:enable-hydration');
export const IS_FUTURE = Symbol('IS_FUTURE');
export const STRUCTURED = Symbol('DOC');

export type HTTPMethod = 'GET' | 'OPTIONS' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

/**
 * Use these options to adjust CacheHandler behavior for a request.
 *
 * @typedoc
 */
export type CacheOptions = {
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
   * of that type has been created. See the LifetimesService implementation
   * provided by `@ember-data/request-utils` for an example.
   *
   * It is recommended to only use this for query/queryRecord requests where
   * new records created later would affect the results.
   *
   * @typedoc
   */
  types?: string[];

  /**
   * If true, the request will never be handled by the cache-manager and thus
   * will never resolve from cache nor update the cache.
   *
   * Generally this is only used for legacy request that manage resource cache
   * updates in a non-standard way via the LegacyNetworkHandler.
   *
   * @typedoc
   */
  [SkipCache]?: true;
};
export type FindRecordRequestOptions = {
  url: string;
  method: 'GET';
  headers: Headers;
  cacheOptions: CacheOptions;
  op: 'findRecord';
  records: [ResourceIdentifierObject];
};

export type QueryRequestOptions = {
  url: string;
  method: 'GET';
  headers: Headers;
  cacheOptions: CacheOptions;
  op: 'query';
};

export type PostQueryRequestOptions = {
  url: string;
  method: 'POST' | 'QUERY';
  headers: Headers;
  body: string;
  cacheOptions: CacheOptions & { key: string };
  op: 'query';
};

export type DeleteRequestOptions = {
  url: string;
  method: 'DELETE';
  headers: Headers;
  op: 'deleteRecord';
  data: {
    record: StableRecordIdentifier;
  };
  records: [ResourceIdentifierObject];
};

type ImmutableRequest<T> = Readonly<T> & {
  readonly headers: ImmutableHeaders;
  readonly records: [StableRecordIdentifier];
};

export type UpdateRequestOptions = {
  url: string;
  method: 'PATCH' | 'PUT';
  headers: Headers;
  op: 'updateRecord';
  data: {
    record: StableRecordIdentifier;
  };
  records: [ResourceIdentifierObject];
};

export type CreateRequestOptions = {
  url: string;
  method: 'POST';
  headers: Headers;
  op: 'createRecord';
  data: {
    record: StableRecordIdentifier;
  };
  records: [ResourceIdentifierObject];
};

export type ImmutableDeleteRequestOptions = ImmutableRequest<DeleteRequestOptions>;
export type ImmutableUpdateRequestOptions = ImmutableRequest<UpdateRequestOptions>;
export type ImmutableCreateRequestOptions = ImmutableRequest<CreateRequestOptions>;

export type RemotelyAccessibleIdentifier = {
  id: string;
  type: string;
  lid?: string;
};

export type ConstrainedRequestOptions = {
  reload?: boolean;
  backgroundReload?: boolean;
  host?: string;
  namespace?: string;
  resourcePath?: string;
  urlParamsSettings?: QueryParamsSerializationOptions;
};

export type FindRecordOptions = ConstrainedRequestOptions & {
  include?: string | string[];
};

export interface StructuredDataDocument<T> {
  [STRUCTURED]?: true;
  /**
   * @see {@link ImmutableRequestInfo}
   * @typedoc
   */
  request: ImmutableRequestInfo;
  response: Response | ResponseInfo | null;
  content: T;
}
export interface StructuredErrorDocument<T = unknown> extends Error {
  [STRUCTURED]?: true;
  request: ImmutableRequestInfo;
  response: Response | ResponseInfo | null;
  error: string | object;
  content?: T;
}
export type StructuredDocument<T> = StructuredDataDocument<T> | StructuredErrorDocument<T>;

/**
 * JavaScript's native Request class.
 *
 * EmberData provides our own typings due to incompleteness in the native typings.
 *
 * @typedoc
 */
type Request = {
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
};

export type ImmutableHeaders = Headers & { clone?(): Headers; toJSON(): [string, string][] };

/**
 * Extends JavaScript's native {@link Request} object with additional
 * properties specific to the RequestManager's capabilities.
 *
 * @typedoc
 */
export type RequestInfo = Request & {
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
  cacheOptions?: CacheOptions;
  store?: Store;

  op?: string;

  /**
   * The identifiers of the primary resources involved in the request
   * (if any). This may be used by handlers to perform transactional
   * operations on the store.
   *
   * @typedoc
   */
  records?: StableRecordIdentifier[];

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
  data?: Record<string, unknown>;
  /**
   * options specifically intended for handlers
   * to utilize to process the request
   *
   * @typedoc
   */
  options?: Record<string, unknown>;
};

/**
 * Immutable version of {@link RequestInfo}. This is what is passed to handlers.
 *
 * @typedoc
 */
export type ImmutableRequestInfo = Readonly<RequestInfo> & {
  readonly cacheOptions?: Readonly<CacheOptions>;
  readonly headers: ImmutableHeaders;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly options?: Readonly<Record<string, unknown>>;

  /** Whether the request body has been read.
   * @typedoc
   */
  readonly bodyUsed?: boolean;
};

export interface ResponseInfo {
  readonly headers: ImmutableHeaders; // to do, maybe not this?
  readonly ok: boolean;
  readonly redirected: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly type: string;
  readonly url: string;
}

export interface RequestContext {
  /**
   * @see {@link ImmutableRequestInfo}
   * @typedoc
   */
  request: ImmutableRequestInfo;
  id: number;

  setStream(stream: ReadableStream): void;
  setResponse(response: Response | ResponseInfo): void;
}
