import { promiseObject } from '../system/promise-proxies';

type PromiseObject<T> = import('../system/promise-proxies').PromiseObject<T>;
type RecordInstance = import('../ts-interfaces/record-instance').RecordInstance;
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
  label?: string
): PromiseObject<RecordInstance> {
  let toReturn = internalModelPromise.then<RecordInstance>((internalModel: InternalModel) => internalModel.getRecord());

  return promiseObject<RecordInstance>(toReturn, label);
}
