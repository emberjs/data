import type InternalModel from '../system/model/internal-model';
import { promiseObject } from '../system/promise-proxies';
import type { DSModel } from '../ts-interfaces/ds-model';
import type { PromiseProxy } from '../ts-interfaces/promise-proxies';

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
): PromiseProxy<DSModel> {
  let toReturn = internalModelPromise.then((internalModel) => internalModel.getRecord());

  return promiseObject(toReturn, label);
}
