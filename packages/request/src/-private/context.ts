import { createDeferred } from './future';
import type { Deferred, GodContext, RequestInfo, ResponseInfo } from './types';

export class ContextOwner {
  hasSetStream = false;
  hasSetResponse = false;
  stream: Deferred<ReadableStream | null> = createDeferred<ReadableStream | null>();
  response: ResponseInfo | Response | null = null;
  request: RequestInfo;
  nextCalled: number = 0;
  god: GodContext;

  constructor(request: RequestInfo, god: GodContext) {
    this.request = request;
    this.god = god;
  }

  getResponse(): ResponseInfo | Response | null {
    return this.response;
  }
  getStream(): Promise<ReadableStream | null> {
    return this.stream.promise;
  }
  abort() {
    this.god.controller.abort();
  }

  setStream(stream: ReadableStream | Promise<ReadableStream | null>) {
    if (!this.hasSetStream) {
      this.hasSetStream = true;
      this.stream;
    }
  }

  setResponse(response: ResponseInfo | Response) {
    this.hasSetResponse = true;
    this.response = response;
  }
}

export class Context {
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
export type HandlerRequestContext = Context;
