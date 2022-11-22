import { isDevelopingApp, macroCondition } from '@embroider/macros';

import { deepFreeze } from './debug';
import { createDeferred } from './future';
import type { Deferred, GodContext, ImmutableHeaders, ImmutableRequestInfo, RequestInfo, ResponseInfo } from './types';

export class ContextOwner {
  hasSetStream = false;
  hasSetResponse = false;
  hasSubscribers = false;
  stream: Deferred<ReadableStream | null> = createDeferred<ReadableStream | null>();
  response: ResponseInfo | Response | null = null;
  request: ImmutableRequestInfo;
  nextCalled: number = 0;
  god: GodContext;

  constructor(request: RequestInfo, god: GodContext) {
    if (macroCondition(isDevelopingApp())) {
      request = deepFreeze(request) as ImmutableRequestInfo;
    } else {
      if (request.headers) {
        (request.headers as ImmutableHeaders).clone = () => {
          return new Headers([...request.headers!.entries()]);
        };
      }
    }
    this.request = request as ImmutableRequestInfo;
    this.god = god;
    this.stream.promise = this.stream.promise.then((stream: ReadableStream | null) => {
      if (this.god.stream === stream && this.hasSubscribers) {
        this.god.stream = null;
      }
      return stream;
    });
  }

  getResponse(): ResponseInfo | Response | null {
    return this.response;
  }
  getStream(): Promise<ReadableStream | null> {
    this.hasSubscribers = true;
    return this.stream.promise;
  }
  abort() {
    this.god.controller.abort();
  }

  setStream(stream: ReadableStream | Promise<ReadableStream | null> | null) {
    if (!this.hasSetStream) {
      this.hasSetStream = true;

      if (!(stream instanceof Promise)) {
        this.god.stream = stream;
      }
      // @ts-expect-error
      this.stream.resolve(stream);
    }
  }

  resolveStream() {
    this.setStream(this.nextCalled === 1 ? this.god.stream : null);
  }

  setResponse(response: ResponseInfo | Response) {
    this.hasSetResponse = true;
    this.response = response;
  }
}

export class Context {
  #owner: ContextOwner;
  request: ImmutableRequestInfo;

  constructor(owner: ContextOwner) {
    this.#owner = owner;
    this.request = owner.request;
  }
  setStream(stream: ReadableStream | Promise<ReadableStream | null>) {
    this.#owner.setStream(stream);
  }
  setResponse(response: ResponseInfo | Response) {
    this.#owner.setResponse(response);
  }
}
export type HandlerRequestContext = Context;
