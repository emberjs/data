import Ember from 'ember';
import RelationshipPayloads from './relationship-payloads';

const get = Ember.get;

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
    let modelClass = this._store._modelFor(modelName);
    let relationshipsByName = get(modelClass, 'relationshipsByName');
    let relationshipPayloads = this._getRelationshipPayloads(modelName, relationshipName, modelClass, relationshipsByName, false);
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
    if (!relationshipsData) { return; }

    let modelClass = this._store._modelFor(modelName);
    let relationshipsByName = get(modelClass, 'relationshipsByName');
    Object.keys(relationshipsData).forEach(key => {
      let relationshipPayloads = this._getRelationshipPayloads(modelName, key, modelClass, relationshipsByName, true);
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
    let modelClass = this._store._modelFor(modelName);
    let relationshipsByName = get(modelClass, 'relationshipsByName');
    relationshipsByName.forEach((_, relationshipName) => {
      let relationshipPayloads = this._getRelationshipPayloads(modelName, relationshipName, modelClass, relationshipsByName, false);
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
      a)  string maipulation & allocation with `modelName` and
         `relationshipName`
      b)  repeatedly getting `relationshipsByName` via `Ember.get`


    @private
    @method
  */
  _getRelationshipPayloads(modelName, relationshipName, modelClass, relationshipsByName, init) {
    if (!relationshipsByName.has(relationshipName)) { return; }

    let key = `${modelName}:${relationshipName}`;
    if (!this._cache[key] && init) {
      return this._initializeRelationshipPayloads(modelName, relationshipName, modelClass, relationshipsByName);
    }

    return this._cache[key];
  }

  /**
    Create the `RelationshipsPayload` for the relationship `modelName`, `relationshipName`, and its inverse.

    @private
    @method
  */
  _initializeRelationshipPayloads(modelName, relationshipName, modelClass, relationshipsByName) {
    let relationshipMeta = relationshipsByName.get(relationshipName);
    let inverseMeta = modelClass.inverseFor(relationshipName, this._store);

    let inverseModelName;
    let inverseRelationshipName;
    let inverseRelationshipMeta;

    // figure out the inverse relationship; we need two things
    //  a) the inverse model name
    //- b) the name of the inverse relationship
    if (inverseMeta) {
      inverseRelationshipName = inverseMeta.name
      inverseModelName = relationshipMeta.type;
      inverseRelationshipMeta = get(inverseMeta.type, 'relationshipsByName').get(inverseRelationshipName);
    } else {
      // relationship has no inverse
      inverseModelName = inverseRelationshipName = '';
      inverseRelationshipMeta = null;
    }

    let lhsKey = `${modelName}:${relationshipName}`;
    let rhsKey = `${inverseModelName}:${inverseRelationshipName}`;

    // populate the cache for both sides of the relationship, as they both use
    // the same `RelationshipPayloads`.
    //
    // This works out better than creating a single common key, because to
    // compute that key we would need to do work to look up the inverse
    //
    return this._cache[lhsKey] =
      this._cache[rhsKey] =
      new RelationshipPayloads(
        this._store,
        modelName,
        relationshipName,
        relationshipMeta,
        inverseModelName,
        inverseRelationshipName,
        inverseRelationshipMeta
      );
  }
}
