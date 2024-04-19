import { assert } from '@ember/debug';

import type Store from '@ember-data/store';
import type { BaseFinderOptions } from '@ember-data/store/-types/q/store';
import { DEBUG } from '@warp-drive/build-config/env';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { RelationshipSchema } from '@warp-drive/core-types/schema';
import type { ExistingResourceObject, JsonApiDocument } from '@warp-drive/core-types/spec/raw';

import { upgradeStore } from '../-private';
import { iterateData, payloadIsNotBlank } from './legacy-data-utils';
import type { MinimumAdapterInterface } from './minimum-adapter-interface';
import { normalizeResponseHelper } from './serializer-response';

export function _findHasMany(
  adapter: MinimumAdapterInterface,
  store: Store,
  identifier: StableRecordIdentifier,
  link: string | null | { href: string },
  relationship: RelationshipSchema,
  options: BaseFinderOptions
) {
  upgradeStore(store);
  const promise = Promise.resolve().then(() => {
    const snapshot = store._fetchManager.createSnapshot(identifier, options);
    const useLink = !link || typeof link === 'string';
    const relatedLink = useLink ? link : link.href;
    assert(
      `Attempted to load a hasMany relationship from a specified 'link' in the original payload, but the specified link is empty. You must provide a valid 'link' in the original payload to use 'findHasMany'`,
      relatedLink
    );
    assert(
      `Expected the adapter to implement 'findHasMany' but it does not`,
      typeof adapter.findHasMany === 'function'
    );
    return adapter.findHasMany(store, snapshot, relatedLink, relationship);
  });

  return promise.then((adapterPayload) => {
    assert(
      `You made a 'findHasMany' request for a ${identifier.type}'s '${
        relationship.name
      }' relationship, using link '${JSON.stringify(link)}' , but the adapter's response did not have any data`,
      payloadIsNotBlank(adapterPayload)
    );
    const modelClass = store.modelFor(relationship.type);

    const serializer = store.serializerFor(relationship.type);
    let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'findHasMany');

    assert(
      `fetched the hasMany relationship '${relationship.name}' for ${identifier.type}:${
        identifier.id
      } with link '${JSON.stringify(
        link
      )}', but no data member is present in the response. If no data exists, the response should set { data: [] }`,
      'data' in payload && Array.isArray(payload.data)
    );

    payload = syncRelationshipDataFromLink(store, payload, identifier as ResourceIdentity, relationship);
    return store._push(payload, true);
  }, null);
}

export function _findBelongsTo(
  store: Store,
  identifier: StableRecordIdentifier,
  link: string | null | { href: string },
  relationship: RelationshipSchema,
  options: BaseFinderOptions
) {
  upgradeStore(store);
  const promise = Promise.resolve().then(() => {
    const adapter = store.adapterFor(identifier.type);
    assert(`You tried to load a belongsTo relationship but you have no adapter (for ${identifier.type})`, adapter);
    assert(
      `You tried to load a belongsTo relationship from a specified 'link' in the original payload but your adapter does not implement 'findBelongsTo'`,
      typeof adapter.findBelongsTo === 'function'
    );
    const snapshot = store._fetchManager.createSnapshot(identifier, options);
    const useLink = !link || typeof link === 'string';
    const relatedLink = useLink ? link : link.href;
    assert(
      `Attempted to load a belongsTo relationship from a specified 'link' in the original payload, but the specified link is empty. You must provide a valid 'link' in the original payload to use 'findBelongsTo'`,
      relatedLink
    );
    return adapter.findBelongsTo(store, snapshot, relatedLink, relationship);
  });

  return promise.then((adapterPayload) => {
    const modelClass = store.modelFor(relationship.type);
    const serializer = store.serializerFor(relationship.type);
    let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'findBelongsTo');

    assert(
      `fetched the belongsTo relationship '${relationship.name}' for ${identifier.type}:${
        identifier.id
      } with link '${JSON.stringify(
        link
      )}', but no data member is present in the response. If no data exists, the response should set { data: null }`,
      'data' in payload && (payload.data === null || (typeof payload.data === 'object' && !Array.isArray(payload.data)))
    );

    if (!payload.data && !payload.links && !payload.meta) {
      return null;
    }

    payload = syncRelationshipDataFromLink(store, payload, identifier as ResourceIdentity, relationship);

    return store._push(payload, true);
  }, null);
}

