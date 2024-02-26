import { LegacyNetworkHandler } from '@ember-data/legacy-compat';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import { CacheHandler } from '@ember-data/store';

const TestHandler = {
  async request({ request }, next) {
    console.log('TestHandler.request', request);
    const newContext = await next(request);
    console.log('TestHandler.response after fetch', newContext.response);
    return next(newContext);
  },
};

export default class Requests extends RequestManager {
  constructor(args) {
    super(args);
    debugger;
    this.use([LegacyNetworkHandler, TestHandler, Fetch]);
    this.useCache(CacheHandler);
  }
}
