import { Cache } from '@ember-data/json-api';
import Store from '@ember-data/store';

export default class DefaultStore extends Store {
  createRecordDataFor(storeWrapper) {
    return new Cache(storeWrapper);
  }
}
