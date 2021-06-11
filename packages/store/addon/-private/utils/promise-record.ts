import { promiseObject } from '../system/promise-proxies';

type PromiseObject<T> = import('../system/promise-proxies').PromiseObject<T>;
type RecordInstance = import('../ts-interfaces/record-instance').RecordInstance;
type InternalModel<T> = import('../system/model/internal-model').default<T>;

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
export default function promiseRecord<R extends RecordInstance>(
  internalModelPromise: Promise<InternalModel<R>>,
  label?: string
): PromiseObject<R> {
  let toReturn = internalModelPromise.then<R>((internalModel: InternalModel<R>) => internalModel.getRecord());

  return promiseObject<R>(toReturn, label);
}
