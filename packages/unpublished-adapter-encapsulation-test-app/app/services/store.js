import { RecordData } from '@ember-data/record-data/-private';
import Store from '@ember-data/store';

export default class DefaultStore extends Store {
  createRecordDataFor(modelName, id, lid, storeWrapper) {
    let identifier = this.identifierCache.getOrCreateRecordIdentifier({
      type: modelName,
      id,
      lid,
    });
    return new RecordData(identifier, storeWrapper);
  }
}
