/* global heimdall */
import { assert, warn } from "ember-data/-private/debug";
import OrderedSet from "ember-data/-private/system/ordered-set";
import _normalizeLink from "ember-data/-private/system/normalize-link";

const {
  addCanonicalInverse,
  addCanonicalInverses,
  addInverse,
  addInverses,
  clear,
  findLink,
  flushCanonical,
  flushCanonicalLater,
  newRelationship,
  push,
  removeCanonicalInverse,
  removeCanonicalInverseFromInverse,
  removeCanonicalInverseFromOwn,
  removeCanonicalInverses,
  removeInverse,
  removeInverseFromInverse,
  removeInverseFromOwn,
  removeInverses,
  setHasData,
  setHasLoaded,
  updateLink,
  updateMeta,
  updateInversesFromAdapter
} = heimdall.registerMonitor('system.relationships.state.relationship',
  'addCanonicalInverse',
  'addCanonicalInverses',
  'addInverse',
  'addInverses',
  'clear',
  'findLink',
  'flushCanonical',
  'flushCanonicalLater',
  'newRelationship',
  'push',
  'removeCanonicalInverse',
  'removeCanonicalInverseFromInverse',
  'removeCanonicalInverseFromOwn',
  'removeCanonicalInverses',
  'removeInverse',
  'removeInverseFromInverse',
  'removeInverseFromOwn',
  'removeInverses',
  'setHasData',
  'setHasLoaded',
  'updateLink',
  'updateMeta',
  'updateInversesFromAdapter'
);

export default class Relationship {
  constructor(store, internalModel, inverseKey, relationshipMeta) {
    heimdall.increment(newRelationship);
    var async = relationshipMeta.options.async;
    this.members = new OrderedSet();
    this.canonicalMembers = new OrderedSet();
    this.store = store;
    this.key = relationshipMeta.key;
    this.inverseKey = inverseKey;
    this.internalModel = internalModel;
    this.isAsync = typeof async === 'undefined' ? true : async;
    this.relationshipMeta = relationshipMeta;
    //This probably breaks for polymorphic relationship in complex scenarios, due to
    //multiple possible modelNames
    this.inverseKeyForImplicit = this.internalModel.modelName + this.key;
    this.linkPromise = null;
    this.meta = null;
    this.hasData = false;
    this.hasLoaded = false;
  }

  destroy() { }

  updateMeta(meta) {
    heimdall.increment(updateMeta);
    this.meta = meta;
  }

  clear() {
    heimdall.increment(clear);
    var members = this.members.list;
    var member;

    while (members.length > 0) {
      member = members[0];
      this.removeInverse(member);
    }
  }

  removeInverses(inverses) {
    heimdall.increment(removeInverses);
    inverses.forEach((inverse) => this.removeInverse(inverse));
  }

  addInverses(inverses, idx) {
    heimdall.increment(addInverses);
    inverses.forEach((inverse) => {
      this.addInverse(inverse, idx);
      if (idx !== undefined) {
        idx++;
      }
    });
  }

  addCanonicalInverses(inverses, idx) {
    heimdall.increment(addCanonicalInverses);
    for (var i=0; i<inverses.length; i++) {
      if (idx !== undefined) {
        this.addCanonicalInverse(inverses[i], i+idx);
      } else {
        this.addCanonicalInverse(inverses[i]);
      }
    }
  }

  addCanonicalInverse(inverse, idx) {
    heimdall.increment(addCanonicalInverse);
    if (!this.canonicalMembers.has(inverse)) {
      this.canonicalMembers.add(inverse);
      if (this.inverseKey) {
        inverse._relationships.get(this.inverseKey).addCanonicalInverse(this.internalModel);
      } else {
        if (!inverse._implicitRelationships[this.inverseKeyForImplicit]) {
          inverse._implicitRelationships[this.inverseKeyForImplicit] = new Relationship(this.store, inverse, this.key,  { options: {} });
        }
        inverse._implicitRelationships[this.inverseKeyForImplicit].addCanonicalInverse(this.internalModel);
      }
    }
    this.flushCanonicalLater();
    this.setHasData(true);
  }

  removeCanonicalInverses(inverses, idx) {
    heimdall.increment(removeCanonicalInverses);
    for (var i=0; i<inverses.length; i++) {
      if (idx !== undefined) {
        this.removeCanonicalInverse(inverses[i], i+idx);
      } else {
        this.removeCanonicalInverse(inverses[i]);
      }
    }
  }

  removeCanonicalInverse(inverse, idx) {
    heimdall.increment(removeCanonicalInverse);
    if (this.canonicalMembers.has(inverse)) {
      this.removeCanonicalInverseFromOwn(inverse);
      if (this.inverseKey) {
        this.removeCanonicalInverseFromInverse(inverse);
      } else {
        if (inverse._implicitRelationships[this.inverseKeyForImplicit]) {
          inverse._implicitRelationships[this.inverseKeyForImplicit].removeCanonicalInverse(this.internalModel);
        }
      }
    }
    this.flushCanonicalLater();
  }

