/* global heimdall */
import { assert, warn } from 'ember-data/-debug';
import _normalizeLink from '../../normalize-link';

let REL_ID = 0;

export function relationshipIsAsync(meta) {
  let value = meta.options.async;

  return typeof value === 'undefined' ? true : value;
}

export function relationshipIsPolymorphic(meta) {
  return meta.options.polymorphic || false;
}

export default class Relationship {
  constructor(store, internalModel, inverseKey, relationshipMeta) {
    this.rel_id = REL_ID++;
    this.store = store;
    this.internalModel = internalModel;
    this.relationshipMeta = relationshipMeta;
    this.inverseKey = inverseKey;

    this.key = relationshipMeta.key;
    this.isAsync = relationshipIsAsync(relationshipMeta);
    this.isPolymorphic = relationshipIsPolymorphic(relationshipMeta);

    this.currentState = null;
    this.canonicalState = null;

    this.link = null;
    this.linkPromise = null;
    this.hasData = false;
    this.hasLoaded = false;
    this.meta = null;
    this.willSync = false;

    //This probably breaks for polymorphic relationship in complex scenarios, due to
    //multiple possible modelNames
    this.inverseKeyForImplicit = this.internalModel.modelName + this.key;
  }

  inverseDidDematerialize() {}
  notifyRecordRelationshipAdded() {}
  notifyRecordRelationshipRemoved() {}

  removeInternalModel() {
    throw new Error('not implemented');
  }
  removeCanonicalInternalModel() {
    throw new Error('not implemented');
  }

  removeInternalModelFromInverse(internalModel) {
    let inverseRelationship = internalModel._relationships.get(this.inverseKey);

    //Need to check for existence, as the record might unloading at the moment
    if (inverseRelationship) {
      inverseRelationship.removeInternalModelFromOwn(this.internalModel);
    }
  }

  setupInverseRelationship() {
    throw new Error('not implemented');
  }

  removeCanonicalInternalModelFromInverse(internalModel) {
    let inverseRelationship = internalModel._relationships.get(this.inverseKey);
    //Need to check for existence, as the record might unloading at the moment
    if (inverseRelationship) {
      inverseRelationship.removeCanonicalInternalModelFromOwn(this.internalModel);
    }
  }

  /*
   `push` for a relationship allows the store to push a JSON API Relationship
   Object onto the relationship. The relationship will then extract and set the
   meta, data and links of that relationship.

   `push` use `updateMeta`, `updateData` and `updateLink` to update the state
   of the relationship.
   */
  push(payload, initial) {
    let hasData = false;
    let hasLink = false;

    if (payload.meta) {
      this.updateMeta(payload.meta);
    }

    if (payload.data !== undefined) {
      hasData = true;
      this.updateData(payload.data, initial);
    }

    if (payload.links && payload.links.related) {
      let relatedLink = _normalizeLink(payload.links.related);
      if (relatedLink && relatedLink.href && relatedLink.href !== this.link) {
        hasLink = true;
        this.updateLink(relatedLink.href, initial);
      }
    }

    /*
     Data being pushed into the relationship might contain only data or links,
     or a combination of both.

     If we got data we want to set both hasData and hasLoaded to true since
     this would indicate that we should prefer the local state instead of
     trying to fetch the link or call findRecord().

     If we have no data but a link is present we want to set hasLoaded to false
     without modifying the hasData flag. This will ensure we fetch the updated
     link next time the relationship is accessed.
     */
    if (hasData) {
      this.setHasData(true);
      this.setHasLoaded(true);
    } else if (hasLink) {
      this.setHasLoaded(false);
    }
  }

  flushCanonicalLater() {
    if (this.willSync) {
      return;
    }
    this.willSync = true;
    this.store._updateRelationshipState(this);
  }

  updateMeta(meta) {
    this.meta = meta;
  }

  updateData() {}

  /*
   `hasData` for a relationship is a flag to indicate if we consider the
   content of this relationship "known". Snapshots uses this to tell the
   difference between unknown (`undefined`) or empty (`null`). The reason for
   this is that we wouldn't want to serialize unknown relationships as `null`
   as that might overwrite remote state.

   All relationships for a newly created (`store.createRecord()`) are
   considered known (`hasData === true`).
   */
  setHasData(value) {
    this.hasData = value;
  }

  /*
   `hasLoaded` is a flag to indicate if we have gotten data from the adapter or
   not when the relationship has a link.

   This is used to be able to tell when to fetch the link and when to return
   the local data in scenarios where the local state is considered known
   (`hasData === true`).

   Updating the link will automatically set `hasLoaded` to `false`.
   */
  setHasLoaded(value) {
    this.hasLoaded = value;
  }

  findLink() {
    if (this.linkPromise) {
      return this.linkPromise;
    } else {
      let promise = this.fetchLink();
      this.linkPromise = promise;
      return promise.then((result) => result);
    }
  }

  updateLink(link) {
    warn(`You pushed a record of type '${this.internalModel.modelName}' with a relationship '${this.key}' configured as 'async: false'. You've included a link but no primary data, this may be an error in your payload.`, this.isAsync || this.hasData , {
      id: 'ds.store.push-link-for-sync-relationship'
    });
    assert(`You have pushed a record of type '${this.internalModel.modelName}' with '${this.key}' as a link, but the value of that link is not a string.`, typeof link === 'string' || link === null);

    this.link = link;
    this.linkPromise = null;
    this.internalModel.notifyPropertyChange(this.key);
  }

  clear() {
    throw new Error('not implemented');
  }

  removeInverseRelationships() {
    throw new Error('not implemented');
  }
}
