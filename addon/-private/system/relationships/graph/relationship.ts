import Store from '../../store';
import { TrackedMembership } from './membership';
import { RecordIdentifier, TMeta } from '../../cache/record-identifier';
import { RelationshipDefinition } from '../../relationship-meta';
import stateFor from './state-for';
import { DEBUG } from '@glimmer/env';

export type Link = string | { href: string; meta?: TMeta };
export interface ILinks {
  self?: Link;
  related?: Link;
}
export interface IRelationshipLinks extends ILinks {
  first?: Link | null;
  last?: Link | null;
  prev?: Link | null;
  next?: Link | null;
}
export interface IResourceRelationshipIdentifier {
  data?: RecordIdentifier | null;
  meta?: TMeta;
  links?: ILinks;
}
export interface ICollectionRelationshipIdentifier {
  data?: RecordIdentifier[];
  meta?: TMeta;
  links?: IRelationshipLinks;
}
type TRelationshipIdentifier = IResourceRelationshipIdentifier | ICollectionRelationshipIdentifier;

// could be many things, but locked down to TRelationshipIdentifier for now
//  explicitly disallows `null`
function hasMeta(jsonApiObject: TRelationshipIdentifier) {
  return (
    typeof jsonApiObject.meta !== 'undefined' &&
    typeof jsonApiObject.meta === 'object' &&
    jsonApiObject.meta !== null
  );
}

function relationshipHasLinks(relationship: TRelationshipIdentifier): boolean {
  return (
    typeof relationship.links !== 'undefined' &&
    typeof relationship.links === 'object' &&
    relationship.links !== null
  );
}

function relationshipHasRelatedLink(links: ILinks): boolean {
  return (
    (typeof links.related !== 'undefined' &&
      (typeof links.related === 'string' && links.related.length > 0)) ||
    (typeof links.related === 'object' &&
      links.related !== null &&
      (typeof links.related.href === 'string' && links.related.href.length > 0))
  );
}

class RelationshipState {
  public hasReceivedData: boolean = false;
  public isEmpty: boolean = false;
  public isStale: boolean = false;
  public hasFailedLoadAttempt: boolean = false;
  public shouldForceReload: boolean = false;
  public hasDematerializedInverse: boolean = false;
}

export class Relationship {
  public definition: RelationshipDefinition;
  private propertyName: string;
  private store: Store;
  private isAsync: boolean;
  private kind: string;
  private _hasInverse: boolean | null = null;
  private _hasExplicitNullInverse: boolean;
  private _inverseDefinition: RelationshipDefinition | null = null;
  private _state: RelationshipState | null = null;
  private _membership: TrackedMembership<RecordIdentifier> | null = null;

  public meta: TMeta | null;
  public links: ILinks | IRelationshipLinks;
  public identifier: RecordIdentifier;
  public isCollection: boolean;

  constructor({
    definition,
    identifier,
    propertyName,
    store,
  }: {
    definition: RelationshipDefinition;
    identifier: RecordIdentifier;
    propertyName: string;
    store: InstanceType<typeof Store>;
  }) {
    this.definition = definition;
    this.propertyName = propertyName;
    this.store = store;
    this.isAsync = definition.isAsync;
    this.kind = definition.kind;
    this._hasExplicitNullInverse = definition.meta.inverse === null;
    this.identifier = identifier;
    this.isCollection = this.kind === 'hasMany';
  }

  public getState() {
    return this.state;
  }

  private get state() {
    if (this._state === null) {
      this._state = new RelationshipState();
    }

    return this._state;
  }

  private get membership() {
    if (this._membership === null) {
      this._membership = new TrackedMembership<RecordIdentifier>([]);
    }

    return this._membership;
  }

  private get isDirty(): boolean {
    let { additions, removals } = this.membership;
    return additions.length === 0 && removals.length == 0;
  }

  setHasReceivedData(v) {
    this.state.hasReceivedData = v;
  }

  setIsEmpty(v) {
    this.state.isEmpty = v;
  }

  setIsStale(v) {
    this.state.isStale = v;
  }

