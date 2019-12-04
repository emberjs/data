/**
  @module @ember-data/store
*/

import { BRAND_SYMBOL } from '../ts-interfaces/utils/brand';

type RelationshipDefinition = import('@ember-data/model/addon/-private/system/relationships/relationship-meta').RelationshipDefinition;

/**
 * Maps public interfaces to internal class implementations
 *
 * @internal
 */
export interface UpgradeMap {
  RelationshipSchema: RelationshipDefinition;
}

/**
 * Casts a public interface to the matching internal class implementation
 *
 * @internal
 */
export function upgradeForInternal<K extends keyof UpgradeMap>(
  external: { [BRAND_SYMBOL]: K } | undefined
): UpgradeMap[K] {
  return (external as unknown) as UpgradeMap[K];
}
