import type { StableRecordIdentifier } from './identifier';
import type { QueryParamsSerializationOptions } from './params';
import type { ExtractSuggestedCacheTypes, Includes, TypedRecordInstance, TypeFromInstanceOrString } from './record';
import type { ResourceIdentifierObject } from './spec/raw';
import type { RequestSignature } from './symbols';

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
export type CacheOptions<T = unknown> = {
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
export type FindRecordRequestOptions<T = unknown, RT = unknown> = {
  url: string;
  method: 'GET';
  headers: Headers;
  cacheOptions?: CacheOptions<T>;
  op: 'findRecord';
  records: [ResourceIdentifierObject<TypeFromInstanceOrString<T>>];
  [RequestSignature]?: RT;
};

export type QueryRequestOptions<T = unknown, RT = unknown> = {
  url: string;
  method: 'GET';
  headers: Headers;
  cacheOptions?: CacheOptions<T>;
  op: 'query';
  [RequestSignature]?: RT;
};

export type PostQueryRequestOptions<T = unknown, RT = unknown> = {
  url: string;
  method: 'POST' | 'QUERY';
  headers: Headers;
  body: string;
  cacheOptions: CacheOptions<T> & { key: string };
  op: 'query';
  [RequestSignature]?: RT;
};

export type DeleteRequestOptions<T = unknown, RT = unknown> = {
  url: string;
  method: 'DELETE';
  headers: Headers;
  op: 'deleteRecord';
  data: {
    record: StableRecordIdentifier<TypeFromInstanceOrString<T>>;
  };
  records: [ResourceIdentifierObject<TypeFromInstanceOrString<T>>];
  [RequestSignature]?: RT;
};

type ImmutableRequest<T> = Readonly<T> & {
  readonly headers: ImmutableHeaders;
  readonly records: [StableRecordIdentifier];
};

export type UpdateRequestOptions<T = unknown, RT = unknown> = {
  url: string;
  method: 'PATCH' | 'PUT';
  headers: Headers;
  op: 'updateRecord';
  data: {
    record: StableRecordIdentifier<TypeFromInstanceOrString<T>>;
  };
  records: [ResourceIdentifierObject<TypeFromInstanceOrString<T>>];
  [RequestSignature]?: RT;
};

export type CreateRequestOptions<T = unknown, RT = unknown> = {
  url: string;
  method: 'POST';
  headers: Headers;
  op: 'createRecord';
  data: {
    record: StableRecordIdentifier<TypeFromInstanceOrString<T>>;
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

export type ConstrainedRequestOptions = {
  reload?: boolean;
  backgroundReload?: boolean;
  host?: string;
  namespace?: string;
  resourcePath?: string;
  urlParamsSettings?: QueryParamsSerializationOptions;
};

export type FindRecordOptions<T = unknown> = ConstrainedRequestOptions & {
  include?: T extends TypedRecordInstance ? Includes<T>[] : string | string[];
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
export type RequestInfo<T = unknown> = Request & {
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
export type ImmutableRequestInfo<T = unknown, RT = unknown> = Readonly<Omit<RequestInfo<T>, 'controller'>> & {
  readonly cacheOptions?: Readonly<CacheOptions<T>>;
  readonly headers?: ImmutableHeaders;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly options?: Readonly<Record<string, unknown>>;

  /** Whether the request body has been read.
   * @typedoc
   */
  readonly bodyUsed?: boolean;
  [RequestSignature]?: RT;
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

  setStream(stream: ReadableStream | Promise<ReadableStream | null>): void;
  setResponse(response: Response | ResponseInfo): void;
}
