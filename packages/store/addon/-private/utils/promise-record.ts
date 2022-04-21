import { ResolvedRegistry } from '@ember-data/types';
import { RecordInstance, RecordType } from '@ember-data/types/utils';

import type InternalModel from '../system/model/internal-model';
import type { PromiseObject } from '../system/promise-proxies';
import { promiseObject } from '../system/promise-proxies';

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
export default function promiseRecord<R extends ResolvedRegistry, T extends RecordType<R>>(
  internalModelPromise: Promise<InternalModel<R, T>>,
  label: string
): PromiseObject<RecordInstance<R, T>> {
  let toReturn = internalModelPromise.then((internalModel) => internalModel.getRecord());

  return promiseObject(toReturn, label);
}
