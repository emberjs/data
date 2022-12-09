import { assert } from '@ember/debug';
import { dependentKeyCompat } from '@ember/object/compat';
import { DEBUG } from '@glimmer/env';
import { cached, tracked } from '@glimmer/tracking';

import type Store from '@ember-data/store';
import { storeFor } from '@ember-data/store';
import { recordIdentifierFor } from '@ember-data/store/-private';
import type { NotificationType } from '@ember-data/store/-private/managers/record-notification-manager';
import type RequestCache from '@ember-data/store/-private/network/request-cache';
import { addToTransaction, subscribe } from '@ember-data/tracking/-private';
import type { Cache } from '@ember-data/types/q/cache';
import type { StableRecordIdentifier } from '@ember-data/types/q/identifier';

type Model = InstanceType<typeof import('./model')>;

const SOURCE_POINTER_REGEXP = /^\/?data\/(attributes|relationships)\/(.*)/;
const SOURCE_POINTER_PRIMARY_REGEXP = /^\/?data/;
const PRIMARY_ATTRIBUTE_KEY = 'base';
function isInvalidError(error) {
  return error && error.isAdapterError === true && error.code === 'InvalidError';
}

/**
 * Tag provides a cache for a getter
 * that recomputes only when a specific
 * tracked property that it manages is dirtied.
 *
 * This allows us to bust the cache for a value
 * that otherwise doesn't access anything tracked
 * as well as control the timing of that notification.
 *
 * @internal
 */
class Tag {
  declare rev: number;
  declare isDirty: boolean;
  declare value: any;
  declare t: boolean;

  constructor() {
    this.rev = 1;
    this.isDirty = true;
    this.value = undefined;
    this.t = false;
  }
  @tracked ref = null;

  notify() {
    this.isDirty = true;
    addToTransaction(this);
    this.rev++;
  }
  consume(v) {
    this.isDirty = false;
    this.value = v; // set cached value
  }
}

const Tags = new WeakMap();
function getTag(record, key) {
  let tags = Tags.get(record);
  if (!tags) {
    tags = Object.create(null);
    Tags.set(record, tags);
  }
  return (tags[key] = tags[key] || new Tag());
}

export function peekTag(record, key) {
  let tags = Tags.get(record);
  return tags && tags[key];
}

/**
 * A decorattor that caches a getter while
 * providing the ability to bust that cache
 * when we so choose in a way that notifies
 * glimmer's tracking system.
 *
 * @internal
 */
export function tagged(_target, key, desc) {
  const getter = desc.get;
  const setter = desc.set;
  desc.get = function () {
    let tag = getTag(this, key);
    subscribe(tag);

    if (tag.isDirty) {
      tag.consume(getter.call(this));
    }

    return tag.value;
  };
  desc.set = function (v) {
    getTag(this, key); // ensure tag is setup in case we want to use it.
    // probably notify here but not yet.
    setter.call(this, v);
  };
  dependentKeyCompat(desc);
  return desc;
}

/**
Historically EmberData managed a state machine
for each record, the localState for which
was reflected onto Model.

This implements the flags and stateName for backwards compat
with the state tree that used to be possible (listed below).

stateName and dirtyType are candidates for deprecation.

root
  empty
    deleted    // hidden from stateName
    preloaded  // hidden from stateName

  loading
     empty     // hidden from stateName
     preloaded // hidden from stateName

  loaded
    saved
    updated
      uncommitted
      invalid
      inFlight
    created
      uncommitted
      invalid
      inFlight

  deleted
    saved
      new      // hidden from stateName
    uncommitted
    invalid
    inFlight

  @internal
*/
export default class RecordState {
  declare store: Store;
  declare identifier: StableRecordIdentifier;
  declare record: Model;
  declare rs: RequestCache;

  declare pendingCount: number;
  declare fulfilledCount: number;
  declare rejectedCount: number;
  declare cache: Cache;
  declare _errorRequests: any[];
  declare _lastError: any;
  declare handler: object;

