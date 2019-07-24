/**
  @module @ember-data/store
*/

import { BRAND_SYMBOL } from '../ts-interfaces/utils/brand';
import RecordDataStoreWrapper from './store/record-data-store-wrapper';
import { RelationshipDefinition } from './relationship-meta';

/**
 * Maps public interfaces to internal class implementations
 *
 * @internal
 */
export interface UpgradeMap {
  RecordDataStoreWrapper: RecordDataStoreWrapper;
  RelationshipSchema: RelationshipDefinition;
}

/**
 * Casts a public interface to the matching internal class implementation
 *
 * @internal
 */
export function upgradeForInternal<K extends keyof UpgradeMap>(external: { [BRAND_SYMBOL]: K }): UpgradeMap[K] {
  return (external as unknown) as UpgradeMap[K];
}
