import { IDENTIFIERS } from '@ember-data/canary-features';
import { RecordData } from '@ember-data/record-data/-private';
import Store from '@ember-data/store';
import { identifierCacheFor } from '@ember-data/store/-private';

type RecordDataStoreWrapper = import('@ember-data/store/-private/system/store/record-data-store-wrapper').default;

export default class DefaultStore extends Store {
  createRecordDataFor(modelName: string, id: string | null, clientId: string, storeWrapper: RecordDataStoreWrapper) {
    if (IDENTIFIERS) {
      let identifier = identifierCacheFor(this).getOrCreateRecordIdentifier({
        type: modelName,
        id,
        lid: clientId,
      });
      return new RecordData(identifier, storeWrapper);
    } else {
      return new RecordData(modelName, id, clientId, storeWrapper);
    }
  }
}