// sync
// iterate over records in payload.data
// for each record
//   assert that record.relationships[inverse] is either undefined (so we can fix it)
//     or provide a data: {id, type} that matches the record that requested it
//   return the relationship data for the parent
function syncRelationshipDataFromLink(
  store: Store,
  payload: JsonApiDocument,
  parentIdentifier: ResourceIdentity,
  relationship: RelationshipSchema
) {
  // ensure the right hand side (incoming payload) points to the parent record that
  // requested this relationship
  const relationshipData = payload.data
    ? iterateData(payload.data, (data, index) => {
        const { id, type } = data;
        ensureRelationshipIsSetToParent(data, parentIdentifier, store, relationship, index);
        return { id, type };
      })
    : null;

  const relatedDataHash = {} as JsonApiDocument;

  if ('meta' in payload) {
    relatedDataHash.meta = payload.meta;
  }
  if ('links' in payload) {
    relatedDataHash.links = payload.links;
  }
  if ('data' in payload) {
    relatedDataHash.data = relationshipData;
  }

  // now, push the left hand side (the parent record) to ensure things are in sync, since
  // the payload will be pushed with store._push
  const parentPayload = {
    id: parentIdentifier.id,
    type: parentIdentifier.type,
    relationships: {
      [relationship.name]: relatedDataHash,
    },
  };

  if (!Array.isArray(payload.included)) {
    payload.included = [];
  }
  payload.included.push(parentPayload);

  return payload;
}

type ResourceIdentity = { id: string; type: string };
type RelationshipData = ResourceIdentity | ResourceIdentity[] | null;

function ensureRelationshipIsSetToParent(
  payload: ExistingResourceObject,
  parentIdentifier: ResourceIdentity,
  store: Store,
  parentRelationship: RelationshipSchema,
  index: number
) {
  const { id, type } = payload;

  if (!payload.relationships) {
    payload.relationships = {};
  }
  const { relationships } = payload;

  const inverse = getInverse(store, parentIdentifier, parentRelationship, type);
  if (inverse) {
    const { inverseKey, kind } = inverse;

    const relationshipData = relationships[inverseKey]?.data as RelationshipData | undefined;

    if (DEBUG) {
      if (
        typeof relationshipData !== 'undefined' &&
        !relationshipDataPointsToParent(relationshipData, parentIdentifier)
      ) {
        const inspect = function inspect(thing: unknown) {
          return `'${JSON.stringify(thing)}'`;
        };
        const quotedType = inspect(type);
        const quotedInverse = inspect(inverseKey);
        const expected = inspect({
          id: parentIdentifier.id,
          type: parentIdentifier.type,
        });
        const expectedModel = `${parentIdentifier.type}:${parentIdentifier.id}`;
        const got = inspect(relationshipData);
        const prefix = typeof index === 'number' ? `data[${index}]` : `data`;
        const path = `${prefix}.relationships.${inverseKey}.data`;
        const data = Array.isArray(relationshipData) ? relationshipData[0] : relationshipData;
        const other = data ? `<${data.type}:${data.id}>` : null;
        const relationshipFetched = `${expectedModel}.${parentRelationship.kind}("${parentRelationship.name}")`;
        const includedRecord = `<${type}:${id}>`;
        const message = [
          `Encountered mismatched relationship: Ember Data expected ${path} in the payload from ${relationshipFetched} to include ${expected} but got ${got} instead.\n`,
          `The ${includedRecord} record loaded at ${prefix} in the payload specified ${other} as its ${quotedInverse}, but should have specified ${expectedModel} (the record the relationship is being loaded from) as its ${quotedInverse} instead.`,
          `This could mean that the response for ${relationshipFetched} may have accidentally returned ${quotedType} records that aren't related to ${expectedModel} and could be related to a different ${parentIdentifier.type} record instead.`,
          `Ember Data has corrected the ${includedRecord} record's ${quotedInverse} relationship to ${expectedModel} so that ${relationshipFetched} will include ${includedRecord}.`,
          `Please update the response from the server or change your serializer to either ensure that the response for only includes ${quotedType} records that specify ${expectedModel} as their ${quotedInverse}, or omit the ${quotedInverse} relationship from the response.`,
        ].join('\n');

        assert(message);
      }
    }

    if (kind !== 'hasMany' || typeof relationshipData !== 'undefined') {
      relationships[inverseKey] = relationships[inverseKey] || {};
      relationships[inverseKey].data = fixRelationshipData(relationshipData ?? null, kind, parentIdentifier);
    }
  }
}

