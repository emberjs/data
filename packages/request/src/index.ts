import { isDevelopingApp, isTesting, macroCondition } from '@embroider/macros';

import { createFuture, Future } from './-private/future';

interface Request {
  /** Returns the cache mode associated with request, which is a string indicating how the request will interact with the browser's cache when fetching. */
  readonly cache: RequestCache;
  /** Returns the credentials mode associated with request, which is a string indicating whether credentials will be sent with the request always, never, or only when sent to a same-origin URL. */
  readonly credentials: RequestCredentials;
  /** Returns the kind of resource requested by request, e.g., "document" or "script". */
  readonly destination: RequestDestination;
  /** Returns a Headers object consisting of the headers associated with request. Note that headers added in the network layer by the user agent will not be accounted for in this object, e.g., the "Host" header. */
  readonly headers: Record<string, string>;
  /** Returns request's subresource integrity metadata, which is a cryptographic hash of the resource being fetched. Its value consists of multiple hashes separated by whitespace. [SRI] */
  readonly integrity: string;
  /** Returns a boolean indicating whether or not request can outlive the global in which it was created. */
  readonly keepalive: boolean;
  /** Returns request's HTTP method, which is "GET" by default. */
  readonly method: string;
  /** Returns the mode associated with request, which is a string indicating whether the request will use CORS, or will be restricted to same-origin URLs. */
  readonly mode: RequestMode;
  /** Returns the redirect mode associated with request, which is a string indicating how redirects for the request will be handled during fetching. A request will follow redirects by default. */
  readonly redirect: RequestRedirect;
  /** Returns the referrer of request. Its value can be a same-origin URL if explicitly set in init, the empty string to indicate no referrer, and "about:client" when defaulting to the global's default. This is used during fetching to determine the value of the `Referer` header of the request being made. */
  readonly referrer: string;
  /** Returns the referrer policy associated with request. This is used during fetching to compute the value of the request's referrer. */
  readonly referrerPolicy: ReferrerPolicy;
  /** Returns the signal associated with request, which is an AbortSignal object indicating whether or not request has been aborted, and its abort event handler. */
  readonly signal: AbortSignal;
  /** Returns the URL of request as a string. */
  readonly url: string;
}

interface RequestInfo extends Request {
  /**
   * data that a handler should convert into
   * the query (GET) or body (POST)
   */
  data?: Record<string, unknown>;
  /**
   * options specifically intended for handlers
   * to utilize to process the request
   */
  options?: Record<string, unknown>;
}

export interface ResponseInfo {}
export interface RequestContext {
  request: RequestInfo;

  setStream(stream: ReadableStream): void;
  setResponse(response: Response | ResponseInfo): void;
}

type NextFn<P = unknown> = (req: RequestInfo) => Future<P>;
export interface Handler {
  request<T = unknown>(context: RequestContext, next: NextFn): Promise<T>;
}

interface RequestResponse<T> {
  result: T;
}

type GenericCreateArgs = Record<string | symbol, unknown>;

export default class RequestManager {
  #handlers: Handler[] = [];

  constructor(options?: GenericCreateArgs) {
    Object.assign(this, options);
  }

  use(newHandlers: Handler[]) {
    const handlers = this.#handlers;
    if (macroCondition(isDevelopingApp())) {
      if (Object.isFrozen(handlers)) {
        throw new Error(`Cannot add a Middleware to a RequestManager after a request has been made`);
      }
    }
    handlers.push(...newHandlers);
  }

  request<T = unknown>(request: Request): Future<T> {
    const handlers = this.#handlers;
    if (macroCondition(isDevelopingApp())) {
      if (!Object.isFrozen(handlers)) {
        Object.freeze(handlers);
      }
    }
    let promise = perform<T>(handlers, request);
    if (macroCondition(isTesting())) {
      // const { waitForPromise } = importSync('ember-test-waiters');
      // promise = waitForPromise(promise);
    }
    return promise;
  }

  static create(options?: GenericCreateArgs) {
    return new this(options);
  }
}

function createContext(request: RequestInfo): RequestContext {
  const context = {
    request,
    setStream() {},
    setResponse() {},
  };
  return context;
}

function isFuture<T>(maybe: Future<T> | Promise<T>): maybe is Future<T> {
  return false;
}

async function perform<T>(wares: Readonly<Handler[]>, request: RequestInfo, i: number = 0): Future<T> {
  if (macroCondition(isDevelopingApp())) {
    if (i === wares.length) {
      throw new Error(`No handler was able to handle this request.`);
    }
  }

  let nextCalled = 0;
  function next(r: RequestInfo): Future<T> {
    nextCalled++;
    return perform(wares, r, i + 1);
  }
  const context = createContext(request);
  const maybeFuture = wares[i].request<T>(context, next);

  // if we immediately receive a Future, we curry in full
  if (isFuture<T>(maybeFuture) && nextCalled === 1) {
    // curry the future
    // TODO don't curry request,
    // return a new future
    return maybeFuture;
  }

  // create a new future
  const future = createFuture<T>(maybeFuture);

  const result = await maybeFuture;

  if (nextCalled === 1) {
  }

  return future;
}
