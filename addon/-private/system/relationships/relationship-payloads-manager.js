import { get } from '@ember/object';
// import { DEBUG } from '@glimmer/env';
import { assert } from '@ember/debug';
import { default as RelationshipPayloads, TypeCache } from './relationship-payloads';

/**
  Manages relationship payloads for a given store, for uninitialized
  relationships.  Acts as a single source of truth (of payloads) for both sides
  of an uninitialized relationship so they can agree on the most up-to-date
  payload received without needing too much eager processing when those payloads
  are pushed into the store.

  This minimizes the work spent on relationships that are never initialized.

  Once relationships are initialized, their state is managed in a relationship
  state object (eg BelongsToRelationship or ManyRelationship).


  @example

    let relationshipPayloadsManager = new RelationshipPayloadsManager(store);

    const User = DS.Model.extend({
      hobbies: DS.hasMany('hobby')
    });

    const Hobby = DS.Model.extend({
      user: DS.belongsTo('user')
    });

    let userPayload = {
      data: {
        id: 1,
        type: 'user',
        relationships: {
          hobbies: {
            data: [{
              id: 2,
              type: 'hobby'
            }]
          }
        }
      },
    };
    relationshipPayloadsManager.push('user', 1, userPayload.data.relationships);

    relationshipPayloadsManager.get('hobby', 2, 'user') === {
      {
        data: {
          id: 1,
          type: 'user'
        }
      }
    }

  @private
  @class RelationshipPayloadsManager
*/
export default class RelationshipPayloadsManager {
  constructor(store) {
    this._store = store;
    // cache of `RelationshipPayload`s
    this._cache = Object.create(null);
    this._inverseLookupCache = new TypeCache();
  }

  /**
    Find the payload for the given relationship of the given model.

    Returns the payload for the given relationship, whether raw or computed from
    the payload of the inverse relationship.

    @example

      relationshipPayloadsManager.get('hobby', 2, 'user') === {
        {
          data: {
            id: 1,
            type: 'user'
          }
        }
      }

    @method
  */
  get(modelName, id, relationshipName) {
    let relationshipPayloads = this._getRelationshipPayloads(modelName, relationshipName, false);
    return relationshipPayloads && relationshipPayloads.get(modelName, id, relationshipName);
  }

  /**
    Push a model's relationships payload into this cache.

    @example

      let userPayload = {
        data: {
          id: 1,
          type: 'user',
          relationships: {
            hobbies: {
              data: [{
                id: 2,
                type: 'hobby'
              }]
            }
          }
        },
      };
      relationshipPayloadsManager.push('user', 1, userPayload.data.relationships);

    @method
  */
  push(modelName, id, relationshipsData) {
    if (!relationshipsData) {
      return;
    }

    Object.keys(relationshipsData).forEach(key => {
      let relationshipPayloads = this._getRelationshipPayloads(modelName, key, true);
      if (relationshipPayloads) {
        relationshipPayloads.push(modelName, id, key, relationshipsData[key]);
      }
    });
  }

  /**
    Unload a model's relationships payload.

    @method
  */
  unload(modelName, id) {
    let modelClass = this._store.modelFor(modelName);
    let relationshipsByName = get(modelClass, 'relationshipsByName');
    relationshipsByName.forEach((_, relationshipName) => {
      let relationshipPayloads = this._getRelationshipPayloads(modelName, relationshipName, false);
      if (relationshipPayloads) {
        relationshipPayloads.unload(modelName, id, relationshipName);
      }
    });
  }

  /**
    Find the RelationshipPayloads object for the given relationship.  The same
    RelationshipPayloads object is returned for either side of a relationship.

    @example

      const User = DS.Model.extend({
        hobbies: DS.hasMany('hobby')
      });

      const Hobby = DS.Model.extend({
        user: DS.belongsTo('user')
      });

      relationshipPayloads.get('user', 'hobbies') === relationshipPayloads.get('hobby', 'user');

    The signature has a somewhat large arity to avoid extra work, such as
      a)  string manipulation & allocation with `modelName` and
         `relationshipName`
      b)  repeatedly getting `relationshipsByName` via `Ember.get`


    @private
    @method
  */
  _getRelationshipPayloads(modelName, relationshipName, init) {
    let relInfo = this.getRelationshipInfo(modelName, relationshipName);

    if (relInfo === null) {
      return;
    }

    let cache = this._cache[relInfo.lhs_key];

    if (!cache && init) {
      return this._initializeRelationshipPayloads(relInfo);
    }

    return cache;
  }

