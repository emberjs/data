import { RecordData } from '@ember-data/record-data/-private';
import Store from '@ember-data/store';

export default class DefaultStore extends Store {
  createRecordDataFor(modelName, id, clientId, storeWrapper) {
    let identifier = this.identifierCache.getOrCreateRecordIdentifier({
      type: modelName,
      id,
      lid: clientId,
    });
    return new RecordData(identifier, storeWrapper);
  }
}
