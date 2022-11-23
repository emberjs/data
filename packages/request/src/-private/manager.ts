import { isDevelopingApp, isTesting, macroCondition } from '@embroider/macros';

import { assertValidRequest } from './debug';
import { Future, GenericCreateArgs, Handler, RequestInfo } from './types';
import { executeNextHandler } from './utils';

export class RequestManager {
  #handlers: Handler[] = [];

  constructor(options?: GenericCreateArgs) {
    Object.assign(this, options);
  }

  use(newHandlers: Handler[]) {
    const handlers = this.#handlers;
    if (macroCondition(isDevelopingApp())) {
      if (Object.isFrozen(handlers)) {
        throw new Error(`Cannot add a Handler to a RequestManager after a request has been made`);
      }
      if (!Array.isArray(newHandlers)) {
        throw new Error(
          `\`RequestManager.use(<Handler[]>)\` expects an array of handlers, but was called with \`${typeof newHandlers}\``
        );
      }
      newHandlers.forEach((handler, index) => {
        if (!handler || typeof handler !== 'object' || typeof handler.request !== 'function') {
          throw new Error(
            `\`RequestManager.use(<Handler[]>)\` expected to receive an array of handler objects with request methods, by the handler at index ${index} does not conform.`
          );
        }
      });
    }
    handlers.push(...newHandlers);
  }

  request<T = unknown>(request: RequestInfo): Future<T> {
    const handlers = this.#handlers;
    if (macroCondition(isDevelopingApp())) {
      if (!Object.isFrozen(handlers)) {
        Object.freeze(handlers);
      }
      assertValidRequest(request, true);
    }
    const controller = request.controller || new AbortController();
    if (request.controller) {
      delete request.controller;
    }
    let promise = executeNextHandler<T>(handlers, request, 0, {
      controller,
      response: null,
      stream: null,
    });
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
