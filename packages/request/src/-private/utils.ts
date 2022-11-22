import { isDevelopingApp, macroCondition } from '@embroider/macros';

import { Context, ContextOwner } from './context';
import { assertValidRequest } from './debug';
import { createFuture, isFuture } from './future';
import type {
  DeferredFuture,
  Future,
  GodContext,
  Handler,
  RequestInfo,
  StructuredDataDocument,
  StructuredErrorDocument,
} from './types';

export function curryFuture<T>(owner: ContextOwner, inbound: Future<T>, outbound: DeferredFuture<T>): Future<T> {
  owner.setStream(inbound.getStream());

  inbound.then(
    (doc: StructuredDataDocument<T>) => {
      const document = {
        request: owner.request,
        response: doc.response,
        data: doc.data,
      };
      outbound.resolve(document);
    },
    (doc: StructuredErrorDocument) => {
      const document = new Error(doc.message) as unknown as StructuredErrorDocument;
      document.stack = doc.stack;
      document.request = owner.request;
      document.response = owner.response;
      document.error = doc.error || doc.message;

      outbound.reject(document);
    }
  );
  return outbound.promise;
}

export function handleOutcome<T>(owner: ContextOwner, inbound: Promise<T>, outbound: DeferredFuture<T>): Future<T> {
  inbound.then(
    (data: T) => {
      const document = {
        request: owner.request,
        response: owner.getResponse(),
        data,
      };
      outbound.resolve(document);
    },
    (error: Error & StructuredErrorDocument) => {
      error.request = owner.request;
      error.response = owner.getResponse();
      error.error = error.error || error.message;
      outbound.reject(error);
    }
  );
  return outbound.promise;
}

export function executeNextHandler<T>(
  wares: Readonly<Handler[]>,
  request: RequestInfo,
  i: number,
  god: GodContext
): Future<T> {
  if (macroCondition(isDevelopingApp())) {
    if (i === wares.length) {
      throw new Error(`No handler was able to handle this request.`);
    }
    assertValidRequest(request, false);
  }
  const owner = new ContextOwner(request, god);

  function next(r: RequestInfo): Future<T> {
    owner.nextCalled++;
    return executeNextHandler(wares, r, i + 1, god);
  }

  const context = new Context(owner);
  let outcome: Promise<T> | Future<T>;
  try {
    outcome = wares[i].request<T>(context, next);
    if (macroCondition(isDevelopingApp())) {
      if (!(outcome instanceof Promise)) {
        // eslint-disable-next-line no-console
        console.log({ request, handler: wares[i], outcome });
        if (outcome === undefined) {
          throw new Error(`Expected handler.request to return a promise, instead received undefined.`);
        }
        throw new Error(`Expected handler.request to return a promise, instead received a synchronous value.`);
      }
    }
  } catch (e) {
    outcome = Promise.reject<T>(e);
  }
  const future = createFuture<T>(owner);

  if (isFuture<T>(outcome)) {
    return curryFuture(owner, outcome, future);
  }

  return handleOutcome(owner, outcome, future);
}
