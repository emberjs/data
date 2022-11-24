/**
 * @module @ember-data/request
 */
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
  method?: string;
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
}
export type ImmutableHeaders = Headers & { clone(): Headers; toJSON(): [string, string][] };
export interface GodContext {
  controller: AbortController;
  response: ResponseInfo | null;
  stream: ReadableStream | Promise<ReadableStream | null> | null;
}

export interface StructuredDataDocument<T> {
  request: RequestInfo;
  response: Response | ResponseInfo | null;
  data: T;
}
export interface StructuredErrorDocument extends Error {
  request: RequestInfo;
  response: Response | ResponseInfo | null;
  error: string | object;
}

export type Deferred<T> = {
  resolve(v: T): void;
  reject(v: unknown): void;
  promise: Promise<T>;
};

/**
 * @class Future
 * @internal
 */
export type Future<T> = Promise<StructuredDataDocument<T>> & {
  /**
   * Cancel this request by firing the AbortController's signal.
   *
   * @method abort
   * @internal
   * @returns {void}
   */
  abort(): void;
  /**
   * Get the response stream, if any, once made available.
   *
   * @method getStream
   * @internal
   * @returns {Promise<ReadableStream | null>}
   */
  getStream(): Promise<ReadableStream | null>;
};

export type DeferredFuture<T> = {
  resolve(v: StructuredDataDocument<T>): void;
  reject(v: unknown): void;
  promise: Future<T>;
};

export interface RequestInfo extends Request {
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
  /* Returns the cache mode associated with request, which is a string indicating how the request will interact with the browser's cache when fetching. */
  readonly cache?: RequestCache;
  /* Returns the credentials mode associated with request, which is a string indicating whether credentials will be sent with the request always, never, or only when sent to a same-origin URL. */
  readonly credentials?: RequestCredentials;
  /* Returns the kind of resource requested by request, e.g., "document" or "script". */
  readonly destination?: RequestDestination;
  /* Returns a Headers object consisting of the headers associated with request. Note that headers added in the network layer by the user agent will not be accounted for in this object, e.g., the "Host" header. */
  readonly headers?: Headers & { clone(): Headers };
  /* Returns request's subresource integrity metadata, which is a cryptographic hash of the resource being fetched. Its value consists of multiple hashes separated by whitespace. [SRI] */
  readonly integrity?: string;
  /* Returns a boolean indicating whether or not request can outlive the global in which it was created. */
  readonly keepalive?: boolean;
  /* Returns request's HTTP method, which is "GET" by default. */
  readonly method?: string;
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

  setStream(stream: ReadableStream): void;
  setResponse(response: Response | ResponseInfo): void;
}

export type NextFn<P = unknown> = (req: RequestInfo) => Future<P>;
export interface Handler {
  request<T = unknown>(context: RequestContext, next: NextFn<T>): Promise<T> | Future<T>;
}

export interface RequestResponse<T> {
  result: T;
}

export type GenericCreateArgs = Record<string | symbol, unknown>;
