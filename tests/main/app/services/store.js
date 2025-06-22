import Store from 'ember-data/store';

import { adapterFor, normalize, pushPayload, serializeRecord, serializerFor } from '@ember-data/legacy-compat';

export default class extends Store {
  adapterFor = adapterFor;
  serializerFor = serializerFor;
  serializeRecord = serializeRecord;
  normalize = normalize;
  pushPayload = pushPayload;
}
