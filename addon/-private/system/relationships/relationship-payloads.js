import { assert } from '@ember/debug';

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
  constructor(store, modelName, relationshipName, relationshipMeta, inverseModelName, inverseRelationshipName, inverseRelationshipMeta) {
    this._store = store;

    this._lhsModelName = modelName;
    this._lhsRelationshipName = relationshipName;
    this._lhsRelationshipMeta = relationshipMeta;

    this._rhsModelName = inverseModelName;
    this._rhsRelationshipName = inverseRelationshipName;
    this._rhsRelationshipMeta = inverseRelationshipMeta;

    // a map of id -> payloads for the left hand side of the relationship.
    this._lhsPayloads = Object.create(null);
    if (modelName !== inverseModelName || relationshipName !== inverseRelationshipName) {
      // The common case of a non-reflexive relationship, or a reflexive
      // relationship whose inverse is not itself
      this._rhsPayloads = Object.create(null);
      this._isReflexive = false;
    } else {
      // Edge case when we have a reflexive relationship to itself
      //  eg user hasMany friends inverse friends
      //
      //  In this case there aren't really two sides to the relationship, but
      //  we set `_rhsPayloads = _lhsPayloads` to make things easier to reason
      //  about
      this._rhsPayloads = this._lhsPayloads;
      this._isReflexive = true;
    }

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
      return this._lhsPayloads[id];
    } else {
      assert(`${modelName}:${relationshipName} is not either side of this relationship, ${this._lhsModelName}:${this._lhsRelationshipName}<->${this._rhsModelName}:${this._rhsRelationshipName}`, this._isRHS(modelName, relationshipName));
      return this._rhsPayloads[id];
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
      delete this._lhsPayloads[id];
    } else {
      assert(`${modelName}:${relationshipName} is not either side of this relationship, ${this._lhsModelName}:${this._lhsRelationshipName}<->${this._rhsModelName}:${this._rhsRelationshipName}`, this._isRHS(modelName, relationshipName));
      delete this._rhsPayloads[id];
    }
  }

  /**
    @return {boolean} true iff `modelName` and `relationshipName` refer to the
    left hand side of this relationship, as opposed to the right hand side.

    @method
  */
  _isLHS(modelName, relationshipName) {
    return modelName === this._lhsModelName && relationshipName === this._lhsRelationshipName;
  }

  /**
    @return {boolean} true iff `modelName` and `relationshipName` refer to the
    right hand side of this relationship, as opposed to the left hand side.

    @method
  */
  _isRHS(modelName, relationshipName) {
    return modelName === this._rhsModelName && relationshipName === this._rhsRelationshipName;
  }

  _flushPending() {
    if (this._pendingPayloads.length === 0) { return; }

    let payloadsToBeProcessed = this._pendingPayloads.splice(0, this._pendingPayloads.length);
    for (let i=0; i<payloadsToBeProcessed.length; ++i) {
      let modelName = payloadsToBeProcessed[i][0];
      let id = payloadsToBeProcessed[i][1];
      let relationshipName = payloadsToBeProcessed[i][2];
      let relationshipData = payloadsToBeProcessed[i][3];

      // TODO: maybe delay this allocation slightly?
      let inverseRelationshipData = {
        data: {
          id: id,
          type: modelName
        }
      }

      // start flushing this individual payload.  The logic is the same whether
      // it's for the left hand side of the relationship or the right hand side,
      // except the role of primary and inverse idToPayloads is reversed
      //
      let previousPayload;
      let idToPayloads;
      let inverseIdToPayloads;
      let inverseIsMany;
      if (this._isLHS(modelName, relationshipName)) {
        previousPayload = this._lhsPayloads[id];
        idToPayloads = this._lhsPayloads;
        inverseIdToPayloads = this._rhsPayloads;
        inverseIsMany = this._rhsRelationshipIsMany;
      } else {
        assert(`${modelName}:${relationshipName} is not either side of this relationship, ${this._lhsModelName}:${this._lhsRelationshipName}<->${this._rhsModelName}:${this._rhsRelationshipName}`, this._isRHS(modelName, relationshipName));
        previousPayload = this._rhsPayloads[id];
        idToPayloads = this._rhsPayloads;
        inverseIdToPayloads = this._lhsPayloads;
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
      this._removeInverse(id, previousPayload, inverseIdToPayloads);
      idToPayloads[id] = relationshipData;
      this._populateInverse(relationshipData, inverseRelationshipData, inverseIdToPayloads, inverseIsMany);
    }
  }

  /**
    Populate the inverse relationship for `relationshipData`.

    If `relationshipData` is an array (eg because the relationship is hasMany)
    this means populate each inverse, otherwise populate only the single
    inverse.

    @private
    @method
  */
  _populateInverse(relationshipData, inversePayload, inverseIdToPayloads, inverseIsMany) {
    if (!relationshipData.data) {
      // This id doesn't have an inverse, eg a belongsTo with a payload
      // { data: null }, so there's nothing to populate
      return;
    }

    if (Array.isArray(relationshipData.data)) {
      for (let i=0; i<relationshipData.data.length; ++i) {
        let inverseId = relationshipData.data[i].id;
        this._addToInverse(inversePayload, inverseId, inverseIdToPayloads, inverseIsMany);
      }
    } else {
      let inverseId = relationshipData.data.id;
      this._addToInverse(inversePayload, inverseId, inverseIdToPayloads, inverseIsMany);
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
  _addToInverse(inversePayload, inverseId, inverseIdToPayloads, inverseIsMany) {
    if (this._isReflexive && inversePayload.data.id === inverseId) {
      // eg <user:1>.friends = [{ id: 1, type: 'user' }]
      return;
    }

    let existingPayload = inverseIdToPayloads[inverseId];
    let existingData = existingPayload && existingPayload.data;

    if (existingData) {
      // There already is an inverse, either add or overwrite depehnding on
      // whether the inverse is a many relationship or not
      //
      if (Array.isArray(existingData)) {
        existingData.push(inversePayload.data);
      } else {
        inverseIdToPayloads[inverseId] = inversePayload;
      }
    } else {
      // first time we're populating the inverse side
      //
      if (inverseIsMany) {
        inverseIdToPayloads[inverseId] = {
          data: [inversePayload.data]
        }
      } else {
        inverseIdToPayloads[inverseId] = inversePayload;
      }
    }
  }

  get _lhsRelationshipIsMany() {
    return this._lhsRelationshipMeta && this._lhsRelationshipMeta.kind === 'hasMany';
  }

  get _rhsRelationshipIsMany() {
    return this._rhsRelationshipMeta && this._rhsRelationshipMeta.kind === 'hasMany';
  }

  /**
    Remove the relationship in `previousPayload` from its inverse(s), because
    this relationship payload has just been updated (eg because the same
    relationship had multiple payloads pushed before the relationship was
    initialized).

    @method
  */
  _removeInverse(id, previousPayload, inverseIdToPayloads) {
    let data = previousPayload && previousPayload.data;
    if (!data) {
      // either this is the first time we've seen a payload for this id, or its
      // previous payload indicated that it had no inverse, eg a belongsTo
      // relationship with payload { data: null }
      //
      // In either case there's nothing that needs to be removed from the
      // inverse map of payloads
      return;
    }

    if (Array.isArray(data)) {
      // TODO: diff rather than removeall addall?
      for (let i=0; i<data.length; ++i) {
        this._removeFromInverse(id, data[i].id, inverseIdToPayloads);
      }
    } else {
      this._removeFromInverse(id, data.id, inverseIdToPayloads);
    }
  }

  /**
    Remove `id` from its inverse record with id `inverseId`.  If the inverse
    relationship is a belongsTo, this means just setting it to null, if the
    inverse relationship is a hasMany, then remove that id from its array of ids.

    @method
  */
  _removeFromInverse(id, inverseId, inversePayloads) {
    let inversePayload = inversePayloads[inverseId];
    let data = inversePayload && inversePayload.data;

    if (!data) { return; }

    if (Array.isArray(data)) {
      inversePayload.data = data.filter((x) => x.id !== id);
    } else {
      inversePayloads[inverseId] = {
        data: null
      };
    }
  }
}
