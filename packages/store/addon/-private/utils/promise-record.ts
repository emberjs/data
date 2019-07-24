import InternalModel from '../system/model/internal-model';
import { promiseObject } from '../system/promise-proxies';
import { Record } from '../ts-interfaces/record';

/**
  @module @ember-data/store
*/

// shim type until we can properly type
// these proxies
export type PromiseProxy<T> = Promise<T>;

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
): PromiseProxy<Record> {
  let toReturn = internalModelPromise.then(internalModel => internalModel.getRecord());

  return promiseObject(toReturn, label);
}
