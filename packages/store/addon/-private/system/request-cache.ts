import { RequestStateEnum } from '../ts-interfaces/fetch-manager';
import { addSymbol, symbol } from '../ts-interfaces/utils/symbol';

type FindRecordQuery = import('../ts-interfaces/fetch-manager').FindRecordQuery;
type SaveRecordMutation = import('../ts-interfaces/fetch-manager').SaveRecordMutation;
type Request = import('../ts-interfaces/fetch-manager').Request;
type RequestState = import('../ts-interfaces/fetch-manager').RequestState;
type Operation = import('../ts-interfaces/fetch-manager').Operation;
type RecordIdentifier = import('../ts-interfaces/identifier').RecordIdentifier;

const Touching: unique symbol = symbol('touching');
export const RequestPromise: unique symbol = symbol('promise');

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
  _done: { [lid: string]: InternalRequest[] } = Object.create(null);
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
        state: RequestStateEnum.pending,
        request: queryRequest,
        type,
      } as InternalRequest;
      addSymbol(request, Touching, [query.recordIdentifier]);
      addSymbol(request, RequestPromise, promise);
      this._pending[lid].push(request);
      this._triggerSubscriptions(request);
      promise.then(
        result => {
          this._dequeue(lid, request);
          let finalizedRequest = {
            state: RequestStateEnum.fulfilled,
            request: queryRequest,
            type,
            response: { data: result },
          } as InternalRequest;
          addSymbol(finalizedRequest, Touching, request[Touching]);
          this._addDone(finalizedRequest);
          this._triggerSubscriptions(finalizedRequest);
        },
        error => {
          this._dequeue(lid, request);
          let finalizedRequest = {
            state: RequestStateEnum.rejected,
            request: queryRequest,
            type,
            response: { data: error && error.error },
          } as InternalRequest;
          addSymbol(finalizedRequest, Touching, request[Touching]);
          this._addDone(finalizedRequest);
          this._triggerSubscriptions(finalizedRequest);
        }
      );
    }
  }

  _triggerSubscriptions(req: InternalRequest) {
    req[Touching].forEach(identifier => {
      if (this._subscriptions[identifier.lid]) {
        this._subscriptions[identifier.lid].forEach(callback => callback(req));
      }
    });
  }

  _dequeue(lid: string, request: InternalRequest) {
    this._pending[lid] = this._pending[lid].filter(req => req !== request);
  }

  _addDone(request: InternalRequest) {
    request[Touching].forEach(identifier => {
      if (!this._done[identifier.lid]) {
        this._done[identifier.lid] = [];
      }
      // TODO add support for multiple
      let requestDataOp = request.request.data[0].op;
      this._done[identifier.lid] = this._done[identifier.lid].filter(req => {
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
    let requests = this._done[identifier.lid];
    if (requests) {
      return requests[requests.length - 1];
    }
    return null;
  }
}
