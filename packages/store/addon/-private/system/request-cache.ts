import type { ResolvedRegistry } from '@ember-data/types';
import type { RecordType } from '@ember-data/types/utils';

import type {
  FindRecordQuery,
  Operation,
  Request,
  RequestState,
  SaveRecordMutation,
} from '../ts-interfaces/fetch-manager';
import { RequestStateEnum } from '../ts-interfaces/fetch-manager';
import type { RecordIdentifier } from '../ts-interfaces/identifier';

const Touching: unique symbol = Symbol('touching');
export const RequestPromise: unique symbol = Symbol('promise');

interface InternalRequest<R extends ResolvedRegistry, T extends RecordType<R>> extends RequestState {
  [Touching]: RecordIdentifier<T>[];
  [RequestPromise]?: Promise<unknown>;
}

type RecordOperation = FindRecordQuery | SaveRecordMutation;

function hasRecordIdentifier(op: Operation): op is RecordOperation {
  return 'recordIdentifier' in op;
}

export default class RequestCache<R extends ResolvedRegistry, T extends RecordType<R>> {
  _pending: { [lid: string]: InternalRequest<R, T>[] } = Object.create(null);
  _done: { [lid: string]: InternalRequest<R, T>[] } = Object.create(null);
  _subscriptions: { [lid: string]: Function[] } = Object.create(null);

  enqueue(promise: Promise<unknown>, queryRequest: Request) {
    let query = queryRequest.data[0];
    if (hasRecordIdentifier(query)) {
      let lid = query.recordIdentifier.lid;
      let type = query.op === 'saveRecord' ? ('mutation' as const) : ('query' as const);
      if (!this._pending[lid]) {
        this._pending[lid] = [];
      }
      let request: InternalRequest<R, T> = {
        state: RequestStateEnum.pending,
        request: queryRequest,
        type,
        [Touching]: [query.recordIdentifier],
        [RequestPromise]: promise,
      };

      this._pending[lid].push(request);
      this._triggerSubscriptions(request);
      promise.then(
        (result) => {
          this._dequeue(lid, request);
          let finalizedRequest = {
            state: RequestStateEnum.fulfilled,
            request: queryRequest,
            type,
            response: { data: result },
          } as InternalRequest<R, T>;
          finalizedRequest[Touching] = request[Touching];
          this._addDone(finalizedRequest);
          this._triggerSubscriptions(finalizedRequest);
        },
        (error) => {
          this._dequeue(lid, request);
          let finalizedRequest = {
            state: RequestStateEnum.rejected,
            request: queryRequest,
            type,
            response: { data: error && error.error },
          } as InternalRequest<R, T>;
          finalizedRequest[Touching] = request[Touching];
          this._addDone(finalizedRequest);
          this._triggerSubscriptions(finalizedRequest);
        }
      );
    }
  }

  _triggerSubscriptions(req: InternalRequest<R, T>) {
    req[Touching].forEach((identifier) => {
      if (this._subscriptions[identifier.lid]) {
        this._subscriptions[identifier.lid].forEach((callback) => callback(req));
      }
    });
  }

  _dequeue(lid: string, request: InternalRequest<R, T>) {
    this._pending[lid] = this._pending[lid].filter((req) => req !== request);
  }

  _addDone(request: InternalRequest<R, T>) {
    request[Touching].forEach((identifier) => {
      if (!this._done[identifier.lid]) {
        this._done[identifier.lid] = [];
      }
      // TODO add support for multiple
      let requestDataOp = request.request.data[0].op;
      this._done[identifier.lid] = this._done[identifier.lid].filter((req) => {
        // TODO add support for multiple
        let data;
        if (req.request.data instanceof Array) {
          data = req.request.data[0];
        } else {
          data = req.request.data;
        }
        return data.op !== requestDataOp;
      });
      this._done[identifier.lid].push(request);
    });
  }

  subscribeForRecord(identifier: RecordIdentifier<T>, callback: (requestState: RequestState) => void) {
    if (!this._subscriptions[identifier.lid]) {
      this._subscriptions[identifier.lid] = [];
    }
    this._subscriptions[identifier.lid].push(callback);
  }

  getPendingRequestsForRecord(identifier: RecordIdentifier<T>): RequestState[] {
    if (this._pending[identifier.lid]) {
      return this._pending[identifier.lid];
    }
    return [];
  }

  getLastRequestForRecord(identifier: RecordIdentifier<T>): RequestState | null {
    let requests = this._done[identifier.lid];
    if (requests) {
      return requests[requests.length - 1];
    }
    return null;
  }
}
