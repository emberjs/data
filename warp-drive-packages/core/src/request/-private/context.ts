import { DEBUG } from '@warp-drive/core/build-config/env';
import { assert } from '@warp-drive/core/build-config/macros';

import type { RequestKey } from '../../types/identifier';
import type { ImmutableHeaders, ImmutableRequestInfo, RequestInfo, ResponseInfo } from '../../types/request';
import { SkipCache } from '../../types/request';
import { deepFreeze } from './debug';
import { createDeferred } from './future';
import type { DeferredStream, GodContext } from './types';

export function upgradeHeaders(headers: Headers | ImmutableHeaders): ImmutableHeaders {
  (headers as ImmutableHeaders).clone = () => {
    return new Headers(headers);
  };
  (headers as ImmutableHeaders).toJSON = () => {
    return Array.from(headers as unknown as Iterable<[string, string]>);
  };
  return headers as ImmutableHeaders;
}

export function cloneResponseProperties(response: Response): ResponseInfo {
  const { headers, ok, redirected, status, statusText, type, url } = response;
  upgradeHeaders(headers);
  return {
    headers: headers as ImmutableHeaders,
    ok,
    redirected,
    status,
    statusText,
    type,
    url,
  };
}

export class ContextOwner {
  hasSetStream = false;
  hasSetResponse = false;
  hasSubscribers = false;
  stream: DeferredStream = createDeferred<ReadableStream | null>();
  response: ResponseInfo | null = null;
  declare request: ImmutableRequestInfo;
  declare enhancedRequest: ImmutableRequestInfo;
  nextCalled = 0;
  declare god: GodContext;
  declare controller: AbortController;
  declare requestId: number;
  declare isRoot: boolean;

  constructor(request: RequestInfo, god: GodContext, isRoot = false) {
    this.isRoot = isRoot;
    this.requestId = god.id;
    this.controller = request.controller || god.controller;
    this.stream.promise.sizeHint = 0;

    if (request.controller) {
      if (request.controller !== god.controller) {
        god.controller.signal.addEventListener('abort', () => {
          this.controller.abort(god.controller.signal.reason);
        });
      }
      delete request.controller;
    }
    let enhancedRequest: ImmutableRequestInfo = Object.assign(
      { signal: this.controller.signal },
      request
    ) as ImmutableRequestInfo;
    if (DEBUG) {
      if (!request?.cacheOptions?.[SkipCache]) {
        request = deepFreeze(request) as ImmutableRequestInfo;
        enhancedRequest = deepFreeze(enhancedRequest);
      }
    } else {
      if (request.headers) {
        upgradeHeaders(request.headers);
      }
    }
    this.enhancedRequest = enhancedRequest;
    this.request = request as ImmutableRequestInfo;
    this.god = god;
    this.stream.promise = this.stream.promise.then((stream: ReadableStream | null) => {
      if (this.god.stream === stream && this.hasSubscribers) {
        this.god.stream = null;
      }
      return stream;
    });
  }

  get hasRequestedStream(): boolean {
    return this.god.hasRequestedStream;
  }

  getResponse(): ResponseInfo | null {
    if (this.hasSetResponse) {
      return this.response;
    }
    if (this.nextCalled === 1) {
      return this.god.response;
    }
    return null;
  }
  getStream(): Promise<ReadableStream | null> {
    if (this.isRoot) {
      this.god.hasRequestedStream = true;
    }
    if (!this.hasSetResponse) {
      const hint = this.god.response?.headers?.get('content-length');
      this.stream.promise.sizeHint = hint ? parseInt(hint, 10) : 0;
    }
    this.hasSubscribers = true;
    return this.stream.promise;
  }
  abort(reason: DOMException): void {
    this.controller.abort(reason);
  }

  setStream(stream: ReadableStream | Promise<ReadableStream | null> | null): void {
    if (!this.hasSetStream) {
      this.hasSetStream = true;

      if (!(stream instanceof Promise)) {
        this.god.stream = stream;
      }
      // @ts-expect-error
      this.stream.resolve(stream);
    }
  }

  resolveStream(): void {
    this.setStream(this.nextCalled === 1 ? this.god.stream : null);
  }

  setResponse(response: ResponseInfo | Response | null): void {
    if (this.hasSetResponse) {
      if (DEBUG) {
        throw new Error(`Cannot setResponse when a response has already been set`);
      }
      return;
    }
    this.hasSetResponse = true;
    if (response instanceof Response) {
      // TODO potentially avoid cloning in prod
      let responseData = cloneResponseProperties(response);

      if (DEBUG) {
        responseData = deepFreeze(responseData);
      }
      this.response = responseData;
      this.god.response = responseData;
      const sizeHint = response.headers?.get('content-length');
      this.stream.promise.sizeHint = sizeHint ? parseInt(sizeHint, 10) : 0;
    } else {
      this.response = response;
      this.god.response = response;
    }
  }
}

export class Context {
  declare private ___owner: ContextOwner;
  declare request: ImmutableRequestInfo;
  declare id: number;
  declare private _isCacheHandler: boolean;
  declare private _finalized: boolean;

  constructor(owner: ContextOwner, isCacheHandler: boolean) {
    this.id = owner.requestId;
    this.___owner = owner;
    this.request = owner.enhancedRequest;
    this._isCacheHandler = isCacheHandler;
    this._finalized = false;
  }
  setStream(stream: ReadableStream | Promise<ReadableStream | null>): void {
    this.___owner.setStream(stream);
  }
  setResponse(response: ResponseInfo | Response | null): void {
    this.___owner.setResponse(response);
  }

  setIdentifier(identifier: RequestKey): void {
    assert(
      `setIdentifier may only be used synchronously from a CacheHandler`,
      identifier && this._isCacheHandler && !this._finalized
    );
    this.___owner.god.identifier = identifier;
  }

  get hasRequestedStream(): boolean {
    return this.___owner.hasRequestedStream;
  }

  _finalize(): void {
    this._finalized = true;
  }
}
export type HandlerRequestContext = Context;
