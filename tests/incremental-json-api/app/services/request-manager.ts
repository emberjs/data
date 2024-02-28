import { LegacyNetworkHandler } from '@ember-data/legacy-compat';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
// import { CacheHandler } from '@ember-data/store';

const TestHandler = {
  async request({ request }, next) {
    console.log('TestHandler.request', request);
    const newContext = await next(Object.assign({}, request));
    console.log('TestHandler.response after fetch', newContext.response);
    return newContext;
  },
};

export default class Requests extends RequestManager {
  constructor(args) {
    super(args);
    this.use([LegacyNetworkHandler, TestHandler, Fetch]);

    // TODO: This fails due to implementation in Store. It always adds cache.
    // Maybe we should change implementation, or just warn about not adding it

    // this.useCache(CacheHandler);
  }
}
