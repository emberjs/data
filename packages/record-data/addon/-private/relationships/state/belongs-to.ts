import { assert, inspect } from '@ember/debug';
import { isNone } from '@ember/utils';

import { assertPolymorphicType } from '@ember-data/store/-debug';
import { identifierCacheFor } from '@ember-data/store/-private';

import Relationship, { isNew } from './relationship';

type DefaultSingleResourceRelationship = import('../../ts-interfaces/relationship-record-data').DefaultSingleResourceRelationship;
type RelationshipSchema = import('@ember-data/store/-private/ts-interfaces/record-data-schemas').RelationshipSchema;
type StableRecordIdentifier = import('@ember-data/store/-private/ts-interfaces/identifier').StableRecordIdentifier;
type ExistingResourceIdentifierObject = import('@ember-data/store/-private/ts-interfaces/ember-data-json-api').ExistingResourceIdentifierObject;

export default class BelongsToRelationship extends Relationship {
  inverseIdentifier: StableRecordIdentifier | null;
  canonicalState: StableRecordIdentifier | null;
  kind: 'belongsTo' = 'belongsTo';
  key: string;

  constructor(
    store: any,
    inverseKey: string | null,
    relationshipMeta: RelationshipSchema,
    identifier: StableRecordIdentifier,
    inverseIsAsync: boolean
  ) {
    super(store, inverseKey, relationshipMeta, identifier, inverseIsAsync);
    this.inverseIdentifier = null;
    this.canonicalState = null;
    this.key = relationshipMeta.key;
  }

  setIdentifier(identifier: StableRecordIdentifier | null) {
    if (identifier) {
      this.addIdentifier(identifier);
    } else if (this.inverseIdentifier) {
      this.removeIdentifier(this.inverseIdentifier);
    }

    this.setHasAnyRelationshipData(true);
    this.setRelationshipIsStale(false);
    this.setRelationshipIsEmpty(false);
  }

  setCanonicalIdentifier(identifier: StableRecordIdentifier) {
    if (identifier) {
      this.addCanonicalIdentifier(identifier);
    } else if (this.canonicalState) {
      this.removeCanonicalIdentifier(this.canonicalState);
    }
    this.flushCanonicalLater();
  }

  addCanonicalIdentifier(identifier: StableRecordIdentifier) {
    if (this.canonicalMembers.has(identifier)) {
      return;
    }

    if (this.canonicalState) {
      this.removeCanonicalIdentifier(this.canonicalState);
    }

    this.canonicalState = identifier;
    super.addCanonicalIdentifier(identifier);
    this.setHasAnyRelationshipData(true);
    this.setRelationshipIsEmpty(false);
  }

  inverseDidDematerialize() {
    super.inverseDidDematerialize(this.inverseIdentifier);
    this.notifyBelongsToChange();
  }

  removeCompletelyFromOwn(identifier: StableRecordIdentifier) {
    super.removeCompletelyFromOwn(identifier);

    if (this.canonicalState === identifier) {
      this.canonicalState = null;
    }

    if (this.inverseIdentifier === identifier) {
      this.inverseIdentifier = null;
      this.notifyBelongsToChange();
    }
  }
  removeCompletelyFromInverse() {
    super.removeCompletelyFromInverse();

    this.inverseIdentifier = null;
  }

  flushCanonical() {
    //temporary fix to not remove newly created records if server returned null.
    //TODO remove once we have proper diffing
    if (this.inverseIdentifier && isNew(this.inverseIdentifier) && !this.canonicalState) {
      this.willSync = false;
      return;
    }
    if (this.inverseIdentifier !== this.canonicalState) {
      this.inverseIdentifier = this.canonicalState;
      this.notifyBelongsToChange();
    }
    super.flushCanonical();
  }

  addIdentifier(identifier: StableRecordIdentifier) {
    if (this.members.has(identifier)) {
      return;
    }

    assertPolymorphicType(
      this.storeWrapper.recordDataFor(this.identifier.type, this.identifier.id, this.identifier.lid),
      this.relationshipMeta,
      this.storeWrapper.recordDataFor(identifier.type, identifier.id, identifier.lid),
      this.store
    );

    if (this.inverseIdentifier) {
      this.removeIdentifier(this.inverseIdentifier);
    }

    this.inverseIdentifier = identifier;
    super.addIdentifier(identifier);
    this.notifyBelongsToChange();
  }

  removeIdentifierFromOwn(identifier: StableRecordIdentifier) {
    if (!this.members.has(identifier)) {
      return;
    }
    this.inverseIdentifier = null;
    super.removeIdentifierFromOwn(identifier);
    this.notifyBelongsToChange();
  }

  removeAllIdentifiersFromOwn() {
    super.removeAllIdentifiersFromOwn();
    this.inverseIdentifier = null;
    this.notifyBelongsToChange();
  }

  notifyBelongsToChange() {
    let identifier = this.identifier;
    this.storeWrapper.notifyBelongsToChange(identifier.type, identifier.id, identifier.lid, this.key);
  }

  removeCanonicalIdentifierFromOwn(identifier: StableRecordIdentifier) {
    if (!this.canonicalMembers.has(identifier)) {
      return;
    }
    this.canonicalState = null;
    this.setHasAnyRelationshipData(true);
    this.setRelationshipIsEmpty(true);
    super.removeCanonicalIdentifierFromOwn(identifier);
  }

  removeAllCanonicalIdentifiersFromOwn() {
    super.removeAllCanonicalIdentifiersFromOwn();
    this.canonicalState = null;
  }

  getData(): DefaultSingleResourceRelationship {
    let data;
    let payload: any = {};
    if (this.inverseIdentifier) {
      data = this.inverseIdentifier;
    }
    if (this.inverseIdentifier === null && this.hasAnyRelationshipData) {
      data = null;
    }
    if (this.links) {
      payload.links = this.links;
    }
    if (data !== undefined) {
      payload.data = data;
    }
    if (this.meta) {
      payload.meta = this.meta;
    }

    payload._relationship = this;
    return payload;
  }

  updateData(data: ExistingResourceIdentifierObject) {
    let identifier;
    if (isNone(data)) {
      identifier = null;
    }
    assert(
      `Ember Data expected the data for the ${this.key} relationship on a ${
        this.identifier
      } to be in a JSON API format and include an \`id\` and \`type\` property but it found ${inspect(
        data
      )}. Please check your serializer and make sure it is serializing the relationship payload into a JSON API format.`,
      data === null || (data.id !== undefined && data.type !== undefined)
    );

    if (identifier !== null) {
      identifier = identifierCacheFor(this.store).getOrCreateRecordIdentifier(data);
    }
    this.setCanonicalIdentifier(identifier);
  }
}
