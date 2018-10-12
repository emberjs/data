import { assert } from '@ember/debug';

/**
 * Merge data,meta,links information forward to the next payload
 * if required. Latest data will always win.
 *
 * @param oldPayload
 * @param newPayload
 */
function mergeForwardPayload(oldPayload, newPayload) {
  if (oldPayload && oldPayload.data !== undefined && newPayload.data === undefined) {
    newPayload.data = oldPayload.data;
  }

  /*
    _partialData is has-many relationship data that has been discovered via
     inverses in the absence of canonical `data` availability from the primary
     payload.

    We can't merge this data into `data` as that would trick has-many relationships
     into believing they know their complete membership. Anytime we find canonical
     data from the primary record, this partial data is discarded. If no canonical
     data is ever discovered, the partial data will be loaded by the relationship
     in a way that correctly preserves the `stale` relationship state.
   */
  if (newPayload.data === undefined && oldPayload && oldPayload._partialData !== undefined) {
    newPayload._partialData = oldPayload._partialData;
  }

  if (oldPayload && oldPayload.meta !== undefined && newPayload.meta === undefined) {
    newPayload.meta = oldPayload.meta;
  }

  if (oldPayload && oldPayload.links !== undefined && newPayload.links === undefined) {
    newPayload.links = oldPayload.links;
  }
}

// TODO this is now VERY similar to the identity/internal-model map
//  so we should probably generalize
export class TypeCache {
  constructor() {
    this.types = Object.create(null);
  }
  get(modelName, id) {
    let { types } = this;

    if (types[modelName] !== undefined) {
      return types[modelName][id];
    }
  }

  set(modelName, id, payload) {
    let { types } = this;
    let typeMap = types[modelName];

    if (typeMap === undefined) {
      typeMap = types[modelName] = Object.create(null);
    }

    typeMap[id] = payload;
  }

  delete(modelName, id) {
    let { types } = this;

    if (types[modelName] !== undefined) {
      delete types[modelName][id];
    }
  }
}

/**
 Manages the payloads for both sides of a single relationship, across all model
 instances.

 For example, with

 const User = DS.Model.extend({
      hobbies: DS.hasMany('hobby')
    });

 const Hobby = DS.Model.extend({
      user: DS.belongsTo('user')
    });

 let relationshipPayloads = new RelationshipPayloads('user', 'hobbies', 'hobby', 'user');

 let userPayload = {
      data: {
        id: 1,
        type: 'user',
        relationships: {
          hobbies: {
            data: [{
              id: 2,
              type: 'hobby',
            }]
          }
        }
      }
    };

 // here we expect the payload of the individual relationship
 relationshipPayloads.push('user', 1, 'hobbies', userPayload.data.relationships.hobbies);

 relationshipPayloads.get('user', 1, 'hobbies');
 relationshipPayloads.get('hobby', 2, 'user');

 @class RelationshipPayloads
 @private
 */
export default class RelationshipPayloads {
  constructor(relInfo) {
    this._relInfo = relInfo;

    // a map of id -> payloads for the left hand side of the relationship.
    this.lhs_payloads = new TypeCache();
    this.rhs_payloads = relInfo.isReflexive ? this.lhs_payloads : new TypeCache();

    // When we push relationship payloads, just stash them in a queue until
    // somebody actually asks for one of them.
    //
    // This is a queue of the relationship payloads that have been pushed for
    // either side of this relationship
    this._pendingPayloads = [];
  }

  /**
   Get the payload for the relationship of an individual record.

   This might return the raw payload as pushed into the store, or one computed
   from the payload of the inverse relationship.

   @method
   */
  get(modelName, id, relationshipName) {
    this._flushPending();

    if (this._isLHS(modelName, relationshipName)) {
      return this.lhs_payloads.get(modelName, id);
    } else {
      assert(
        `${modelName}:${relationshipName} is not either side of this relationship, ${
          this._relInfo.lhs_key
        }<->${this._relInfo.rhs_key}`,
        this._isRHS(modelName, relationshipName)
      );
      return this.rhs_payloads.get(modelName, id);
    }
  }

  /**
   Push a relationship payload for an individual record.

   This will make the payload available later for both this relationship and its inverse.

   @method
   */
  push(modelName, id, relationshipName, relationshipData) {
    this._pendingPayloads.push([modelName, id, relationshipName, relationshipData]);
  }

  /**
   Unload the relationship payload for an individual record.

   This does not unload the inverse relationship payload.

   @method
   */
  unload(modelName, id, relationshipName) {
    this._flushPending();

    if (this._isLHS(modelName, relationshipName)) {
      this.lhs_payloads.delete(modelName, id);
    } else {
      assert(
        `${modelName}:${relationshipName} is not either side of this relationship, ${
          this._relInfo.lhs_baseModelName
        }:${this._relInfo.lhs_relationshipName}<->${this._relInfo.rhs_baseModelName}:${
          this._relInfo.rhs_relationshipName
        }`,
        this._isRHS(modelName, relationshipName)
      );
      this.rhs_payloads.delete(modelName, id);
    }
  }

