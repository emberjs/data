import { LegacyNetworkHandler } from '@ember-data/legacy-compat';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';
import BaseStore from '@ember-data/store';

export default class Store extends BaseStore {
  constructor(args: Record<string, unknown>) {
    super(args);
    this.requestManager = new RequestManager();
    this.requestManager.use([LegacyNetworkHandler, Fetch]);
  }
}
