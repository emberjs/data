import Store from 'ember-data/store';

import {
  adapterFor,
  LegacyNetworkHandler,
  normalize,
  pushPayload,
  serializeRecord,
  serializerFor,
} from '@ember-data/legacy-compat';
import RequestManager from '@ember-data/request';
import Fetch from '@ember-data/request/fetch';

export default class extends Store {
  requestManager = new RequestManager().use([LegacyNetworkHandler, Fetch]);
  adapterFor = adapterFor;
  serializerFor = serializerFor;
  serializeRecord = serializeRecord;
  normalize = normalize;
  pushPayload = pushPayload;
}