  /**
   @return {boolean} true iff `modelName` and `relationshipName` refer to the
   left hand side of this relationship, as opposed to the right hand side.

   @method
   */
  _isLHS(modelName, relationshipName) {
    let relInfo = this._relInfo;
    let isSelfReferential = relInfo.isSelfReferential;
    let isRelationship = relationshipName === relInfo.lhs_relationshipName;

    if (isRelationship === true) {
      return (
        isSelfReferential === true || // itself
        modelName === relInfo.lhs_baseModelName || // base or non-polymorphic
        relInfo.lhs_modelNames.indexOf(modelName) !== -1
      ); // polymorphic
    }

    return false;
  }

  /**
   @return {boolean} true iff `modelName` and `relationshipName` refer to the
   right hand side of this relationship, as opposed to the left hand side.

   @method
   */
  _isRHS(modelName, relationshipName) {
    let relInfo = this._relInfo;
    let isSelfReferential = relInfo.isSelfReferential;
    let isRelationship = relationshipName === relInfo.rhs_relationshipName;

    if (isRelationship === true) {
      return (
        isSelfReferential === true || // itself
        modelName === relInfo.rhs_baseModelName || // base or non-polymorphic
        relInfo.rhs_modelNames.indexOf(modelName) !== -1
      ); // polymorphic
    }

    return false;
  }

  _flushPending() {
    if (this._pendingPayloads.length === 0) {
      return;
    }

    let payloadsToBeProcessed = this._pendingPayloads.splice(0, this._pendingPayloads.length);
    for (let i = 0; i < payloadsToBeProcessed.length; ++i) {
      let modelName = payloadsToBeProcessed[i][0];
      let id = payloadsToBeProcessed[i][1];
      let relationshipName = payloadsToBeProcessed[i][2];
      let relationshipData = payloadsToBeProcessed[i][3];

      // TODO: maybe delay this allocation slightly?
      let inverseRelationshipData = {
        data: {
          id: id,
          type: modelName,
        },
      };

      // start flushing this individual payload.  The logic is the same whether
      // it's for the left hand side of the relationship or the right hand side,
      // except the role of primary and inverse idToPayloads is reversed
      //
      let previousPayload;
      let payloadMap;
      let inversePayloadMap;
      let inverseIsMany;
      if (this._isLHS(modelName, relationshipName)) {
        previousPayload = this.lhs_payloads.get(modelName, id);
        payloadMap = this.lhs_payloads;
        inversePayloadMap = this.rhs_payloads;
        inverseIsMany = this._rhsRelationshipIsMany;
      } else {
        assert(
          `${modelName}:${relationshipName} is not either side of this relationship, ${
            this._relInfo.lhs_key
          }<->${this._relInfo.rhs_key}`,
          this._isRHS(modelName, relationshipName)
        );
        previousPayload = this.rhs_payloads.get(modelName, id);
        payloadMap = this.rhs_payloads;
        inversePayloadMap = this.lhs_payloads;
        inverseIsMany = this._lhsRelationshipIsMany;
      }

      // actually flush this individual payload
      //
      // We remove the previous inverse before populating our current one
      // because we may have multiple payloads for the same relationship, in
      // which case the last one wins.
      //
      // eg if user hasMany helicopters, and helicopter belongsTo user and we see
      //
      //  [{
      //    data: {
      //      id: 1,
      //      type: 'helicopter',
      //      relationships: {
      //        user: {
      //          id: 2,
      //          type: 'user'
      //        }
      //      }
      //    }
      //  }, {
      //    data: {
      //      id: 1,
      //      type: 'helicopter',
      //      relationships: {
      //        user: {
      //          id: 4,
      //          type: 'user'
      //        }
      //      }
      //    }
      //  }]
      //
      // Then we will initially have set user:2 as having helicopter:1, which we
      // need to remove before adding helicopter:1 to user:4
      //
      // only remove relationship information before adding if there is relationshipData.data
      // * null is considered new information "empty", and it should win
      // * undefined is NOT considered new information, we should keep original state
      // * anything else is considered new information, and it should win
      let isMatchingIdentifier = this._isMatchingIdentifier(
        relationshipData && relationshipData.data,
        previousPayload && previousPayload.data
      );

      if (relationshipData.data !== undefined) {
        if (!isMatchingIdentifier) {
          this._removeInverse(id, previousPayload, inversePayloadMap);
        }
      }

      mergeForwardPayload(previousPayload, relationshipData);
      payloadMap.set(modelName, id, relationshipData);

      if (!isMatchingIdentifier) {
        this._populateInverse(
          relationshipData,
          inverseRelationshipData,
          inversePayloadMap,
          inverseIsMany
        );
      }
    }
  }

  _isMatchingIdentifier(a, b) {
    return a && b && a.type === b.type && a.id === b.id && !Array.isArray(a) && !Array.isArray(b);
  }

