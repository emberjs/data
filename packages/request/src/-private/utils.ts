import { DEBUG } from '@warp-drive/build-config/env';
import {
  type RequestInfo,
  STRUCTURED,
  type StructuredDataDocument,
  type StructuredErrorDocument,
} from '@warp-drive/core-types/request';

import { Context, ContextOwner } from './context';
import { assertValidRequest } from './debug';
import { createFuture, isFuture } from './future';
import { setRequestResult } from './promise-cache';
import type { DeferredFuture, Future, GodContext, Handler } from './types';

export const IS_CACHE_HANDLER = Symbol('IS_CACHE_HANDLER');
export function curryFuture<T>(owner: ContextOwner, inbound: Future<T>, outbound: DeferredFuture<T>): Future<T> {
  owner.setStream(inbound.getStream());

  inbound.then(
    (doc: StructuredDataDocument<T>) => {
      const document = {
        [STRUCTURED]: true as const,
        request: owner.request,
        response: doc.response,
        content: doc.content,
      };
      outbound.resolve(document);
    },
    (error: Error & StructuredErrorDocument) => {
      if (isDoc(error)) {
        owner.setStream(owner.god.stream);
      }
      if (!error || !(error instanceof Error)) {
        try {
          throw new Error(error ? error : `Request Rejected with an Unknown Error`);
        } catch (e: unknown) {
          if (error && typeof error === 'object') {
            Object.assign(e as Error, error);
            (e as Error & StructuredErrorDocument).message =
              (error as Error).message || `Request Rejected with an Unknown Error`;
          }
          error = e as Error & StructuredErrorDocument;
        }
      }

      error[STRUCTURED] = true;
      error.request = owner.request;
      error.response = owner.getResponse();
      error.error = error.error || error.message;

      outbound.reject(error);
    }
  );
  return outbound.promise;
}

function isDoc<T>(doc: T | StructuredDataDocument<T>): doc is StructuredDataDocument<T> {
  return doc && (doc as StructuredDataDocument<T>)[STRUCTURED] === true;
}

export type HttpErrorProps = {
  code: number;
  name: string;
  status: number;
  statusText: string;
  isRequestError: boolean;
};

export function enhanceReason(reason?: string) {
  return new DOMException(reason || 'The user aborted a request.', 'AbortError');
}

export function handleOutcome<T>(
  owner: ContextOwner,
  inbound: Promise<T | StructuredDataDocument<T>>,
  outbound: DeferredFuture<T>
): Future<T> {
  inbound.then(
    (content: T | StructuredDataDocument<T>) => {
      if (owner.controller.signal.aborted) {
        // the next function did not respect the signal, we handle it here
        outbound.reject(enhanceReason(owner.controller.signal.reason as string));
        return;
      }
      if (isDoc(content)) {
        owner.setStream(owner.god.stream);
        content = content.content;
      }
      const document = {
        [STRUCTURED]: true as const,
        request: owner.request,
        response: owner.getResponse(),
        content,
      };
      outbound.resolve(document);
    },
    (error: Error & StructuredErrorDocument) => {
      if (isDoc(error)) {
        owner.setStream(owner.god.stream);
      }
      if (!error) {
        try {
          throw new Error(`Request Rejected with an Unknown Error`);
        } catch (e: unknown) {
          error = e as Error & StructuredErrorDocument;
        }
      }

      error[STRUCTURED] = true;
      error.request = owner.request;
      error.response = owner.getResponse();
      error.error = error.error || error.message;
      outbound.reject(error);
    }
  );
  return outbound.promise;
}

function isCacheHandler(handler: Handler & { [IS_CACHE_HANDLER]?: boolean }, index: number): boolean {
  return index === 0 && Boolean(handler[IS_CACHE_HANDLER]);
}

export function executeNextHandler<T>(
  wares: Readonly<Handler[]>,
  request: RequestInfo,
  i: number,
  god: GodContext
): Future<T> {
  if (DEBUG) {
    if (i === wares.length) {
      throw new Error(`No handler was able to handle this request.`);
    }
    assertValidRequest(request, false);
  }
  const owner = new ContextOwner(request, god, i === 0);

  function next(r: RequestInfo): Future<T> {
    owner.nextCalled++;
    return executeNextHandler(wares, r, i + 1, god);
  }

  const context = new Context(owner);
  let outcome: Promise<T | StructuredDataDocument<T>> | Future<T>;
  try {
    outcome = wares[i].request<T>(context, next);
    if (!!outcome && isCacheHandler(wares[i], i)) {
      if (!(outcome instanceof Promise)) {
        setRequestResult(owner.requestId, { isError: false, result: outcome });
        outcome = Promise.resolve(outcome);
      }
    } else if (DEBUG) {
      if (!outcome || (!(outcome instanceof Promise) && !(typeof outcome === 'object' && 'then' in outcome))) {
        // eslint-disable-next-line no-console
        console.log({ request, handler: wares[i], outcome });
        if (outcome === undefined) {
          throw new Error(`Expected handler.request to return a promise, instead received undefined.`);
        }
        throw new Error(`Expected handler.request to return a promise, instead received a synchronous value.`);
      }
    }
  } catch (e) {
    if (isCacheHandler(wares[i], i)) {
      setRequestResult(owner.requestId, { isError: true, result: e });
    }
    outcome = Promise.reject<StructuredDataDocument<T>>(e);
  }
  const future = createFuture<T>(owner);

  if (isFuture<T>(outcome)) {
    return curryFuture(owner, outcome, future);
  }

  return handleOutcome(owner, outcome, future);
}
