import { Cache } from '@ember-data/json-api/-private';
import Store from '@ember-data/store';

export default class DefaultStore extends Store {
  createCache(storeWrapper) {
    return new Cache(storeWrapper);
  }
}
