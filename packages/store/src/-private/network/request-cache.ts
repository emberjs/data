/**
 * @module @ember-data/store
 */
import { DEBUG } from '@warp-drive/build-config/env';
import { assert } from '@warp-drive/build-config/macros';
import { getOrSetGlobal } from '@warp-drive/core-types/-private';
import type { ResourceCacheKey } from '@warp-drive/core-types/identifier';

import type { FindRecordOptions } from '../../-types/q/store';
import type { Store } from '../store-service';

const Touching = getOrSetGlobal('Touching', Symbol('touching'));
export const RequestPromise = getOrSetGlobal('RequestPromise', Symbol('promise'));
const EMPTY_ARR: RequestState[] = DEBUG ? (Object.freeze([]) as unknown as RequestState[]) : [];

export interface Operation {
  op: string;
  options: FindRecordOptions | undefined;
  recordIdentifier: ResourceCacheKey;
}

export interface FindRecordQuery extends Operation {
  op: 'findRecord';
}

export interface SaveRecordMutation extends Operation {
  op: 'saveRecord';
}

export interface Request {
  data: Operation[];
  options?: Record<string, unknown>;
}

export type RequestStates = 'pending' | 'fulfilled' | 'rejected';

export interface RequestState {
  state: RequestStates;
  type: 'query' | 'mutation';
  request: Request;
  response?: Response;
}

export interface Response {
  // rawData: unknown;
  data: unknown;
}

interface InternalRequest extends RequestState {
  [Touching]: ResourceCacheKey[];
  [RequestPromise]?: Promise<unknown>;
}

type RecordOperation = FindRecordQuery | SaveRecordMutation;
export type RequestSubscription = (requestState: RequestState) => void;

function hasRecordIdentifier(op: Operation): op is RecordOperation {
  return 'recordIdentifier' in op;
}

/**
 * The RequestStateService is used to track the state of requests
 * for fetching or updating known resource identifies that are inflight.
 *
 * @class RequestStateService
 * @public
 */
export class RequestStateService {
  _pending: Map<ResourceCacheKey, InternalRequest[]> = new Map();
  _done: Map<ResourceCacheKey, InternalRequest[]> = new Map();
  _subscriptions: Map<ResourceCacheKey, RequestSubscription[]> = new Map();
  _toFlush: InternalRequest[] = [];
  _store: Store;

  constructor(store: Store) {
    this._store = store;
  }

  _clearEntries(identifier: ResourceCacheKey) {
    this._done.delete(identifier);
  }

  _enqueue<T>(promise: Promise<T>, queryRequest: Request): Promise<T> {
    const query = queryRequest.data[0];
    if (hasRecordIdentifier(query)) {
      const identifier = query.recordIdentifier;
      const type = query.op === 'saveRecord' ? ('mutation' as const) : ('query' as const);
      if (!this._pending.has(identifier)) {
        this._pending.set(identifier, []);
      }
      const request: InternalRequest = {
        state: 'pending',
        request: queryRequest,
        type,
      } as InternalRequest;
      request[Touching] = [query.recordIdentifier];
      request[RequestPromise] = promise;
      this._pending.get(identifier)!.push(request);
      this._triggerSubscriptions(request);
      return promise.then(
        (result) => {
          this._dequeue(identifier, request);
          const finalizedRequest = {
            state: 'fulfilled',
            request: queryRequest,
            type,
            response: { data: result },
          } as InternalRequest;
          finalizedRequest[Touching] = request[Touching];
          this._addDone(finalizedRequest);
          this._triggerSubscriptions(finalizedRequest);
          return result;
        },
        (error) => {
          this._dequeue(identifier, request);
          const finalizedRequest = {
            state: 'rejected',
            request: queryRequest,
            type,
            response: { data: error },
          } as InternalRequest;
          finalizedRequest[Touching] = request[Touching];
          this._addDone(finalizedRequest);
          this._triggerSubscriptions(finalizedRequest);
          throw error;
        }
      );
    }
    assert(`Expected a well formed  query`);
  }

  _triggerSubscriptions(req: InternalRequest): void {
    if (req.state === 'pending') {
      this._flushRequest(req);
      return;
    }
    this._toFlush.push(req);

    if (this._toFlush.length === 1) {
      this._store.notifications._onNextFlush(() => {
        this._flush();
      });
    }
  }

  _flush(): void {
    this._toFlush.forEach((req) => {
      this._flushRequest(req);
    });
    this._toFlush = [];
  }

  _flushRequest(req: InternalRequest): void {
    req[Touching].forEach((identifier: ResourceCacheKey) => {
      const subscriptions = this._subscriptions.get(identifier);
      if (subscriptions) {
        subscriptions.forEach((callback) => callback(req));
      }
    });
  }

  _dequeue(identifier: ResourceCacheKey, request: InternalRequest) {
    const pending = this._pending.get(identifier)!;
    this._pending.set(
      identifier,
      pending.filter((req) => req !== request)
    );
  }

  _addDone(request: InternalRequest) {
    request[Touching].forEach((identifier) => {
      // TODO add support for multiple
      const requestDataOp = request.request.data[0].op;
      let requests = this._done.get(identifier);

      if (requests) {
        requests = requests.filter((req) => {
          // TODO add support for multiple
          let data: Operation;
          if (Array.isArray(req.request.data)) {
            data = req.request.data[0];
          } else {
            data = req.request.data;
          }
          return data.op !== requestDataOp;
        });
      }
      requests = requests || [];
      requests.push(request);
      this._done.set(identifier, requests);
    });
  }

  /**
   * Subscribe to requests for a given resource identity.
   *
   * The callback will receive the current state of the request.
   *
   * ```ts
   * interface RequestState {
   *   state: 'pending' | 'fulfilled' | 'rejected';
   *   type: 'query' | 'mutation';
   *   request: Request;
   *   response?: { data: unknown };
   * }
   * ```
   *
   * Note: It should be considered dangerous to use this API for more than simple
   * state derivation or debugging. The `request` and `response` properties are poorly
   * spec'd and may change unexpectedly when shifting what Handlers are in use or how
   * requests are issued from the Store.
   *
   * We expect to revisit this API in the near future as we continue to refine the
   * RequestManager ergonomics, as a simpler but more powerful direct integration
   * with the RequestManager for these purposes is likely to be a better long-term
   * design.
   *
   * @method subscribeForRecord
   * @public
   * @param {ResourceCacheKey} identifier
   * @param {(state: RequestState) => void} callback
   */
  subscribeForRecord(identifier: ResourceCacheKey, callback: RequestSubscription) {
    let subscriptions = this._subscriptions.get(identifier);
    if (!subscriptions) {
      subscriptions = [];
      this._subscriptions.set(identifier, subscriptions);
    }
    subscriptions.push(callback);
  }

  /**
   * Retrieve all active requests for a given resource identity.
   *
   * @method getPendingRequestsForRecord
   * @public
   * @param {ResourceCacheKey} identifier
   * @return {RequestState[]} an array of request states for any pending requests for the given identifier
   */
  getPendingRequestsForRecord(identifier: ResourceCacheKey): RequestState[] {
    return this._pending.get(identifier) || EMPTY_ARR;
  }

  /**
   * Retrieve the last completed request for a given resource identity.
   *
   * @method getLastRequestForRecord
   * @public
   * @param {ResourceCacheKey} identifier
   * @return {RequestState | null} the state of the most recent request for the given identifier
   */
  getLastRequestForRecord(identifier: ResourceCacheKey): RequestState | null {
    const requests = this._done.get(identifier);
    if (requests) {
      return requests[requests.length - 1];
    }
    return null;
  }
}
