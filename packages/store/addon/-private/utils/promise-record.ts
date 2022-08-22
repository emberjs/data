import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordInstance } from '@ember-data/types/q/record-instance';

import type { PromiseObject } from '../proxies/promise-proxies';
import { promiseObject } from '../proxies/promise-proxies';
import type Store from '../store-service';

export default function promiseRecord(
  store: Store,
  promise: Promise<StableRecordIdentifier>
): PromiseObject<RecordInstance> {
  let toReturn = promise.then((identifier: StableRecordIdentifier) => store.peekRecord(identifier)!);

  return promiseObject(toReturn);
}
