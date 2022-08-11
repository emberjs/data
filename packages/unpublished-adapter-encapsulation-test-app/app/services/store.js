import { RecordData } from '@ember-data/record-data/-private';
import Store from '@ember-data/store';

export default class DefaultStore extends Store {
  createRecordDataFor(identifier, storeWrapper) {
    return new RecordData(identifier, storeWrapper);
  }
}
