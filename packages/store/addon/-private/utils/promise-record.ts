import type InternalModel from '../system/model/internal-model';
import type { PromiseObject } from '../system/promise-proxies';
import { promiseObject } from '../system/promise-proxies';
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
  internalModelPromise: Promise<InternalModel>,
  label: string
): PromiseObject<RecordInstance> {
  let toReturn = internalModelPromise.then((internalModel) => internalModel.getRecord());

  return promiseObject(toReturn, label);
}
