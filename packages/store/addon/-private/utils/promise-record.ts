import { promiseObject } from '../system/promise-proxies';

type DSModel = import('../ts-interfaces/ds-model').DSModel;
type PromiseProxy<T> = import('../ts-interfaces/promise-proxies').PromiseProxy<T>;
type InternalModel = import('../system/model/internal-model').default;
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
  let toReturn = internalModelPromise.then(internalModel => internalModel.getRecord());

  return promiseObject(toReturn, label);
}
