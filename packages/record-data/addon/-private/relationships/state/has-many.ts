import { isNone } from '@ember/utils';

import { CUSTOM_MODEL_CLASS } from '@ember-data/canary-features';
import { assertPolymorphicType } from '@ember-data/store/-debug';
import { identifierCacheFor } from '@ember-data/store/-private';

import OrderedSet from '../../ordered-set';
import Relationship, { isNew } from './relationship';

type DefaultCollectionResourceRelationship = import('../../ts-interfaces/relationship-record-data').DefaultCollectionResourceRelationship;
type RelationshipSchema = import('@ember-data/store/-private/ts-interfaces/record-data-schemas').RelationshipSchema;
type StableRecordIdentifier = import('@ember-data/store/-private/ts-interfaces/identifier').StableRecordIdentifier;

/**
  @module @ember-data/store
*/

export default class ManyRelationship extends Relationship {
  canonicalState: StableRecordIdentifier[];
  currentState: StableRecordIdentifier[];
  _willUpdateManyArray: boolean;
  _pendingManyArrayUpdates: any;
  key: string;
  kind: 'hasMany' = 'hasMany';

  constructor(
    store: any,
    inverseKey: string | null,
    relationshipMeta: RelationshipSchema,
    identifier: StableRecordIdentifier,
    inverseIsAsync: boolean
  ) {
    super(store, inverseKey, relationshipMeta, identifier, inverseIsAsync);
    this.canonicalState = [];
    this.currentState = [];
    this._willUpdateManyArray = false;
    this._pendingManyArrayUpdates = null;
    this.key = relationshipMeta.key;
  }

  addCanonicalIdentifier(identifier: StableRecordIdentifier, idx?: number) {
    if (this.canonicalMembers.has(identifier)) {
      return;
    }
    if (idx !== undefined) {
      this.canonicalState.splice(idx, 0, identifier);
    } else {
      this.canonicalState.push(identifier);
    }
    super.addCanonicalIdentifier(identifier, idx);
  }

  inverseDidDematerialize(inverseIdentifier: StableRecordIdentifier) {
    super.inverseDidDematerialize(inverseIdentifier);
    if (this.isAsync) {
      this.notifyManyArrayIsStale();
    }
  }

  addIdentifier(identifier: StableRecordIdentifier, idx?: number) {
    if (this.members.has(identifier)) {
      return;
    }

    // TODO Type this
    assertPolymorphicType(
      this.storeWrapper.recordDataFor(this.identifier.type, this.identifier.id, this.identifier.lid),
      this.relationshipMeta,
      this.storeWrapper.recordDataFor(identifier.type, identifier.id, identifier.lid),
      this.store
    );
    super.addIdentifier(identifier, idx);
    // make lazy later
    if (idx === undefined) {
      idx = this.currentState.length;
    }
    this.currentState.splice(idx, 0, identifier);
    // TODO Igor consider making direct to remove the indirection
    // We are not lazily accessing the manyArray here because the change is coming from app side
    // this.manyArray.flushCanonical(this.currentState);
    this.notifyHasManyChange();
  }

  removeCanonicalIdentifierFromOwn(identifier: StableRecordIdentifier, idx?: number) {
    let i = idx;
    if (!this.canonicalMembers.has(identifier)) {
      return;
    }
    if (i === undefined) {
      i = this.canonicalState.indexOf(identifier);
    }
    if (i > -1) {
      this.canonicalState.splice(i, 1);
    }
    super.removeCanonicalIdentifierFromOwn(identifier, idx);
    //TODO(Igor) Figure out what to do here
  }

  removeAllCanonicalIdentifiersFromOwn() {
    super.removeAllCanonicalIdentifiersFromOwn();
    this.canonicalMembers.clear();
    this.canonicalState.splice(0, this.canonicalState.length);
    super.removeAllCanonicalIdentifiersFromOwn();
  }

  //TODO(Igor) DO WE NEED THIS?
  removeCompletelyFromOwn(identifier: StableRecordIdentifier) {
    super.removeCompletelyFromOwn(identifier);

    // TODO SkEPTICAL
    const canonicalIndex = this.canonicalState.indexOf(identifier);

    if (canonicalIndex !== -1) {
      this.canonicalState.splice(canonicalIndex, 1);
    }

    this.removeIdentifierFromOwn(identifier);
  }

