import CoreStore from '../system/core-store';
import type { PromiseObject } from '../system/promise-proxies';
import { promiseObject } from '../system/promise-proxies';
import type { StableRecordIdentifier } from '../ts-interfaces/identifier';
import type { RecordInstance } from '../ts-interfaces/record-instance';

/**
  @module @ember-data/store
*/

/**
 * Get the materialized model from the internalModel/promise
 * that returns an internal model and return it in a promiseObject.
 *
 * Useful for returning from find methods
 *
 * @internal
 */
export default function promiseRecord(
  store: CoreStore,
  promise: Promise<StableRecordIdentifier>,
  label?: string
): PromiseObject<RecordInstance> {
  let toReturn = promise.then((identifier: StableRecordIdentifier) => store.peekRecord(identifier)!);

  return promiseObject(toReturn, label);
}