  setHasFailedLoadAttempt(v) {
    this.state.hasFailedLoadAttempt = v;
  }

  setShouldForceReload(v) {
    this.state.shouldForceReload = v;
  }

  setHasDematerializedInverse(v) {
    this.state.hasDematerializedInverse = v;
  }

  public get data(): RecordIdentifier[] | RecordIdentifier | null {
    let data = this.membership.data;

    return this.isCollection ? data : data.length > 0 ? data[0] : null;
  }

  private get inversePropertyName(): string | null {
    let def = this.inverseDefinition;

    return def !== null ? def.key : def;
  }

  public get inverseIsAsync(): boolean {
    let inverse = this.inverseDefinition;
    return inverse ? this.inverseDefinition.isAsync : false;
  }

  private get inverseDefinition(): RelationshipDefinition | null {
    if (this._hasInverse !== null || this._hasExplicitNullInverse === true) {
      return this._inverseDefinition;
    }

    // TODO we should bring back the nice inverse determination and setup that is in 3.4
    let { definition, identifier, store } = this;
    let modelClass = store.modelFor(identifier.type);
    let inverseDefinition = (this._inverseDefinition =
      definition.getInverseDefinition(store, modelClass) || null);

    this._inverseDefinition = inverseDefinition;
    this._hasInverse = inverseDefinition !== null;

    return this._inverseDefinition;
  }

  private get hasInverse() {
    return this.inverseDefinition !== null;
  }

  commitDeletion() {
    let { canonical, additions } = this.getChanges();

    canonical.forEach(i => this._pushRemoval(i));
    additions.forEach(i => this._remove(i));
  }

  push(relationshipPayload: TRelationshipIdentifier, initial: boolean = false) {
    let relationshipHasDataProperty = false;
    let hasRelatedLink = false;

    // users should normalize meta to `{}` if they want
    // to clear existing values
    // or merge existing meta with new meta in advance
    // if they want to combine old meta with new meta
    if (hasMeta(relationshipPayload)) {
      this.meta = relationshipPayload.meta;
    }

    // users should normalize links to `{}` if they want
    // to clear existing values
    // or merge existing links with new links in advance
    // if they want to combine old links with new links
    if (relationshipHasLinks(relationshipPayload)) {
      hasRelatedLink = relationshipHasRelatedLink(relationshipPayload.links);
      this.links = relationshipPayload.links;
    }

    if (typeof relationshipPayload.data !== 'undefined') {
      relationshipHasDataProperty = true;
      this.updateData(relationshipPayload.data, initial);

      // legacy support for sync relationships considering
      //   all data updates to be "complete knowledge"
    } else if (this.isAsync === false) {
      relationshipHasDataProperty = true;
      let data = this.kind === 'hasMany' ? [] : null;

      this.updateData(data, initial);
    }

    /*
     Data being pushed into the relationship might contain only data or links,
     or a combination of both.

     IF contains only data
     IF contains both links and data
      relationshipIsEmpty -> true if is empty array (has-many) or is null (belongs-to)
      hasAnyRelationshipData -> true
      relationshipIsStale -> false
      allInverseRecordsAreLoaded -> run-check-to-determine

     IF contains only links
      relationshipIsStale -> true
     */
    if (relationshipHasDataProperty === true) {
      let relationshipIsEmpty =
        relationshipPayload.data === null ||
        (Array.isArray(relationshipPayload.data) && relationshipPayload.data.length === 0);

      this.state.hasReceivedData = true;
      this.state.isEmpty = relationshipIsEmpty;
      this.state.isStale = false;
    } else if (hasRelatedLink == true) {
      this.state.isStale = true;
    }

    if (initial === false && (relationshipHasDataProperty === true || hasRelatedLink === true)) {
      // TODO ensure we've waited for the relationship layer to have settled
      // TODO hrm. This might be breaking the encapsulation boundary.
      this.store.notifyStateChange(this.identifier, this.propertyName);
    }
  }

