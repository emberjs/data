import { assert, deprecate } from '@ember/debug';
import { DEBUG } from '@glimmer/env';

import { Promise } from 'rsvp';

import { DEPRECATE_RSVP_PROMISE } from '@ember-data/private-build-infra/deprecations';

import { _bind, _guard, _objectIsAlive, guardDestroyedStore } from './common';
import { normalizeResponseHelper } from './serializer-response';

/**
  @module @ember-data/store
*/

function payloadIsNotBlank(adapterPayload) {
  if (Array.isArray(adapterPayload)) {
    return true;
  } else {
    return Object.keys(adapterPayload || {}).length;
  }
}

function iterateData(data, fn) {
  if (Array.isArray(data)) {
    return data.map(fn);
  } else {
    return fn(data);
  }
}

// sync
// iterate over records in payload.data
// for each record
//   assert that record.relationships[inverse] is either undefined (so we can fix it)
//     or provide a data: {id, type} that matches the record that requested it
//   return the relationship data for the parent
function syncRelationshipDataFromLink(store, payload, parentInternalModel, relationship) {
  // ensure the right hand side (incoming payload) points to the parent record that
  // requested this relationship
  let relationshipData = payload.data
    ? iterateData(payload.data, (data, index) => {
        const { id, type } = data;
        ensureRelationshipIsSetToParent(data, parentInternalModel, store, relationship, index);
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
    id: parentInternalModel.id,
    type: parentInternalModel.modelName,
    relationships: {
      [relationship.key]: relatedDataHash,
    },
  };

  if (!Array.isArray(payload.included)) {
    payload.included = [];
  }
  payload.included.push(parentPayload);

  return payload;
}

function ensureRelationshipIsSetToParent(payload, parentInternalModel, store, parentRelationship, index) {
  let { id, type } = payload;

  if (!payload.relationships) {
    payload.relationships = {};
  }
  let { relationships } = payload;

  let inverse = getInverse(store, parentInternalModel, parentRelationship, type);
  if (inverse) {
    let { inverseKey, kind } = inverse;

    let relationshipData = relationships[inverseKey] && relationships[inverseKey].data;

    if (
      DEBUG &&
      typeof relationshipData !== 'undefined' &&
      !relationshipDataPointsToParent(relationshipData, parentInternalModel)
    ) {
      let inspect = function inspect(thing) {
        return `'${JSON.stringify(thing)}'`;
      };
      let quotedType = inspect(type);
      let quotedInverse = inspect(inverseKey);
      let expected = inspect({
        id: parentInternalModel.id,
        type: parentInternalModel.modelName,
      });
      let expectedModel = `${parentInternalModel.modelName}:${parentInternalModel.id}`;
      let got = inspect(relationshipData);
      let prefix = typeof index === 'number' ? `data[${index}]` : `data`;
      let path = `${prefix}.relationships.${inverseKey}.data`;
      let other = relationshipData ? `<${relationshipData.type}:${relationshipData.id}>` : null;
      let relationshipFetched = `${expectedModel}.${parentRelationship.kind}("${parentRelationship.name}")`;
      let includedRecord = `<${type}:${id}>`;
      let message = [
        `Encountered mismatched relationship: Ember Data expected ${path} in the payload from ${relationshipFetched} to include ${expected} but got ${got} instead.\n`,
        `The ${includedRecord} record loaded at ${prefix} in the payload specified ${other} as its ${quotedInverse}, but should have specified ${expectedModel} (the record the relationship is being loaded from) as its ${quotedInverse} instead.`,
        `This could mean that the response for ${relationshipFetched} may have accidentally returned ${quotedType} records that aren't related to ${expectedModel} and could be related to a different ${parentInternalModel.modelName} record instead.`,
        `Ember Data has corrected the ${includedRecord} record's ${quotedInverse} relationship to ${expectedModel} so that ${relationshipFetched} will include ${includedRecord}.`,
        `Please update the response from the server or change your serializer to either ensure that the response for only includes ${quotedType} records that specify ${expectedModel} as their ${quotedInverse}, or omit the ${quotedInverse} relationship from the response.`,
      ].join('\n');

      assert(message);
    }

    if (kind !== 'hasMany' || typeof relationshipData !== 'undefined') {
      relationships[inverseKey] = relationships[inverseKey] || {};
      relationships[inverseKey].data = fixRelationshipData(relationshipData, kind, parentInternalModel);
    }
  }
}

function getInverse(store, parentInternalModel, parentRelationship, type) {
  return recordDataFindInverseRelationshipInfo(store, parentInternalModel, parentRelationship, type);
}

function recordDataFindInverseRelationshipInfo({ _storeWrapper }, parentInternalModel, parentRelationship, type) {
  let { name: lhs_relationshipName } = parentRelationship;
  let { modelName } = parentInternalModel;
  let inverseKey = _storeWrapper.inverseForRelationship(modelName, lhs_relationshipName);

  if (inverseKey) {
    let {
      meta: { kind },
    } = _storeWrapper.relationshipsDefinitionFor(type)[inverseKey];
    return {
      inverseKey,
      kind,
    };
  }
}

function relationshipDataPointsToParent(relationshipData, internalModel) {
  if (relationshipData === null) {
    return false;
  }

  if (Array.isArray(relationshipData)) {
    if (relationshipData.length === 0) {
      return false;
    }
    for (let i = 0; i < relationshipData.length; i++) {
      let entry = relationshipData[i];
      if (validateRelationshipEntry(entry, internalModel)) {
        return true;
      }
    }
  } else {
    return validateRelationshipEntry(relationshipData, internalModel);
  }

  return false;
}

function fixRelationshipData(relationshipData, relationshipKind, { id, modelName }) {
  let parentRelationshipData = {
    id,
    type: modelName,
  };

  let payload;

  if (relationshipKind === 'hasMany') {
    payload = relationshipData || [];
    if (relationshipData) {
      // these arrays could be massive so this is better than filter
      // Note: this is potentially problematic if type/id are not in the
      // same state of normalization.
      let found = relationshipData.find((v) => {
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

export function _findHasMany(adapter, store, internalModel, link, relationship, options) {
  let snapshot = internalModel.createSnapshot(options);
  let modelClass = store.modelFor(relationship.type);
  let useLink = !link || typeof link === 'string';
  let relatedLink = useLink ? link : link.href;
  let promise = adapter.findHasMany(store, snapshot, relatedLink, relationship);
  let label = `DS: Handle Adapter#findHasMany of '${internalModel.modelName}' : '${relationship.type}'`;

  promise = guardDestroyedStore(promise, store, label);
  promise = promise.then(
    (adapterPayload) => {
      if (!_objectIsAlive(internalModel)) {
        if (DEPRECATE_RSVP_PROMISE) {
          deprecate(`A Promise did not resolve by the time your model was destroyed.`, false, {
            id: 'ember-data:rsvp-promise-hanging',
            until: '5.0',
            for: '@ember-data/store',
            since: {
              available: '4.2',
              enabled: '4.2',
            },
          });
        } else {
          throw new Error('A Promise did not resolve by the time your model was destroyed.');
        }
      }

      assert(
        `You made a 'findHasMany' request for a ${internalModel.modelName}'s '${relationship.key}' relationship, using link '${link}' , but the adapter's response did not have any data`,
        payloadIsNotBlank(adapterPayload)
      );
      let serializer = store.serializerFor(relationship.type);
      let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'findHasMany');

      assert(
        `fetched the hasMany relationship '${relationship.name}' for ${internalModel.modelName}:${internalModel.id} with link '${link}', but no data member is present in the response. If no data exists, the response should set { data: [] }`,
        'data' in payload && Array.isArray(payload.data)
      );

      payload = syncRelationshipDataFromLink(store, payload, internalModel, relationship);

      let internalModelArray = store._push(payload);
      return internalModelArray;
    },
    null,
    `DS: Extract payload of '${internalModel.modelName}' : hasMany '${relationship.type}'`
  );

  if (DEPRECATE_RSVP_PROMISE) {
    _guard(promise, _bind(_objectIsAlive, internalModel));
  }
}

export function _findBelongsTo(adapter, store, internalModel, link, relationship, options) {
  let snapshot = internalModel.createSnapshot(options);
  let modelClass = store.modelFor(relationship.type);
  let useLink = !link || typeof link === 'string';
  let relatedLink = useLink ? link : link.href;
  let promise = adapter.findBelongsTo(store, snapshot, relatedLink, relationship);
  let label = `DS: Handle Adapter#findBelongsTo of ${internalModel.modelName} : ${relationship.type}`;

  promise = guardDestroyedStore(promise, store, label);
  promise = _guard(promise, _bind(_objectIsAlive, internalModel));

  return promise.then(
    (adapterPayload) => {
      let serializer = store.serializerFor(relationship.type);
      let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'findBelongsTo');

      assert(
        `fetched the belongsTo relationship '${relationship.name}' for ${internalModel.modelName}:${internalModel.id} with link '${link}', but no data member is present in the response. If no data exists, the response should set { data: null }`,
        'data' in payload &&
          (payload.data === null || (typeof payload.data === 'object' && !Array.isArray(payload.data)))
      );

      if (!payload.data && !payload.links && !payload.meta) {
        return null;
      }

      payload = syncRelationshipDataFromLink(store, payload, internalModel, relationship);

      return store._push(payload);
    },
    null,
    `DS: Extract payload of ${internalModel.modelName} : ${relationship.type}`
  );
}

export function _findAll(adapter, store, modelName, options) {
  let modelClass = store.modelFor(modelName); // adapter.findAll depends on the class
  let recordArray = store.peekAll(modelName);
  let snapshotArray = recordArray._createSnapshot(options);
  let promise = Promise.resolve().then(() => adapter.findAll(store, modelClass, null, snapshotArray));
  let label = 'DS: Handle Adapter#findAll of ' + modelClass;

  promise = guardDestroyedStore(promise, store, label);

  return promise.then(
    (adapterPayload) => {
      assert(
        `You made a 'findAll' request for '${modelName}' records, but the adapter's response did not have any data`,
        payloadIsNotBlank(adapterPayload)
      );
      let serializer = store.serializerFor(modelName);
      let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'findAll');

      store._push(payload);
      store._didUpdateAll(modelName);

      return recordArray;
    },
    null,
    'DS: Extract payload of findAll ${modelName}'
  );
}

export function _query(adapter, store, modelName, query, recordArray, options) {
  let modelClass = store.modelFor(modelName); // adapter.query needs the class

  recordArray = recordArray || store.recordArrayManager.createAdapterPopulatedRecordArray(modelName, query);
  let promise = Promise.resolve().then(() => adapter.query(store, modelClass, query, recordArray, options));

  let label = `DS: Handle Adapter#query of ${modelName}`;
  promise = guardDestroyedStore(promise, store, label);

  return promise.then(
    (adapterPayload) => {
      let serializer = store.serializerFor(modelName);
      let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'query');
      let internalModels = store._push(payload);

      assert(
        'The response to store.query is expected to be an array but it was a single record. Please wrap your response in an array or use `store.queryRecord` to query for a single record.',
        Array.isArray(internalModels)
      );
      let identifiers = internalModels.map((im) => im.identifier);
      if (recordArray) {
        recordArray._setIdentifiers(identifiers, payload);
      } else {
        recordArray = store.recordArrayManager.createAdapterPopulatedRecordArray(
          modelName,
          query,
          identifiers,
          payload
        );
      }

      return recordArray;
    },
    null,
    `DS: Extract payload of query ${modelName}`
  );
}

export function _queryRecord(adapter, store, modelName, query, options) {
  let modelClass = store.modelFor(modelName); // adapter.queryRecord needs the class
  let promise = Promise.resolve().then(() => adapter.queryRecord(store, modelClass, query, options));

  let label = `DS: Handle Adapter#queryRecord of ${modelName}`;
  promise = guardDestroyedStore(promise, store, label);

  return promise.then(
    (adapterPayload) => {
      let serializer = store.serializerFor(modelName);
      let payload = normalizeResponseHelper(serializer, store, modelClass, adapterPayload, null, 'queryRecord');

      assert(
        `Expected the primary data returned by the serializer for a 'queryRecord' response to be a single object or null but instead it was an array.`,
        !Array.isArray(payload.data)
      );

      return store._push(payload);
    },
    null,
    `DS: Extract payload of queryRecord ${modelName}`
  );
}
