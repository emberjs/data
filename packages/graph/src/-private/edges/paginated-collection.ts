import { assert } from '@ember/debug';

import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { CollectionRelationship } from '@warp-drive/core-types/cache/relationship';
import type { Meta, PaginationLinks } from '@warp-drive/core-types/spec/raw';

import type { UpgradedMeta } from '../-edge-definition';

const Unpaged = Symbol('Unpaged');
const Local = Symbol('Local');

interface CollectionPage {
  links: PaginationLinks | null;
  meta: Meta | null;
  remoteMembers: Set<StableRecordIdentifier>;
  isDirty: boolean;
  localState: StableRecordIdentifier[] | null;
}

export interface PaginatedCollectionEdge {
  definition: UpgradedMeta;
  identifier: StableRecordIdentifier;
  // state: RelationshipState;

  pages: Map<string, CollectionPage>;

  // remote state added via inverse that is not yet in a page
  remoteMembers: Set<StableRecordIdentifier>;

  // locally added records to add to unpaged
  additions: Set<StableRecordIdentifier> | null;

  // locally removed records to remove from all pages
  removals: Set<StableRecordIdentifier> | null;

  // relationshipObject meta & links
  // (as opposed to the meta & links of a specific page)
  meta: Meta | null;
  links: PaginationLinks | null;

  // a cache of the unpaged data with removals applied
  localState: StableRecordIdentifier[] | null;
  // whether localState is up-to-date
  isDirty: boolean;
  transactionRef: number;

  // TODO: this should likely be per-page
  _diff?: {
    add: Set<StableRecordIdentifier>;
    del: Set<StableRecordIdentifier>;
  };
}

export function createPaginatedCollectionEdge(
  definition: UpgradedMeta,
  identifier: StableRecordIdentifier
): PaginatedCollectionEdge {
  return {
    definition,
    identifier,

    pages: new Map(),
    remoteMembers: new Set(),

    additions: null,
    removals: null,

    meta: null,
    links: null,

    isDirty: true,
    localState: null,
    transactionRef: 0,
    _diff: undefined,
  };
}

type PaginatedCollectionRelationship = {
  links?: PaginationLinks;
  meta?: Meta;
  pages: Map<string | typeof Unpaged | typeof Local, CollectionRelationship>;
};

function computePageState(
  storage: CollectionPage | PaginatedCollectionEdge,
  source: PaginatedCollectionEdge
): StableRecordIdentifier[] {
  if (!storage.isDirty) {
    assert(`Expected localState to be present`, Array.isArray(storage.localState));
    return storage.localState;
  }

  let result: StableRecordIdentifier[];
  if (!source.removals?.size) {
    result = Array.from(storage.remoteMembers);
  } else {
    const state = new Set(storage.remoteMembers);
    source.removals?.forEach((v) => {
      state.delete(v);
    });
    result = Array.from(state);
  }

  storage.localState = result;
  storage.isDirty = false;

  return result;
}

export function getPaginatedCollectionData(source: PaginatedCollectionEdge): PaginatedCollectionRelationship {
  const payload: PaginatedCollectionRelationship = {
    pages: new Map(),
  };

  // primary pages
  source.pages.forEach((page, key) => {
    const collectionRelationship: CollectionRelationship = {};
    collectionRelationship.data = computePageState(page, source);

    if (page.links) {
      collectionRelationship.links = page.links;
    }

    if (page.meta) {
      collectionRelationship.meta = page.meta;
    }

    payload.pages.set(key, collectionRelationship);
  });

  // specialized pages
  payload.pages.set(Unpaged, {
    data: computePageState(source, source),
  });
  payload.pages.set(Local, {
    data: source.additions ? Array.from(source.additions) : [],
  });

  if (source.links) {
    payload.links = source.links;
  }

  if (source.meta) {
    payload.meta = source.meta;
  }

  return payload;
}
