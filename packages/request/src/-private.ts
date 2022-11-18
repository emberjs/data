import { isDevelopingApp, isTesting, macroCondition } from '@embroider/macros';

interface Request {}

interface NextFn {
  (request: Request): Promise<unknown>;
}

interface RequestResponse {
  result: unknown;
}

interface Middleware {
  request(request: Request, next: NextFn): Promise<unknown>;
}

export default class RequestManager {
  #wares: Middleware[] = [];

  use(newWares: Middleware[]) {
    const wares = this.#wares;
    if (macroCondition(isDevelopingApp())) {
      if (Object.isFrozen(wares)) {
        throw new Error(`Cannot add a Middleware to a RequestManager after a request has been made`);
      }
    }
    wares.push(...newWares);
  }

  request(request: Request): Promise<RequestResponse> {
    const wares = this.#wares;
    if (macroCondition(isDevelopingApp())) {
      if (!Object.isFrozen(wares)) {
        Object.freeze(wares);
      }
    }
    return perform(wares, request);
  }
}

async function perform(wares: Readonly<Middleware[]>, request: Request, i: number = 0): Promise<RequestResponse> {
  if (i === wares.length) {
    throw new Error(`No middleware was able to handle this request.`);
  }
  function next(r: Request): Promise<RequestResponse> {
    return perform(wares, r, i + 1);
  }
  const result = await wares[i].request(request, next);
  return { result };
}
