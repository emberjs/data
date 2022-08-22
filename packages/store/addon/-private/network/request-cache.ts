import type {
  FindRecordQuery,
  Operation,
  Request,
  RequestState,
  SaveRecordMutation,
} from '@ember-data/types/q/fetch-manager';
import type { RecordIdentifier, StableRecordIdentifier } from '@ember-data/types/q/identifier';

const Touching: unique symbol = Symbol('touching');
export const RequestPromise: unique symbol = Symbol('promise');

interface InternalRequest extends RequestState {
  [Touching]: RecordIdentifier[];
  [RequestPromise]?: Promise<any>;
}

type RecordOperation = FindRecordQuery | SaveRecordMutation;

function hasRecordIdentifier(op: Operation): op is RecordOperation {
  return 'recordIdentifier' in op;
}

export default class RequestCache {
  _pending: { [lid: string]: InternalRequest[] } = Object.create(null);
  _done: Map<StableRecordIdentifier, InternalRequest[]> = new Map();
  _subscriptions: { [lid: string]: Function[] } = Object.create(null);

  enqueue(promise: Promise<any>, queryRequest: Request) {
    let query = queryRequest.data[0];
    if (hasRecordIdentifier(query)) {
      let lid = query.recordIdentifier.lid;
      let type = query.op === 'saveRecord' ? ('mutation' as const) : ('query' as const);
      if (!this._pending[lid]) {
        this._pending[lid] = [];
      }
      let request: InternalRequest = {
        state: 'pending',
        request: queryRequest,
        type,
      } as InternalRequest;
      request[Touching] = [query.recordIdentifier];
      request[RequestPromise] = promise;
      this._pending[lid].push(request);
      this._triggerSubscriptions(request);
      promise.then(
        (result) => {
          this._dequeue(lid, request);
          let finalizedRequest = {
            state: 'fulfilled',
            request: queryRequest,
            type,
            response: { data: result },
          } as InternalRequest;
          finalizedRequest[Touching] = request[Touching];
          this._addDone(finalizedRequest);
          this._triggerSubscriptions(finalizedRequest);
        },
        (error) => {
          this._dequeue(lid, request);
          let finalizedRequest = {
            state: 'rejected',
            request: queryRequest,
            type,
            response: { data: error },
          } as InternalRequest;
          finalizedRequest[Touching] = request[Touching];
          this._addDone(finalizedRequest);
          this._triggerSubscriptions(finalizedRequest);
        }
      );
    }
  }

  _triggerSubscriptions(req: InternalRequest) {
    req[Touching].forEach((identifier) => {
      if (this._subscriptions[identifier.lid]) {
        this._subscriptions[identifier.lid].forEach((callback) => callback(req));
      }
    });
  }

  _dequeue(lid: string, request: InternalRequest) {
    this._pending[lid] = this._pending[lid].filter((req) => req !== request);
  }

  _addDone(request: InternalRequest) {
    request[Touching].forEach((identifier) => {
      // TODO add support for multiple
      let requestDataOp = request.request.data[0].op;
      let requests = this._done.get(identifier);

      if (requests) {
        requests = requests.filter((req) => {
          // TODO add support for multiple
          let data;
          if (req.request.data instanceof Array) {
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

  subscribeForRecord(identifier: RecordIdentifier, callback: (requestState: RequestState) => void) {
    if (!this._subscriptions[identifier.lid]) {
      this._subscriptions[identifier.lid] = [];
    }
    this._subscriptions[identifier.lid].push(callback);
  }

  getPendingRequestsForRecord(identifier: RecordIdentifier): RequestState[] {
    if (this._pending[identifier.lid]) {
      return this._pending[identifier.lid];
    }
    return [];
  }

  getLastRequestForRecord(identifier: RecordIdentifier): RequestState | null {
    let requests = this._done.get(identifier);
    if (requests) {
      return requests[requests.length - 1];
    }
    return null;
  }
}
