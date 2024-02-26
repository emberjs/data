// FIXME: Seems weird that this import specifies ember-data
import { ResourceIdentifierObject } from './ember-data-json-api';
import { StableRecordIdentifier } from './identifier';
import { QueryParamsSerializationOptions } from './params';

type Store = unknown;

export const SkipCache = Symbol.for('wd:skip-cache');
export const EnableHydration = Symbol.for('wd:enable-hydration');
export const IS_FUTURE = Symbol('IS_FUTURE');
export const STRUCTURED = Symbol('DOC');

export type HTTPMethod = 'GET' | 'OPTIONS' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

export type CacheOptions = {
  key?: string;
  reload?: boolean;
  backgroundReload?: boolean;
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
};

export type UpdateRequestOptions = {
  url: string;
  method: 'PATCH' | 'PUT';
  headers: Headers;
  op: 'updateRecord';
  data: {
    record: StableRecordIdentifier;
  };
};

export type CreateRequestOptions = {
  url: string;
  method: 'POST';
  headers: Headers;
  op: 'createRecord';
  data: {
    record: StableRecordIdentifier;
  };
};

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

interface Request {
  controller?: AbortController;
  /* Returns the cache mode associated with request, which is a string indicating how the request will interact with the browser's cache when fetching. */
  cache?: RequestCache;
  /* Returns the credentials mode associated with request, which is a string indicating whether credentials will be sent with the request always, never, or only when sent to a same-origin URL. */
  credentials?: RequestCredentials;
  /* Returns the kind of resource requested by request, e.g., "document" or "script". */
  destination?: RequestDestination;
  /* Returns a Headers object consisting of the headers associated with request. Note that headers added in the network layer by the user agent will not be accounted for in this object, e.g., the "Host" header. */
  headers?: Headers;
  /* Returns request's subresource integrity metadata, which is a cryptographic hash of the resource being fetched. Its value consists of multiple hashes separated by whitespace. [SRI] */
  integrity?: string;
  /* Returns a boolean indicating whether or not request can outlive the global in which it was created. */
  keepalive?: boolean;
  /* Returns request's HTTP method, which is "GET" by default. */
  method?: HTTPMethod;
  /* Returns the mode associated with request, which is a string indicating whether the request will use CORS, or will be restricted to same-origin URLs. */
  mode?: RequestMode;
  /* Returns the redirect mode associated with request, which is a string indicating how redirects for the request will be handled during fetching. A request will follow redirects by default. */
  redirect?: RequestRedirect;
  /* Returns the referrer of request. Its value can be a same-origin URL if explicitly set in init, the empty string to indicate no referrer, and "about:client" when defaulting to the global's default. This is used during fetching to determine the value of the `Referer` header of the request being made. */
  referrer?: string;
  /* Returns the referrer policy associated with request. This is used during fetching to compute the value of the request's referrer. */
  referrerPolicy?: ReferrerPolicy;
  /* Returns the signal associated with request, which is an AbortSignal object indicating whether or not request has been aborted, and its abort event handler. */
  signal?: AbortSignal;
  /* Returns the URL of request as a string. */
  url?: string;
  body?: BodyInit | null;
}

export type ImmutableHeaders = Headers & { clone?(): Headers; toJSON(): [string, string][] };

export interface RequestInfo extends Request {
  cacheOptions?: { key?: string; reload?: boolean; backgroundReload?: boolean; [SkipCache]?: true };
  store?: Store;

  op?: string;
  records?: StableRecordIdentifier[];

  disableTestWaiter?: boolean;
  /*
   * data that a handler should convert into
   * the query (GET) or body (POST)
   */
  data?: Record<string, unknown>;
  /*
   * options specifically intended for handlers
   * to utilize to process the request
   */
  options?: Record<string, unknown>;
}

export interface ImmutableRequestInfo {
  readonly cacheOptions?: {
    key?: string;
    reload?: boolean;
    backgroundReload?: boolean;
    [SkipCache]?: true;
  };
  readonly store?: Store;

  readonly op?: string;
  readonly records?: StableRecordIdentifier[];

  readonly disableTestWaiter?: boolean;
  /* Returns the cache mode associated with request, which is a string indicating how the request will interact with the browser's cache when fetching. */
  readonly cache?: RequestCache;
  /* Returns the credentials mode associated with request, which is a string indicating whether credentials will be sent with the request always, never, or only when sent to a same-origin URL. */
  readonly credentials?: RequestCredentials;
  /* Returns the kind of resource requested by request, e.g., "document" or "script". */
  readonly destination?: RequestDestination;
  /* Returns a Headers object consisting of the headers associated with request. Note that headers added in the network layer by the user agent will not be accounted for in this object, e.g., the "Host" header. */
  readonly headers?: Headers & { clone?(): Headers };
  /* Returns request's subresource integrity metadata, which is a cryptographic hash of the resource being fetched. Its value consists of multiple hashes separated by whitespace. [SRI] */
  readonly integrity?: string;
  /* Returns a boolean indicating whether or not request can outlive the global in which it was created. */
  readonly keepalive?: boolean;
  /* Returns request's HTTP method, which is "GET" by default. */
  readonly method?: HTTPMethod;
  /* Returns the mode associated with request, which is a string indicating whether the request will use CORS, or will be restricted to same-origin URLs. */
  readonly mode?: RequestMode;
  /* Returns the redirect mode associated with request, which is a string indicating how redirects for the request will be handled during fetching. A request will follow redirects by default. */
  readonly redirect?: RequestRedirect;
  /* Returns the referrer of request. Its value can be a same-origin URL if explicitly set in init, the empty string to indicate no referrer, and "about:client" when defaulting to the global's default. This is used during fetching to determine the value of the `Referer` header of the request being made. */
  readonly referrer?: string;
  /* Returns the referrer policy associated with request. This is used during fetching to compute the value of the request's referrer. */
  readonly referrerPolicy?: ReferrerPolicy;
  /* Returns the signal associated with request, which is an AbortSignal object indicating whether or not request has been aborted, and its abort event handler. */
  readonly signal?: AbortSignal;
  /* Returns the URL of request as a string. */
  readonly url?: string;
  /*
   * data that a handler should convert into
   * the query (GET) or body (POST)
   */
  readonly data?: Record<string, unknown>;
  /*
   * options specifically intended for handlers
   * to utilize to process the request
   */
  readonly options?: Record<string, unknown>;
}

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
  request: ImmutableRequestInfo;
  id: number;

  setStream(stream: ReadableStream): void;
  setResponse(response: Response | ResponseInfo): void;
}