  getRelationshipInfo(modelName, relationshipName) {
    let inverseCache = this._inverseLookupCache;
    let store = this._store;
    let cached = inverseCache.get(modelName, relationshipName);

    // CASE: We have a cached resolution (null if no relationship exists)
    if (cached !== undefined) {
      return cached;
    }

    let modelClass = store.modelFor(modelName);
    let relationshipsByName = get(modelClass, 'relationshipsByName');

    // CASE: We don't have a relationship at all
    if (!relationshipsByName.has(relationshipName)) {
      inverseCache.set(modelName, relationshipName, null);
      return null;
    }

    let relationshipMeta = relationshipsByName.get(relationshipName);
    let inverseMeta;

    // CASE: Inverse is explicitly null
    if (relationshipMeta.options && relationshipMeta.options.inverse === null) {
      inverseMeta = null;
    } else {
      inverseMeta = modelClass.inverseFor(relationshipName, store);
    }

    let selfIsPolymorphic =
      relationshipMeta.options !== undefined && relationshipMeta.options.polymorphic === true;
    let inverseBaseModelName = relationshipMeta.type;

    // CASE: We have no inverse
    if (!inverseMeta) {
      let info = {
        lhs_key: `${modelName}:${relationshipName}`,
        lhs_modelNames: [modelName],
        lhs_baseModelName: modelName,
        lhs_relationshipName: relationshipName,
        lhs_relationshipMeta: relationshipMeta,
        lhs_isPolymorphic: selfIsPolymorphic,
        rhs_key: '',
        rhs_modelNames: [],
        rhs_baseModelName: inverseBaseModelName,
        rhs_relationshipName: '',
        rhs_relationshipMeta: null,
        rhs_isPolymorphic: false,
        hasInverse: false,
        isSelfReferential: false, // modelName === inverseBaseModelName,
        isReflexive: false,
      };

      inverseCache.set(modelName, relationshipName, info);

      return info;
    }

    // CASE: We do have an inverse

    let inverseRelationshipName = inverseMeta.name;
    let inverseRelationshipMeta = get(inverseMeta.type, 'relationshipsByName').get(
      inverseRelationshipName
    );
    let baseModelName = inverseRelationshipMeta.type;
    let isSelfReferential = baseModelName === inverseBaseModelName;

    // TODO we want to assert this but this breaks all of our shoddily written tests
    /*
    if (DEBUG) {
      let inverseDoubleCheck = inverseMeta.type.inverseFor(inverseRelationshipName, store);

      assert(`The ${inverseBaseModelName}:${inverseRelationshipName} relationship declares 'inverse: null', but it was resolved as the inverse for ${baseModelName}:${relationshipName}.`, inverseDoubleCheck);
    }
    */

    // CASE: We may have already discovered the inverse for the baseModelName
    // CASE: We have already discovered the inverse
    cached =
      inverseCache.get(baseModelName, relationshipName) ||
      inverseCache.get(inverseBaseModelName, inverseRelationshipName);
    if (cached) {
      // TODO this assert can be removed if the above assert is enabled
      assert(
        `The ${inverseBaseModelName}:${inverseRelationshipName} relationship declares 'inverse: null', but it was resolved as the inverse for ${baseModelName}:${relationshipName}.`,
        cached.hasInverse !== false
      );

      let isLHS = cached.lhs_baseModelName === baseModelName;
      let modelNames = isLHS ? cached.lhs_modelNames : cached.rhs_modelNames;
      // make this lookup easier in the future by caching the key
      modelNames.push(modelName);
      inverseCache.set(modelName, relationshipName, cached);

      return cached;
    }

    let info = {
      lhs_key: `${baseModelName}:${relationshipName}`,
      lhs_modelNames: [modelName],
      lhs_baseModelName: baseModelName,
      lhs_relationshipName: relationshipName,
      lhs_relationshipMeta: relationshipMeta,
      lhs_isPolymorphic: selfIsPolymorphic,
      rhs_key: `${inverseBaseModelName}:${inverseRelationshipName}`,
      rhs_modelNames: [],
      rhs_baseModelName: inverseBaseModelName,
      rhs_relationshipName: inverseRelationshipName,
      rhs_relationshipMeta: inverseRelationshipMeta,
      rhs_isPolymorphic:
        inverseRelationshipMeta.options !== undefined &&
        inverseRelationshipMeta.options.polymorphic === true,
      hasInverse: true,
      isSelfReferential,
      isReflexive: isSelfReferential && relationshipName === inverseRelationshipName,
    };

    // Create entries for the baseModelName as well as modelName to speed up
    //  inverse lookups
    inverseCache.set(baseModelName, relationshipName, info);
    inverseCache.set(modelName, relationshipName, info);

    // Greedily populate the inverse
    inverseCache.set(inverseBaseModelName, inverseRelationshipName, info);

    return info;
  }

  /**
    Create the `RelationshipsPayload` for the relationship `modelName`, `relationshipName`, and its inverse.

    @private
    @method
  */
  _initializeRelationshipPayloads(relInfo) {
    let lhsKey = relInfo.lhs_key;
    let rhsKey = relInfo.rhs_key;
    let existingPayloads = this._cache[lhsKey];

    if (relInfo.hasInverse === true && relInfo.rhs_isPolymorphic === true) {
      existingPayloads = this._cache[rhsKey];

      if (existingPayloads !== undefined) {
        this._cache[lhsKey] = existingPayloads;
        return existingPayloads;
      }
    }

    // populate the cache for both sides of the relationship, as they both use
    // the same `RelationshipPayloads`.
    //
    // This works out better than creating a single common key, because to
    // compute that key we would need to do work to look up the inverse
    //
    let cache = (this._cache[lhsKey] = new RelationshipPayloads(relInfo));

    if (relInfo.hasInverse === true) {
      this._cache[rhsKey] = cache;
    }

    return cache;
  }
}
