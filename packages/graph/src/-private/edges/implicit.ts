import type { StableRecordIdentifier } from '@warp-drive/core';

import type { UpgradedMeta } from '../-edge-definition';

export type ImplicitMeta = UpgradedMeta & { kind: 'implicit'; isImplicit: true };

export interface ImplicitEdge {
  definition: ImplicitMeta;
  identifier: StableRecordIdentifier;
  localMembers: Set<StableRecordIdentifier>;
  remoteMembers: Set<StableRecordIdentifier>;
}

export function createImplicitEdge(definition: ImplicitMeta, identifier: StableRecordIdentifier): ImplicitEdge {
  return {
    definition,
    identifier,
    localMembers: new Set(),
    remoteMembers: new Set(),
  };
}