  constructor(record: Model) {
    const store = storeFor(record)!;
    const identity = recordIdentifierFor(record);

    this.identifier = identity;
    this.record = record;
    this.cache = store._instanceCache.getRecordData(identity);

    this.pendingCount = 0;
    this.fulfilledCount = 0;
    this.rejectedCount = 0;
    this._errorRequests = [];
    this._lastError = null;

    let requests = store.getRequestStateService();
    let notifications = store.notifications;

    const handleRequest = (req) => {
      if (req.type === 'mutation') {
        switch (req.state) {
          case 'pending':
            this.isSaving = true;
            break;
          case 'rejected':
            this.isSaving = false;
            this._lastError = req;
            if (!(req.response && isInvalidError(req.response.data))) {
              this._errorRequests.push(req);
            }

            notifyErrorsStateChanged(this);
            break;
          case 'fulfilled':
            this._errorRequests = [];
            this._lastError = null;
            this.isSaving = false;
            notifyErrorsStateChanged(this);
            break;
        }
      } else {
        switch (req.state) {
          case 'pending':
            this.pendingCount++;
            this.notify('isLoading');
            break;
          case 'rejected':
            this.pendingCount--;
            this._lastError = req;
            if (!(req.response && isInvalidError(req.response.data))) {
              this._errorRequests.push(req);
            }
            this.notify('isLoading');
            notifyErrorsStateChanged(this);
            break;
          case 'fulfilled':
            this.pendingCount--;
            this.fulfilledCount++;
            this.notify('isLoading');
            this.notify('isDirty');
            notifyErrorsStateChanged(this);
            this._errorRequests = [];
            this._lastError = null;
            break;
        }
      }
    };

    requests.subscribeForRecord(identity, handleRequest);

    // we instantiate lazily
    // so we grab anything we don't have yet
    if (!DEBUG) {
      const lastRequest = requests.getLastRequestForRecord(identity);
      if (lastRequest) {
        handleRequest(lastRequest);
      }
    }

    this.handler = notifications.subscribe(
      identity,
      (identifier: StableRecordIdentifier, type: NotificationType, key?: string) => {
        switch (type) {
          case 'state':
            this.notify('isNew');
            this.notify('isDeleted');
            this.notify('isDirty');
            break;
          case 'attributes':
            this.notify('isEmpty');
            this.notify('isDirty');
            break;
          case 'errors':
            this.updateInvalidErrors(this.record.errors);
            this.notify('isValid');
            break;
        }
      }
    );
  }

  destroy() {
    storeFor(this.record)!.notifications.unsubscribe(this.handler);
  }

  notify(key) {
    getTag(this, key).notify();
  }

  updateInvalidErrors(errors) {
    assert(
      `Expected the Cache instance for ${this.identifier}  to implement getErrors(identifier)`,
      typeof this.cache.getErrors === 'function'
    );
    let jsonApiErrors = this.cache.getErrors(this.identifier);

    errors.clear();

    for (let i = 0; i < jsonApiErrors.length; i++) {
      let error = jsonApiErrors[i];

      if (error.source && error.source.pointer) {
        let keyMatch = error.source.pointer.match(SOURCE_POINTER_REGEXP);
        let key: string | undefined;

        if (keyMatch) {
          key = keyMatch[2];
        } else if (error.source.pointer.search(SOURCE_POINTER_PRIMARY_REGEXP) !== -1) {
          key = PRIMARY_ATTRIBUTE_KEY;
        }

        if (key) {
          let errMsg = error.detail || error.title;
          errors.add(key, errMsg);
        }
      }
    }
  }

  cleanErrorRequests() {
    this.notify('isValid');
    this.notify('isError');
    this.notify('adapterError');
    this._errorRequests = [];
    this._lastError = null;
  }

  @tracked isSaving = false;

  @tagged
  get isLoading() {
    return !this.isLoaded && this.pendingCount > 0 && this.fulfilledCount === 0;
  }