  setState(identifiers: RecordIdentifier[] | RecordIdentifier) {
    if (!Array.isArray(identifiers)) {
      if (this.isCollection === true) {
        if (DEBUG) {
          throw new Error(
            'setState should be called with an array of identifiers for collection relationships'
          );
        }
        identifiers = identifiers ? [identifiers] : [];
      } else {
        this._add(identifiers);
        return;
      }
    }

    if (this.isCollection === false) {
      if (DEBUG) {
        throw new Error(
          'setState should only be called with a single identifier for non-collection relationships'
        );
      }
      identifiers = identifiers[0];
      this._add(identifiers);
      return;
    }

    let newIdentifiers = Object.create(null);
    let removedIdentifiers = Object.create(null);
    identifiers.forEach(i => (newIdentifiers[i.lid] = true));

    let { data } = this;

    if (!Array.isArray(data)) {
      throw new Error('Why are we trying to appease TS this way?');
    }

    data.forEach(i => {
      if (newIdentifiers[i.lid] === undefined) {
        removedIdentifiers[i.lid] = true;
        this._pushRemoval(i);
      }
    });
    identifiers.forEach(r => {
      if (removedIdentifiers[r.lid] === undefined) {
        this._pushAddition(r);
      }
    });
  }

  _pushAddition(identifer: RecordIdentifier, fromInverse = false) {
    this.membership.pushAddition(identifer);

    this.updateState('_pushAddition', identifer, fromInverse);
  }

  _pushRemoval(identifer: RecordIdentifier, fromInverse = false) {
    this.membership.pushRemoval(identifer);

    this.updateState('_pushRemoval', identifer, fromInverse);
  }

  _add(identifer: RecordIdentifier, fromInverse = false) {
    let current = this.data;

    if (this.isCollection === false) {
      if (Array.isArray(current)) {
        if (DEBUG) {
          throw new Error('Expected resource membership to be single entity or null');
        }
        current = current[0] || null;
      }

      if (current !== null) {
        this.membership.remove(current);
        this.updateState('_remove', current, fromInverse);
      }

      // allow _add(null) for single resource collections
      //  we've already removed 'current' if necessary, so no-op
      // TODO consider moving this into the membership class
      if (identifer === null) {
        return;
      }
    }
    this.membership.add(identifer);

    this.updateState('_add', identifer, fromInverse);
  }

  _remove(identifer: RecordIdentifier, fromInverse = false) {
    let current = this.data;

    if (this.isCollection === false) {
      if (Array.isArray(current)) {
        if (DEBUG) {
          throw new Error('Expected resource membership to be single entity or null');
        }
        current = current[0] || null;
      }

      if (DEBUG) {
        if (current === null || current !== identifer) {
          throw new Error(
            'Expected identifier to remove to be the same as the current resource membership'
          );
        }
      }
    }

    this.membership.remove(identifer);

    this.updateState('_remove', identifer, fromInverse);
  }

  getChanges() {
    return this.membership.getChanges();
  }

  private updateState(opp: string, inverseIdentifier: RecordIdentifier, fromInverse: boolean) {
    let { identifier, store, inversePropertyName, propertyName } = this;

    if (fromInverse === false) {
      if (this.hasInverse) {
        stateFor(store, inverseIdentifier, inversePropertyName)[opp](identifier, true);
      }
    }

    console.count(`notifyStateChange:${identifier.lid}.${propertyName}`);
    store.notifyStateChange(identifier, propertyName);
  }

  private updateData(data: RecordIdentifier | RecordIdentifier[] | null, initial: boolean) {
    let changes;

    if (!Array.isArray(data)) {
      data = data === null ? [] : [data];
    }

    changes = this.membership.pushState(data);

    if (Array.isArray(changes.removals)) {
      for (let i = 0; i < changes.removals.length; i++) {
        this.updateState('_pushRemoval', changes.removals[i], false);
      }
    }

    if (Array.isArray(changes.additions)) {
      for (let i = 0; i < changes.additions.length; i++) {
        this.updateState('_pushAddition', changes.additions[i], false);
      }
    }
  }
}
