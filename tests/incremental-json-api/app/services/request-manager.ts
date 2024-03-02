import { LegacyNetworkHandler } from '@ember-data/legacy-compat';
import type { Handler, NextFn, RequestContext } from '@ember-data/request';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';

/* eslint-disable no-console */
const TestHandler: Handler = {
  async request<T>(context: RequestContext, next: NextFn) {
    console.log('TestHandler.request', context.request);
    const newContext = await next(Object.assign({}, context.request));
    console.log('TestHandler.response after fetch', newContext.response);
    return newContext as T;
  },
};

export default class Requests extends RequestManager {
  constructor(args) {
    super(args);
    this.use([LegacyNetworkHandler, TestHandler, Fetch]);
  }
}
