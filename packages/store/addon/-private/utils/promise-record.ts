import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';
import type { RecordInstance } from '@ember-data/types/q/record-instance';

import type Store from '../core-store';
import type { PromiseObject } from '../promise-proxies';
import { promiseObject } from '../promise-proxies';

export default function promiseRecord(
  store: Store,
  promise: Promise<StableRecordIdentifier>,
  label?: string
): PromiseObject<RecordInstance> {
  let toReturn = promise.then((identifier: StableRecordIdentifier) => store.peekRecord(identifier)!);

  return promiseObject(toReturn, label);
}