  addInverse(inverse, idx) {
    heimdall.increment(addInverse);
    if (!this.members.has(inverse)) {
      this.members.addWithIndex(inverse, idx);
      this.notifyInverseRelationshipAdded(inverse, idx);
      if (this.inverseKey) {
        inverse._relationships.get(this.inverseKey).addInverse(this.internalModel);
      } else {
        if (!inverse._implicitRelationships[this.inverseKeyForImplicit]) {
          inverse._implicitRelationships[this.inverseKeyForImplicit] = new Relationship(this.store, inverse, this.key,  { options: {} });
        }
        inverse._implicitRelationships[this.inverseKeyForImplicit].addInverse(this.internalModel);
      }
      this.internalModel.updateRecordArrays();
    }
    this.setHasData(true);
  }

  removeInverse(inverse) {
    heimdall.increment(removeInverse);
    if (this.members.has(inverse)) {
      this.removeInverseFromOwn(inverse);
      if (this.inverseKey) {
        this.removeInverseFromInverse(inverse);
      } else {
        if (inverse._implicitRelationships[this.inverseKeyForImplicit]) {
          inverse._implicitRelationships[this.inverseKeyForImplicit].removeInverse(this.internalModel);
        }
      }
    }
  }

  removeInverseFromInverse(inverse) {
    heimdall.increment(removeInverseFromInverse);
    var inverseRelationship = inverse._relationships.get(this.inverseKey);
    //Need to check for existence, as the inverse might unloading at the moment
    if (inverseRelationship) {
      inverseRelationship.removeInverseFromOwn(this.internalModel);
    }
  }

  removeInverseFromOwn(inverse) {
    heimdall.increment(removeInverseFromOwn);
    this.members.delete(inverse);
    this.notifyInverseRelationshipRemoved(inverse);
    this.internalModel.updateRecordArrays();
  }

  removeCanonicalInverseFromInverse(inverse) {
    heimdall.increment(removeCanonicalInverseFromInverse);
    var inverseRelationship = inverse._relationships.get(this.inverseKey);
    //Need to check for existence, as the inverse might unloading at the moment
    if (inverseRelationship) {
      inverseRelationship.removeCanonicalInverseFromOwn(this.internalModel);
    }
  }

  removeCanonicalInverseFromOwn(inverse) {
    heimdall.increment(removeCanonicalInverseFromOwn);
    this.canonicalMembers.delete(inverse);
    this.flushCanonicalLater();
  }

  flushCanonical() {
    heimdall.increment(flushCanonical);
    let list = this.members.list;
    this.willSync = false;
    //a hack for not removing new inverses
    //TODO remove once we have proper diffing
    let newInverses = [];
    for (let i = 0; i < list.length; i++) {
      if (list[i].isNew()) {
        newInverses.push(list[i]);
      }
    }

    //TODO(Igor) make this less abysmally slow
    this.members = this.canonicalMembers.copy();
    for (let i = 0; i < newInverses.length; i++) {
      this.members.add(newInverses[i]);
    }
  }

  flushCanonicalLater() {
    heimdall.increment(flushCanonicalLater);
    if (this.willSync) {
      return;
    }
    this.willSync = true;
    this.store._updateRelationshipState(this);
  }

  updateLink(link) {
    heimdall.increment(updateLink);
    warn(`You pushed a record of type '${this.internalModel.type.modelName}' with a relationship '${this.key}' configured as 'async: false'. You've included a link but no primary data, this may be an error in your payload.`, this.isAsync || this.hasData , {
      id: 'ds.store.push-link-for-sync-relationship'
    });
    assert("You have pushed a record of type '" + this.internalModel.type.modelName + "' with '" + this.key + "' as a link, but the value of that link is not a string.", typeof link === 'string' || link === null);

    this.link = link;
    this.linkPromise = null;
    this.internalModel.notifyPropertyChange(this.key);
  }

  findLink() {
    heimdall.increment(findLink);
    if (this.linkPromise) {
      return this.linkPromise;
    } else {
      var promise = this.fetchLink();
      this.linkPromise = promise;
      return promise.then((result) => result);
    }
  }

  updateInversesFromAdapter(inverses) {
    heimdall.increment(updateInversesFromAdapter);
    //TODO(Igor) move this to a proper place
    //TODO Once we have adapter support, we need to handle updated and canonical changes
    this.computeChanges(inverses);
  }

  notifyInverseRelationshipAdded() { }
  notifyInverseRelationshipRemoved() { }

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
    heimdall.increment(setHasData);
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
    heimdall.increment(setHasLoaded);
    this.hasLoaded = value;
  }

  /*
   `push` for a relationship allows the store to push a JSON API Relationship
   Object onto the relationship. The relationship will then extract and set the
   meta, data and links of that relationship.

   `push` use `updateMeta`, `updateData` and `updateLink` to update the state
   of the relationship.
   */
  push(payload) {
    heimdall.increment(push);

    let hasData = false;
    let hasLink = false;

    if (payload.meta) {
      this.updateMeta(payload.meta);
    }

    if (payload.data !== undefined) {
      hasData = true;
      this.updateData(payload.data);
    }

    if (payload.links && payload.links.related) {
      let relatedLink = _normalizeLink(payload.links.related);
      if (relatedLink && relatedLink.href && relatedLink.href !== this.link) {
        hasLink = true;
        this.updateLink(relatedLink.href);
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

  updateData() {}
}
