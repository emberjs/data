import { assert } from '@ember/debug';

import { DEBUG } from '@ember-data/env';

import { iterateData, payloadIsNotBlank } from './legacy-data-utils';
import { normalizeResponseHelper } from './serializer-response';

export function _findHasMany(adapter, store, identifier, link, relationship, options) {
  let promise = Promise.resolve().then(() => {
    const snapshot = store._fetchManager.createSnapshot(identifier, options);
    const useLink = !link || typeof link === 'string';
    const relatedLink = useLink ? link : link.href;
    return adapter.findHasMany(store, snapshot, relatedLink, relationship);
  });

  promise = promise.then(
    (adapterPayload) => {
      assert(
        `You made a 'findHasMany' request for a ${identifier.type}'s '${relationship.name}' relationship, using link '${link}' , but the adapter's response did not have any data`,
        payloadIsNotBlank(adapterPayload)
      );
      const modelClass = store.modelFor(relationship.type);

      const serializer = store.serializerFor(relationship.type);
      let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'findHasMany');

      assert(
        `fetched the hasMany relationship '${relationship.name}' for ${identifier.type}:${identifier.id} with link '${link}', but no data member is present in the response. If no data exists, the response should set { data: [] }`,
        'data' in payload && Array.isArray(payload.data)
      );

      payload = syncRelationshipDataFromLink(store, payload, identifier, relationship);
      return store._push(payload, true);
    },
    null,
    `DS: Extract payload of '${identifier.type}' : hasMany '${relationship.type}'`
  );

  return promise;
}

export function _findBelongsTo(store, identifier, link, relationship, options) {
  let promise = Promise.resolve().then(() => {
    const adapter = store.adapterFor(identifier.type);
    assert(`You tried to load a belongsTo relationship but you have no adapter (for ${identifier.type})`, adapter);
    assert(
      `You tried to load a belongsTo relationship from a specified 'link' in the original payload but your adapter does not implement 'findBelongsTo'`,
      typeof adapter.findBelongsTo === 'function'
    );
    const snapshot = store._fetchManager.createSnapshot(identifier, options);
    const useLink = !link || typeof link === 'string';
    const relatedLink = useLink ? link : link.href;
    return adapter.findBelongsTo(store, snapshot, relatedLink, relationship);
  });

  promise = promise.then(
    (adapterPayload) => {
      const modelClass = store.modelFor(relationship.type);
      const serializer = store.serializerFor(relationship.type);
      let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'findBelongsTo');

      assert(
        `fetched the belongsTo relationship '${relationship.name}' for ${identifier.type}:${identifier.id} with link '${link}', but no data member is present in the response. If no data exists, the response should set { data: null }`,
        'data' in payload &&
          (payload.data === null || (typeof payload.data === 'object' && !Array.isArray(payload.data)))
      );

      if (!payload.data && !payload.links && !payload.meta) {
        return null;
      }

      payload = syncRelationshipDataFromLink(store, payload, identifier, relationship);

      return store._push(payload, true);
    },
    null,
    `DS: Extract payload of ${identifier.type} : ${relationship.type}`
  );

  return promise;
}

// sync
// iterate over records in payload.data
// for each record
//   assert that record.relationships[inverse] is either undefined (so we can fix it)
//     or provide a data: {id, type} that matches the record that requested it
//   return the relationship data for the parent
function syncRelationshipDataFromLink(store, payload, parentIdentifier, relationship) {
  // ensure the right hand side (incoming payload) points to the parent record that
  // requested this relationship
  const relationshipData = payload.data
    ? iterateData(payload.data, (data, index) => {
        const { id, type } = data;
        ensureRelationshipIsSetToParent(data, parentIdentifier, store, relationship, index);
        return { id, type };
      })
    : null;

  const relatedDataHash = {};

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

function ensureRelationshipIsSetToParent(payload, parentIdentifier, store, parentRelationship, index) {
  const { id, type } = payload;

  if (!payload.relationships) {
    payload.relationships = {};
  }
  const { relationships } = payload;

  const inverse = getInverse(store, parentIdentifier, parentRelationship, type);
  if (inverse) {
    const { inverseKey, kind } = inverse;

    const relationshipData = relationships[inverseKey] && relationships[inverseKey].data;

    if (DEBUG) {
      if (
        typeof relationshipData !== 'undefined' &&
        !relationshipDataPointsToParent(relationshipData, parentIdentifier)
      ) {
        const inspect = function inspect(thing) {
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
        const other = relationshipData ? `<${relationshipData.type}:${relationshipData.id}>` : null;
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
      relationships[inverseKey].data = fixRelationshipData(relationshipData, kind, parentIdentifier);
    }
  }
}

function inverseForRelationship(store, identifier, key) {
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

function getInverse(store, parentIdentifier, parentRelationship, type) {
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

function relationshipDataPointsToParent(relationshipData, identifier) {
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

function fixRelationshipData(relationshipData, relationshipKind, { id, type }) {
  const parentRelationshipData = {
    id,
    type,
  };

  let payload;

  if (relationshipKind === 'hasMany') {
    payload = relationshipData || [];
    if (relationshipData) {
      // these arrays could be massive so this is better than filter
      // Note: this is potentially problematic if type/id are not in the
      // same state of normalization.
      const found = relationshipData.find((v) => {
        return v.type === parentRelationshipData.type && v.id === parentRelationshipData.id;
      });
      if (!found) {
        payload.push(parentRelationshipData);
      }
    } else {
      payload.push(parentRelationshipData);
    }
  } else {
    payload = relationshipData || {};
    Object.assign(payload, parentRelationshipData);
  }

  return payload;
}

function validateRelationshipEntry({ id }, { id: parentModelID }) {
  return id && id.toString() === parentModelID;
}
