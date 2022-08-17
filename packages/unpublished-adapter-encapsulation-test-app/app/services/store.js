import { V2CACHE_SINGLETON_RECORD_DATA } from '@ember-data/canary-features';
import { RecordData } from '@ember-data/record-data/-private';
import Store from '@ember-data/store';

export default class DefaultStore extends Store {
  createRecordDataFor(identifier, storeWrapper) {
    if (V2CACHE_SINGLETON_RECORD_DATA) {
      // @ts-expect-error
      this.__private_singleton_recordData = this.__private_singleton_recordData || new RecordData(storeWrapper);
      this.__private_singleton_recordData.createCache(identifier);
      return this.__private_singleton_recordData;
    }
    return new RecordData(identifier, storeWrapper);
  }
}