  flushCanonical() {
    let toSet = this.canonicalState;

    //a hack for not removing new records
    //TODO remove once we have proper diffing
    let newIdentifiers = this.currentState.filter(
      // only add new internalModels which are not yet in the canonical state of this
      // relationship (a new internalModel can be in the canonical state if it has
      // been 'acknowleged' to be in the relationship via a store.push)

      //TODO Igor deal with this
      identifier => isNew(identifier) && toSet.indexOf(identifier) === -1
    );
    toSet = toSet.concat(newIdentifiers);

    /*
    if (this._manyArray) {
      this._manyArray.flushCanonical(toSet);
    }
    */
    this.currentState = toSet;
    super.flushCanonical();
    // Once we clean up all the flushing, we will be left with at least the notifying part
    this.notifyHasManyChange();
  }

  //TODO(Igor) idx not used currently, fix
  removeIdentifierFromOwn(identifier: StableRecordIdentifier, idx?: number) {
    super.removeIdentifierFromOwn(identifier, idx);
    let index = idx || this.currentState.indexOf(identifier);

    //TODO IGOR DAVID INVESTIGATE
    if (index === -1) {
      return;
    }
    this.currentState.splice(index, 1);
    // TODO Igor consider making direct to remove the indirection
    // We are not lazily accessing the manyArray here because the change is coming from app side
    this.notifyHasManyChange();
    // this.manyArray.flushCanonical(this.currentState);
  }

  notifyRecordRelationshipAdded() {
    this.notifyHasManyChange();
  }

  computeChanges(identifiers: StableRecordIdentifier[] = []) {
    let members = this.canonicalMembers;
    let identifiersToRemove: StableRecordIdentifier[] = [];
    let identifiersSet = setForArray(identifiers);

    members.forEach(member => {
      if (identifiersSet.has(member)) {
        return;
      }

      identifiersToRemove.push(member);
    });

    this.removeCanonicalIdentifiers(identifiersToRemove);

    for (let i = 0, l = identifiers.length; i < l; i++) {
      let identifier = identifiers[i];

      if (members.list[i] !== identifier) {
        this.removeCanonicalIdentifier(identifier);
        this.addCanonicalIdentifier(identifier, i);
      }
    }
    // TODO this flush is here because we may not have triggered one above
    // due to the index guard on the remove+add pattern.
    //
    // while not doing this flush is actually an improvement, for semantics we
    // have to preserve the flush cannonical to "lose" local changes
    this.flushCanonicalLater();
  }

  /*
    This is essentially a "sync" version of
      notifyHasManyChange. We should work to unify
      these worlds

      - @runspired
  */
  notifyManyArrayIsStale() {
    let identifier = this.identifier;
    if (CUSTOM_MODEL_CLASS) {
      this.storeWrapper.notifyHasManyChange(identifier.type, identifier.id, identifier.lid, this.key);
    } else {
      this.storeWrapper.notifyPropertyChange(identifier.type, identifier.id, identifier.lid, this.key);
    }
  }

  notifyHasManyChange() {
    let identifier = this.identifier;
    this.storeWrapper.notifyHasManyChange(identifier.type, identifier.id, identifier.lid, this.key);
  }

  getData(): DefaultCollectionResourceRelationship {
    let payload: any = {};
    if (this.hasAnyRelationshipData) {
      payload.data = this.currentState.slice();
    }
    if (this.links) {
      payload.links = this.links;
    }
    if (this.meta) {
      payload.meta = this.meta;
    }

    // TODO @runspired: the @igor refactor is too limiting for relationship state
    //   we should reconsider where we fetch from.
    payload._relationship = this;

    return payload;
  }

  updateData(data) {
    let identifiers: StableRecordIdentifier[] | undefined;
    if (isNone(data)) {
      identifiers = undefined;
    } else {
      identifiers = new Array(data.length);
      const cache = identifierCacheFor(this.store);
      for (let i = 0; i < data.length; i++) {
        identifiers[i] = cache.getOrCreateRecordIdentifier(data[i]);
      }
    }
    this.updateIdentifiersFromAdapter(identifiers);
  }
}

function setForArray(array) {
  var set = new OrderedSet();

  if (array) {
    for (var i = 0, l = array.length; i < l; i++) {
      set.add(array[i]);
    }
  }

  return set;
}