  @tagged
  get isLoaded() {
    if (this.isNew) {
      return true;
    }
    return this.fulfilledCount > 0 || !this.isEmpty;
  }

  @tagged
  get isSaved() {
    let rd = this.cache;
    if (this.isDeleted) {
      assert(`Expected Cache to implement isDeletionCommitted()`, rd.isDeletionCommitted);
      return rd.isDeletionCommitted(this.identifier);
    }
    if (this.isNew || this.isEmpty || !this.isValid || this.isDirty || this.isLoading) {
      return false;
    }
    return true;
  }

  @tagged
  get isEmpty() {
    let rd = this.cache;
    // TODO this is not actually an RFC'd concept. Determine the
    // correct heuristic to replace this with.
    assert(`Expected Cache to implement isEmpty()`, rd.isEmpty);
    return !this.isNew && rd.isEmpty(this.identifier);
  }

  @tagged
  get isNew() {
    let rd = this.cache;
    assert(`Expected Cache to implement isNew()`, rd.isNew);
    return rd.isNew(this.identifier);
  }

  @tagged
  get isDeleted() {
    let rd = this.cache;
    assert(`Expected Cache to implement isDeleted()`, rd.isDeleted);
    return rd.isDeleted(this.identifier);
  }

  @tagged
  get isValid() {
    return this.record.errors.length === 0;
  }

  @tagged
  get isDirty() {
    let rd = this.cache;
    if (rd.isDeletionCommitted(this.identifier) || (this.isDeleted && this.isNew)) {
      return false;
    }
    return this.isNew || rd.hasChangedAttrs(this.identifier);
  }

  @tagged
  get isError() {
    let errorReq = this._errorRequests[this._errorRequests.length - 1];
    if (!errorReq) {
      return false;
    } else {
      return true;
    }
  }

  @tagged
  get adapterError() {
    let request = this._lastError;
    if (!request) {
      return null;
    }
    return request.state === 'rejected' && request.response.data;
  }

  @cached
  get isPreloaded() {
    return !this.isEmpty && this.isLoading;
  }

  @cached
  get stateName() {
    // we might be empty while loading so check this first
    if (this.isLoading) {
      return 'root.loading';

      // got nothing yet or were unloaded
    } else if (this.isEmpty) {
      return 'root.empty';

      // deleted substates
    } else if (this.isDeleted) {
      if (this.isSaving) {
        return 'root.deleted.inFlight';
      } else if (this.isSaved) {
        // TODO ensure isSaved isn't true from previous requests
        return 'root.deleted.saved';
      } else if (!this.isValid) {
        return 'root.deleted.invalid';
      } else {
        return 'root.deleted.uncommitted';
      }

      // loaded.created substates
    } else if (this.isNew) {
      if (this.isSaving) {
        return 'root.loaded.created.inFlight';
      } else if (!this.isValid) {
        return 'root.loaded.created.invalid';
      }
      return 'root.loaded.created.uncommitted';

      // loaded.updated substates
    } else if (this.isSaving) {
      return 'root.loaded.updated.inFlight';
    } else if (!this.isValid) {
      return 'root.loaded.updated.invalid';
    } else if (this.isDirty) {
      return 'root.loaded.updated.uncommitted';

      // if nothing remains, we are loaded saved!
    } else {
      return 'root.loaded.saved';
    }
  }

  @cached
  get dirtyType() {
    // we might be empty while loading so check this first
    if (this.isLoading || this.isEmpty) {
      return '';

      // deleted substates
    } else if (this.isDeleted) {
      return 'deleted';

      // loaded.created substates
    } else if (this.isNew) {
      return 'created';

      // loaded.updated substates
    } else if (this.isSaving || !this.isValid || this.isDirty) {
      return 'updated';

      // if nothing remains, we are loaded saved!
    } else {
      return '';
    }
  }
}

function notifyErrorsStateChanged(state: RecordState) {
  state.notify('isValid');
  state.notify('isError');
  state.notify('adapterError');
}