  /**
   Populate the inverse relationship for `relationshipData`.

   If `relationshipData` is an array (eg because the relationship is hasMany)
   this means populate each inverse, otherwise populate only the single
   inverse.

   @private
   @method
   */
  _populateInverse(relationshipData, inversePayload, inversePayloadMap, inverseIsMany) {
    if (!relationshipData.data) {
      // This id doesn't have an inverse, eg a belongsTo with a payload
      // { data: null }, so there's nothing to populate
      return;
    }

    if (Array.isArray(relationshipData.data)) {
      for (let i = 0; i < relationshipData.data.length; ++i) {
        let resourceIdentifier = relationshipData.data[i];
        this._addToInverse(inversePayload, resourceIdentifier, inversePayloadMap, inverseIsMany);
      }
    } else {
      let resourceIdentifier = relationshipData.data;
      this._addToInverse(inversePayload, resourceIdentifier, inversePayloadMap, inverseIsMany);
    }
  }

  /**
   Actually add `inversePayload` to `inverseIdToPayloads`.  This is part of
   `_populateInverse` after we've normalized the case of `relationshipData`
   being either an array or a pojo.

   We still have to handle the case that the *inverse* relationship payload may
   be an array or pojo.

   @private
   @method
   */
  _addToInverse(inversePayload, resourceIdentifier, inversePayloadMap, inverseIsMany) {
    let relInfo = this._relInfo;
    let inverseData = inversePayload.data;

    if (relInfo.isReflexive && inverseData && inverseData.id === resourceIdentifier.id) {
      // eg <user:1>.friends = [{ id: 1, type: 'user' }]
      return;
    }

    let existingPayload = inversePayloadMap.get(resourceIdentifier.type, resourceIdentifier.id);

    if (existingPayload) {
      // There already is an inverse, either add or overwrite depending on
      // whether the inverse is a many relationship or not
      //
      if (inverseIsMany) {
        let existingData = existingPayload.data;

        // in the case of a hasMany
        // we do not want create a `data` array where there was none before
        // if we also have links, which this would indicate
        if (existingData) {
          existingData.push(inversePayload.data);
        } else {
          existingPayload._partialData = existingPayload._partialData || [];
          existingPayload._partialData.push(inversePayload.data);
        }
      } else {
        mergeForwardPayload(existingPayload, inversePayload);
        inversePayloadMap.set(resourceIdentifier.type, resourceIdentifier.id, inversePayload);
      }
    } else {
      // first time we're populating the inverse side
      //
      if (inverseIsMany) {
        inversePayloadMap.set(resourceIdentifier.type, resourceIdentifier.id, {
          _partialData: [inversePayload.data],
        });
      } else {
        inversePayloadMap.set(resourceIdentifier.type, resourceIdentifier.id, inversePayload);
      }
    }
  }

  get _lhsRelationshipIsMany() {
    let meta = this._relInfo.lhs_relationshipMeta;
    return meta !== null && meta.kind === 'hasMany';
  }

  get _rhsRelationshipIsMany() {
    let meta = this._relInfo.rhs_relationshipMeta;
    return meta !== null && meta.kind === 'hasMany';
  }

  /**
   Remove the relationship in `previousPayload` from its inverse(s), because
   this relationship payload has just been updated (eg because the same
   relationship had multiple payloads pushed before the relationship was
   initialized).

   @method
   */
  _removeInverse(id, previousPayload, inversePayloadMap) {
    let data = previousPayload && previousPayload.data;
    let partialData = previousPayload && previousPayload._partialData;
    let maybeData = data || partialData;

    if (!maybeData) {
      // either this is the first time we've seen a payload for this id, or its
      // previous payload indicated that it had no inverse, eg a belongsTo
      // relationship with payload { data: null }
      //
      // In either case there's nothing that needs to be removed from the
      // inverse map of payloads
      return;
    }

    if (Array.isArray(maybeData)) {
      // TODO: diff rather than removeall addall?
      for (let i = 0; i < maybeData.length; ++i) {
        const resourceIdentifier = maybeData[i];
        this._removeFromInverse(id, resourceIdentifier, inversePayloadMap);
      }
    } else {
      this._removeFromInverse(id, data, inversePayloadMap);
    }
  }

  /**
   Remove `id` from its inverse record with id `inverseId`.  If the inverse
   relationship is a belongsTo, this means just setting it to null, if the
   inverse relationship is a hasMany, then remove that id from its array of ids.

   @method
   */
  _removeFromInverse(id, resourceIdentifier, inversePayloads) {
    let inversePayload = inversePayloads.get(resourceIdentifier.type, resourceIdentifier.id);
    let data = inversePayload && inversePayload.data;
    let partialData = inversePayload && inversePayload._partialData;

    if (!data && !partialData) {
      return;
    }

    if (Array.isArray(data)) {
      inversePayload.data = data.filter(x => x.id !== id);
    } else if (Array.isArray(partialData)) {
      inversePayload._partialData = partialData.filter(x => x.id !== id);
    } else {
      // this merges forward links and meta
      inversePayload.data = null;
    }
  }
}
