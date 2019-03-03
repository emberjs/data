import { RecordIdentifier, identifierFor } from "./record-identifier";
import { default as RSVP, Promise } from 'rsvp';
import { DEBUG } from '@glimmer/env';
import { run as emberRunLoop } from '@ember/runloop';
import Adapter from "@ember/test/adapter";
import { AdapterCache } from "./adapter-cache";
import { assert, deprecate, warn, inspect } from '@ember/debug';
import Snapshot from './snapshot';
import { guardDestroyedStore } from './store/common';
import { normalizeResponseHelper } from './store/serializer-response';
import { serializerForAdapter } from './store/serializers';
import { QueryRequest, FindRecordExpression } from './fetch-manager';

import {
  _find,
  _findMany,
  _findHasMany,
  _findBelongsTo,
  _findAll,
  _query,
  _queryRecord,
} from './store/finders';

const touching = Symbol('touching');

enum RequestState {
  pending = 'pending',
  fulfilled = 'fulfilled',
  rejected = 'rejected'
}

export interface Request {
  state: RequestState,
  result?: any,
  query: QueryRequest,
  _touching: RecordIdentifier[]
}

export default class RequestCache {

  _pending: { [lid: string]: Request[] }
  _done: { [lid: string]: Request[] }

  constructor() {
    this._pending = Object.create(null);
    this._done = Object.create(null);
  }

  enqueue(promise: Promise<any>, queryRequest: QueryRequest) {
    if ('record' in queryRequest.query) {
      let query: FindRecordExpression = queryRequest.query;
      let lid = query.record.lid;
      if (!this._pending[lid]) {
        this._pending[lid] = [];
      }
      let request: Request = {
        state: RequestState.pending,
        query: queryRequest,
        _touching: [query.record]
      }
      this._pending[lid].push(request);
      promise.then((result) => {
        this._dequeue(lid, request);
        let finalizedRequest = {
          state: RequestState.fulfilled,
          query: queryRequest,
          _touching: request._touching,
          result
        }
        this._addDone(finalizedRequest);
      }, (error) => {
        this._dequeue(lid, request);
        let finalizedRequest = {
          state: RequestState.rejected,
          query: queryRequest,
          _touching: request._touching,
          result: error
        }
        this._addDone(finalizedRequest);
      });
    }
  }

  _dequeue(lid: string, request: Request) {
    this._pending[lid] = this._pending[lid].filter((req) => req !== request);
  }

  _addDone(request: Request) {
    request._touching.forEach(identifier => {
      if (!this._done[identifier.lid]) {
        this._done[identifier.lid] = [];
      }
      this._done[identifier.lid] = this._done[identifier.lid].filter((req) => req.query.op !== request.query.op);
      this._done[identifier.lid].push(request);
    });
  }

  getPending(identifier: RecordIdentifier): Request[] {
    if (this._pending[identifier.lid]) {
      return this._pending[identifier.lid];
    }
    return [];
  }

  // TODO Name!!
  getFinished(identifier: RecordIdentifier): Request[] {
    if (this._done[identifier.lid]) {
      return this._done[identifier.lid];
    }
    return [];
  }

}