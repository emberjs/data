import { isDevelopingApp, isTesting, macroCondition } from '@embroider/macros';

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

interface GodContext {
  response: ResponseInfo | Response | null;
  stream: ReadableStream | Promise<ReadableStream | null> | null;
}

interface StructuredDocument<T> {
  request: RequestInfo;
  response: Response | ResponseInfo | null;
  data?: T;
  error?: Error;
}

type Deferred<T> = {
  resolve(v: T): void;
  reject(v: unknown): void;
  promise: Promise<T>;
};

type Future<T> = Promise<StructuredDocument<T>> & {
  abort(): void;
  getStream(): Promise<ReadableStream | null>;
};

type DeferredFuture<T> = {
  resolve(v: StructuredDocument<T>): void;
  reject(v: unknown): void;
  promise: Future<T>;
};

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
    let promise = executeNextHandler<T>(handlers, request, 0, { response: null, stream: null });
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

const IS_FUTURE = Symbol('IS_FUTURE');

function isFuture<T>(maybe: Future<T> | Promise<T>): maybe is Future<T> {
  return maybe[IS_FUTURE] === true;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: (v: T) => void;
  let reject!: (v: unknown) => void;
  let promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { resolve, reject, promise };
}
class ContextOwner {
  hasSetStream = false;
  hasSetResponse = false;
  stream: ReadableStream | Promise<ReadableStream | null> | null = null;
  response: ResponseInfo | Response | null = null;
  request: RequestInfo;
  nextCalled: number = 0;
  god: GodContext;

  constructor(request: RequestInfo, god: GodContext) {
    this.request = request;
    this.god = god;
  }

  getResponse(): ResponseInfo | Response | null;
  getStream(): Promise<ReadableStream | null> {}
  abort() {}

  setStream(stream: ReadableStream | Promise<ReadableStream | null>) {
    this.hasSetStream = true;
    this.stream = stream;
  }

  setResponse(response: ResponseInfo | Response) {
    this.hasSetResponse = true;
    this.response = response;
  }
}

function createFuture<T>(owner: ContextOwner): DeferredFuture<T> {
  const deferred = createDeferred<T>() as unknown as DeferredFuture<T>;
  const { promise } = deferred;
  promise[IS_FUTURE] = true;
  promise.getStream = () => {
    return owner.getStream();
  };
  promise.abort = () => {
    owner.abort();
  };

  return deferred;
}

class Context {
  #owner: ContextOwner;
  request: RequestInfo;

  constructor(owner: ContextOwner) {
    this.#owner = owner;
    this.request = owner.request;
  }
  setStream(stream: ReadableStream) {
    this.#owner.setStream(stream);
  }
  setResponse(response: ResponseInfo | Response) {
    this.#owner.setResponse(response);
  }
}

function curryFuture<T>(owner: ContextOwner, inbound: Future<T>, outbound: DeferredFuture<T>): Future<T> {
  owner.setStream(inbound.getStream());

  inbound.then(
    (doc: StructuredDocument<T>) => {
      const document = {
        request: owner.request,
        response: doc.response,
        data: doc.data!,
      };
      outbound.resolve(document);
    },
    (doc: StructuredDocument<T>) => {
      const document = {
        request: owner.request,
        response: doc.response,
        error: doc.error,
      };
      outbound.reject(document);
    }
  );
  return outbound.promise;
}

function handleOutcome<T>(owner: ContextOwner, inbound: Promise<T>, outbound: DeferredFuture<T>): Future<T> {
  inbound.then(
    (data: T) => {
      const document = {
        request: owner.request,
        response: owner.getResponse(),
        data,
      };
      outbound.resolve(document);
    },
    (error: Error) => {
      outbound.reject({
        request: owner.request,
        response: owner.getResponse(),
        error,
      });
    }
  );
  return outbound.promise;
}

function executeNextHandler<T>(
  wares: Readonly<Handler[]>,
  request: RequestInfo,
  i: number,
  god: GodContext
): Future<T> {
  if (macroCondition(isDevelopingApp())) {
    if (i === wares.length) {
      throw new Error(`No handler was able to handle this request.`);
    }
  }
  const owner = new ContextOwner(request, god);

  function next(r: RequestInfo): Future<T> {
    owner.nextCalled++;
    return executeNextHandler(wares, r, i + 1, owner);
  }

  const context = new Context(owner);
  const outcome = wares[i].request<T>(context, next);
  const future = createFuture<T>(owner);

  if (isFuture<T>(outcome)) {
    return curryFuture(owner, outcome, future);
  }

  return handleOutcome(owner, outcome, future);
}
