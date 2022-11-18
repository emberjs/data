import { isDevelopingApp, isTesting, macroCondition } from '@embroider/macros';

interface Request {}

interface NextFn {
  (request: Request): Promise<unknown>;
}

interface RequestResponse<T> {
  result: unknown;
}

interface Middleware {
  request(request: Request, next: NextFn): Promise<unknown>;
}

type GenericCreateArgs = Record<string | symbol, unknown>;

export default class RequestManager {
  #wares: Middleware[] = [];

  constructor(options?: GenericCreateArgs) {
    Object.assign(this, options);
  }

  use(newWares: Middleware[]) {
    const wares = this.#wares;
    if (macroCondition(isDevelopingApp())) {
      if (Object.isFrozen(wares)) {
        throw new Error(`Cannot add a Middleware to a RequestManager after a request has been made`);
      }
    }
    wares.push(...newWares);
  }

  async request<T>(request: Request): Promise<RequestResponse<T>> {
    const wares = this.#wares;
    if (macroCondition(isDevelopingApp())) {
      if (!Object.isFrozen(wares)) {
        Object.freeze(wares);
      }
    }
    let promise = Promise.resolve(perform(wares, request));
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

async function perform<T>(wares: Readonly<Middleware[]>, request: Request, i: number = 0): Promise<RequestResponse<T>> {
  if (macroCondition(isDevelopingApp())) {
    if (i === wares.length) {
      throw new Error(`No middleware was able to handle this request.`);
    }
  }
  function next(r: Request): Promise<RequestResponse<T>> {
    return perform(wares, r, i + 1);
  }
  const result = await wares[i].request(request, next);
  return { result };
}
