import { RecordIdentifier, identifierForIM } from "./record-identifier";
import { default as RSVP, Promise } from 'rsvp';
import { DEBUG } from '@glimmer/env';
import { run as emberRunLoop } from '@ember/runloop';
import Adapter from "@ember/test/adapter";
import { AdapterCache } from "./adapter-cache";
import { assert, warn, inspect } from '@ember/debug';
import Snapshot from './snapshot';
import { guardDestroyedStore } from './store/common';
import { normalizeResponseHelper } from './store/serializer-response';
import { serializerForAdapter } from './store/serializers';
import { Request, FindRecordQuery, RequestState } from './fetch-manager';

import {
  _findHasMany,
  _findBelongsTo,
  _findAll,
  _query,
  _queryRecord,
} from './store/finders';

const touching = Symbol('touching');

enum RequestStateEnum {
  pending = 'pending',
  fulfilled = 'fulfilled',
  rejected = 'rejected'
}

export interface InternalRequest extends RequestState {
  _touching: RecordIdentifier[]
}

export default class RequestCache {

  _pending: { [lid: string]: InternalRequest[] }
  _done: { [lid: string]: InternalRequest[] }
  _subscriptions: { [lid: string]: Function[] }

  constructor() {
    this._pending = Object.create(null);
    this._done = Object.create(null);
    this._subscriptions = Object.create(null);
  }

  enqueue(promise: Promise<any>, queryRequest: Request) {
    if ('identifier' in queryRequest.data) {
      let query: FindRecordQuery = queryRequest.data;
      let lid = query.identifier.lid;
      if (!this._pending[lid]) {
        this._pending[lid] = [];
      }
      let request: InternalRequest = {
        state: RequestStateEnum.pending,
        request: queryRequest,
        type:  <const> 'query',
        _touching: [query.identifier]
      }
      this._pending[lid].push(request);
      this._triggerSubscriptions(request);
      promise.then((result) => {
        this._dequeue(lid, request);
        let finalizedRequest = {
          state: RequestStateEnum.fulfilled,
          request: queryRequest,
          type:  <const> 'query',
          _touching: request._touching,
          result
        }
        this._addDone(finalizedRequest);
        this._triggerSubscriptions(finalizedRequest);
      }, (error) => {
        this._dequeue(lid, request);
        let finalizedRequest = {
          state: RequestStateEnum.rejected,
          request: queryRequest,
          type:  <const> 'query',
          _touching: request._touching,
          result: error
        }
        this._addDone(finalizedRequest);
        this._triggerSubscriptions(finalizedRequest);
      });
    }
  }

  _triggerSubscriptions(req: InternalRequest) {
    req._touching.forEach((identifier) => {
      if (this._subscriptions[identifier.lid]) {
        this._subscriptions[identifier.lid].forEach((callback) => callback(req));
      }
    })
  }

  _dequeue(lid: string, request: InternalRequest) {
    this._pending[lid] = this._pending[lid].filter((req) => req !== request);
  }

  _addDone(request: InternalRequest) {
    request._touching.forEach(identifier => {
      if (!this._done[identifier.lid]) {
        this._done[identifier.lid] = [];
      }
      // TODO add support for multiple
      let requestDataOp = request.request.data instanceof Array ? request.request.data[0].op : request.request.data.op;
      this._done[identifier.lid] = this._done[identifier.lid].filter((req) => {

        // TODO add support for multiple
        let data;
        if (req.request.data instanceof Array) {
          data = req.request.data[0];
        } else{
          data = req.request.data;
        }
        return data.op !== requestDataOp;
      });
      this._done[identifier.lid].push(request);
    });
  }

  subscribe(identifier: RecordIdentifier, callback: Function) {
    if (!this._subscriptions[identifier.lid]) {
      this._subscriptions[identifier.lid] = [];
    }
    this._subscriptions[identifier.lid].push(callback);
  }

  getPendingRequests(identifier: RecordIdentifier): RequestState[] {
    if (this._pending[identifier.lid]) {
      return this._pending[identifier.lid];
    }
    return [];
  }

  getLastRequest(identifier: RecordIdentifier): RequestState | null {
    let requests = this._done[identifier.lid];
    if (requests){
      return requests[requests.length];
    }
    return null;
  }
}