function inverseForRelationship(store: Store, identifier: { type: string; id?: string }, key: string) {
  const definition = store.getSchemaDefinitionService().relationshipsDefinitionFor(identifier)[key];
  if (!definition) {
    return null;
  }

  assert(
    `Expected the relationship defintion to specify the inverse type or null.`,
    definition.options?.inverse === null ||
      (typeof definition.options?.inverse === 'string' && definition.options.inverse.length > 0)
  );
  return definition.options.inverse;
}

function getInverse(
  store: Store,
  parentIdentifier: ResourceIdentity,
  parentRelationship: RelationshipSchema,
  type: string
) {
  const { name: lhs_relationshipName } = parentRelationship;
  const { type: parentType } = parentIdentifier;
  const inverseKey = inverseForRelationship(store, { type: parentType }, lhs_relationshipName);

  if (inverseKey) {
    const definition = store.getSchemaDefinitionService().relationshipsDefinitionFor({ type });
    const { kind } = definition[inverseKey];
    return {
      inverseKey,
      kind,
    };
  }
}

function relationshipDataPointsToParent(relationshipData: RelationshipData, identifier: ResourceIdentity): boolean {
  if (relationshipData === null) {
    return false;
  }

  if (Array.isArray(relationshipData)) {
    if (relationshipData.length === 0) {
      return false;
    }
    for (let i = 0; i < relationshipData.length; i++) {
      const entry = relationshipData[i];
      if (validateRelationshipEntry(entry, identifier)) {
        return true;
      }
    }
  } else {
    return validateRelationshipEntry(relationshipData, identifier);
  }

  return false;
}

function fixRelationshipData(
  relationshipData: RelationshipData,
  relationshipKind: 'hasMany' | 'belongsTo',
  { id, type }: ResourceIdentity
) {
  const parentRelationshipData = {
    id,
    type,
  };

  let payload: { type: string; id: string } | { type: string; id: string }[] | null = null;

  if (relationshipKind === 'hasMany') {
    const relData = (relationshipData as { type: string; id: string }[]) || [];
    if (relationshipData) {
      assert('expected the relationship data to be an array', Array.isArray(relationshipData));
      // these arrays could be massive so this is better than filter
      // Note: this is potentially problematic if type/id are not in the
      // same state of normalization.
      const found = relationshipData.find((v) => {
        return v.type === parentRelationshipData.type && v.id === parentRelationshipData.id;
      });
      if (!found) {
        relData.push(parentRelationshipData);
      }
    } else {
      relData.push(parentRelationshipData);
    }
    payload = relData;
  } else {
    const relData = (relationshipData as { type: string; id: string }) || {};
    Object.assign(relData, parentRelationshipData);
    payload = relData;
  }

  return payload;
}

function validateRelationshipEntry({ id }: ResourceIdentity, { id: parentModelID }: ResourceIdentity): boolean {
  return !!id && id.toString() === parentModelID;
}
