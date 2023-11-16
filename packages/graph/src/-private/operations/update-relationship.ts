import { assert, warn } from '@ember/debug';

import type { IdentifierCache } from '@ember-data/store/-private/caches/identifier-cache';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { UpdateRelationshipOperation } from '@warp-drive/core-types/graph';
import type { ExistingResourceIdentifierObject, NewResourceIdentifierObject } from '@warp-drive/core-types/spec/raw';

import { isBelongsTo, isHasMany, notifyChange } from '../-utils';
import type { Graph } from '../graph';
import _normalizeLink from '../normalize-link';

/*
    Updates the "canonical" or "remote" state of a relationship, replacing any existing
    state and blowing away any local changes (excepting new records).
*/
export default function updateRelationshipOperation(graph: Graph, op: UpdateRelationshipOperation) {
  const relationship = graph.get(op.record, op.field);
  assert(`Cannot update an implicit relationship`, isHasMany(relationship) || isBelongsTo(relationship));
  const { definition, state, identifier } = relationship;
  const { isCollection } = definition;

  const payload = op.value;

  let hasRelationshipDataProperty = false;
  let hasUpdatedLink = false;

  if (payload.meta) {
    relationship.meta = payload.meta;
  }

  if (payload.data !== undefined) {
    hasRelationshipDataProperty = true;
    if (isCollection) {
      // TODO deprecate this case. We
      // have tests saying we support it.
      if (payload.data === null) {
        payload.data = [];
      }
      assert(`Expected an array`, Array.isArray(payload.data));
      const cache = graph.store.identifierCache;
      graph.update(
        {
          op: 'replaceRelatedRecords',
          record: identifier,
          field: op.field,
          value: upgradeIdentifiers(payload.data, cache),
        },
        true
      );
    } else {
      graph.update(
        {
          op: 'replaceRelatedRecord',
          record: identifier,
          field: op.field,
          value: payload.data
            ? graph.store.identifierCache.upgradeIdentifier(payload.data as ExistingResourceIdentifierObject)
            : null,
        },
        true
      );
    }
  } else if (definition.isAsync === false && !state.hasReceivedData) {
    hasRelationshipDataProperty = true;

    if (isCollection) {
      graph.update(
        {
          op: 'replaceRelatedRecords',
          record: identifier,
          field: op.field,
          value: [],
        },
        true
      );
    } else {
      graph.update(
        {
          op: 'replaceRelatedRecord',
          record: identifier,
          field: op.field,
          value: null,
        },
        true
      );
    }
  }

  if (payload.links) {
    const originalLinks = relationship.links;
    relationship.links = payload.links;
    if (payload.links.related) {
      const relatedLink = _normalizeLink(payload.links.related);
      const currentLink = originalLinks && originalLinks.related ? _normalizeLink(originalLinks.related) : null;
      const currentLinkHref = currentLink ? currentLink.href : null;

      if (relatedLink && relatedLink.href && relatedLink.href !== currentLinkHref) {
        warn(
          `You pushed a record of type '${identifier.type}' with a relationship '${definition.key}' configured as 'async: false'. You've included a link but no primary data, this may be an error in your payload. EmberData will treat this relationship as known-to-be-empty.`,
          definition.isAsync || state.hasReceivedData,
          {
            id: 'ds.store.push-link-for-sync-relationship',
          }
        );
        assert(
          `You have pushed a record of type '${identifier.type}' with '${definition.key}' as a link, but the value of that link is not a string.`,
          typeof relatedLink.href === 'string' || relatedLink.href === null
        );
        hasUpdatedLink = true;
      }
    }
  }

  /*
       Data being pushed into the relationship might contain only data or links,
       or a combination of both.

       IF contains only data
       IF contains both links and data
        state.isEmpty -> true if is empty array (has-many) or is null (belongs-to)
        state.hasReceivedData -> true
        hasDematerializedInverse -> false
        state.isStale -> false
        allInverseRecordsAreLoaded -> run-check-to-determine

       IF contains only links
        state.isStale -> true
       */
  relationship.state.hasFailedLoadAttempt = false;
  if (hasRelationshipDataProperty) {
    const relationshipIsEmpty = payload.data === null || (Array.isArray(payload.data) && payload.data.length === 0);

    // we don't need to notify here as the update op we pushed in above will notify once
    // membership is in the correct state.
    relationship.state.hasReceivedData = true;
    relationship.state.isStale = false;
    relationship.state.hasDematerializedInverse = false;
    relationship.state.isEmpty = relationshipIsEmpty;
  } else if (hasUpdatedLink) {
    // only notify stale if we have not previously received membership data.
    // within this same transaction
    // this prevents refetching when only one side of the relationship in the
    // payload contains the info while the other side contains just a link
    // this only works when the side with just a link is a belongsTo, as we
    // don't know if a hasMany has full information or not.
    // see #7049 for context.
    if (
      isCollection ||
      !relationship.state.hasReceivedData ||
      isStaleTransaction(relationship.transactionRef, graph._transaction)
    ) {
      relationship.state.isStale = true;

      notifyChange(graph, relationship.identifier, relationship.definition.key);
    } else {
      relationship.state.isStale = false;
    }
  }
}

function isStaleTransaction(relationshipTransactionId: number, graphTransactionId: number | null) {
  return (
    relationshipTransactionId === 0 || // relationship has never notified
    graphTransactionId === null || // we are not in a transaction
    relationshipTransactionId < graphTransactionId // we are not part of the current transaction
  );
}

export function upgradeIdentifiers(
  arr: (ExistingResourceIdentifierObject | NewResourceIdentifierObject | StableRecordIdentifier)[],
  cache: IdentifierCache
): StableRecordIdentifier[] {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = cache.upgradeIdentifier(arr[i]);
  }
  return arr as StableRecordIdentifier[];
}
