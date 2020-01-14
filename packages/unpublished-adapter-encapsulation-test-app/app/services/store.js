import { RecordData } from '@ember-data/record-data/-private';
import Store from '@ember-data/store';
import { identifierCacheFor } from '@ember-data/store/-private';

export default class DefaultStore extends Store {
  createRecordDataFor(modelName, id, clientId, storeWrapper) {
    let identifier = identifierCacheFor(this).getOrCreateRecordIdentifier({
      type: modelName,
      id,
      lid: clientId,
    });
    return new RecordData(identifier, storeWrapper);
  }
}
