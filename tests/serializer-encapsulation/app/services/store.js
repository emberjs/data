import { Cache } from '@ember-data/json-api/-private';
import Store from '@ember-data/store';

export default class DefaultStore extends Store {
  createRecordDataFor(identifier, storeWrapper) {
    this.__private_singleton_recordData = this.__private_singleton_recordData || new Cache(storeWrapper);
    this.__private_singleton_recordData.createCache(identifier);
    return this.__private_singleton_recordData;
  }
}
