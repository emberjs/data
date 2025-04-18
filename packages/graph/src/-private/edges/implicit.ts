import type { ResourceCacheKey } from '@warp-drive/core-types';

import type { UpgradedMeta } from '../-edge-definition';

export type ImplicitMeta = UpgradedMeta & { kind: 'implicit'; isImplicit: true };

export interface ImplicitEdge {
  definition: ImplicitMeta;
  identifier: ResourceCacheKey;
  localMembers: Set<ResourceCacheKey>;
  remoteMembers: Set<ResourceCacheKey>;
}

export function createImplicitEdge(definition: ImplicitMeta, identifier: ResourceCacheKey): ImplicitEdge {
  return {
    definition,
    identifier,
    localMembers: new Set(),
    remoteMembers: new Set(),
  };
}
