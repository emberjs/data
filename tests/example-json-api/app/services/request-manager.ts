import { LegacyNetworkHandler } from '@ember-data/legacy-compat';
import type { Handler, NextFn, RequestContext } from '@ember-data/request';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';

/* eslint-disable no-console */
const TestHandler: Handler = {
  async request<T>(context: RequestContext, next: NextFn<T>) {
    console.log('TestHandler.request', context.request);
    const result = await next(Object.assign({}, context.request));
    console.log('TestHandler.response after fetch', result.response);
    return result;
  },
};

export default {
  create() {
    return new RequestManager().use([LegacyNetworkHandler, TestHandler, Fetch]);
  },
};
