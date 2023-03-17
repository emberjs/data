import { Cache } from '@ember-data/json-api';
import { LegacyNetworkHandler } from '@ember-data/legacy-compat';
import { RequestManager } from '@ember-data/request';
import Store from '@ember-data/store';

export default class DefaultStore extends Store {
  constructor() {
    super(...arguments);
    this.requestManager = new RequestManager();
    this.requestManager.use([LegacyNetworkHandler]);
  }
  createCache(storeWrapper) {
    return new Cache(storeWrapper);
  }
}
