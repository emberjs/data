import CoreStore from '../system/core-store';
import type { PromiseObject } from '../system/promise-proxies';
import { promiseObject } from '../system/promise-proxies';
import type { StableRecordIdentifier } from '../ts-interfaces/identifier';
import type { RecordInstance } from '../ts-interfaces/record-instance';

export default function promiseRecord(
  store: CoreStore,
  promise: Promise<StableRecordIdentifier>,
  label?: string
): PromiseObject<RecordInstance> {
  let toReturn = promise.then((identifier: StableRecordIdentifier) => store.peekRecord(identifier)!);

  return promiseObject(toReturn, label);
}
