import type Store from '@ember-data/store';
import type { NotificationType } from '@ember-data/store';
import { storeFor } from '@ember-data/store';
import type { RequestCacheRequestState, RequestStateService } from '@ember-data/store/-private';
import { defineSignal, gate, memoized, recordIdentifierFor } from '@ember-data/store/-private';
import { notifySignal } from '@ember-data/tracking';
import { assert } from '@warp-drive/build-config/macros';
import type { StableRecordIdentifier } from '@warp-drive/core-types';
import type { Cache } from '@warp-drive/core-types/cache';

import type { Errors } from './errors';
import type { MinimalLegacyRecord } from './model-methods';

const SOURCE_POINTER_REGEXP = /^\/?data\/(attributes|relationships)\/(.*)/;
const SOURCE_POINTER_PRIMARY_REGEXP = /^\/?data/;
const PRIMARY_ATTRIBUTE_KEY = 'base';
function isInvalidError(error: unknown): error is Error & { isAdapterError: true; code: 'InvalidError' } {
  return (
    !!error &&
    error instanceof Error &&
    'isAdapterError' in error &&
    error.isAdapterError === true &&
    'code' in error &&
    error.code === 'InvalidError'
  );
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
  declare record: MinimalLegacyRecord;
  declare rs: RequestStateService;

  declare pendingCount: number;
  declare fulfilledCount: number;
  declare rejectedCount: number;
  declare cache: Cache;
  declare _errorRequests: RequestCacheRequestState[];
  declare _lastError: RequestCacheRequestState | null;
  declare handler: object;

  constructor(record: MinimalLegacyRecord) {
    const store = storeFor(record)!;
    const identity = recordIdentifierFor(record);

    this.identifier = identity;
    this.record = record;
    this.cache = store.cache;

    this.pendingCount = 0;
    this.fulfilledCount = 0;
    this.rejectedCount = 0;
    this._errorRequests = [];
    this._lastError = null;

    const requests = store.getRequestStateService();
    const notifications = store.notifications;

    const handleRequest = (req: RequestCacheRequestState) => {
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
            this.notify('isDirty');
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
    const lastRequest = requests.getLastRequestForRecord(identity);
    if (lastRequest) {
      handleRequest(lastRequest);
    }

    this.handler = notifications.subscribe(
      identity,
      (identifier: StableRecordIdentifier, type: NotificationType, key?: string) => {
        switch (type) {
          case 'state':
            this.notify('isSaved');
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

  notify(key: keyof this & string) {
    notifySignal(this, key);
  }

  updateInvalidErrors(errors: Errors) {
    assert(
      `Expected the Cache instance for ${this.identifier.lid}  to implement getErrors(identifier)`,
      typeof this.cache.getErrors === 'function'
    );
    const jsonApiErrors = this.cache.getErrors(this.identifier);

    errors.clear();

    for (let i = 0; i < jsonApiErrors.length; i++) {
      const error = jsonApiErrors[i];

      if (error.source && error.source.pointer) {
        const keyMatch = error.source.pointer.match(SOURCE_POINTER_REGEXP);
        let key: string | undefined;

        if (keyMatch) {
          key = keyMatch[2];
        } else if (error.source.pointer.search(SOURCE_POINTER_PRIMARY_REGEXP) !== -1) {
          key = PRIMARY_ATTRIBUTE_KEY;
        }

        if (key) {
          const errMsg = error.detail || error.title;
          assert(`Expected field error to have a detail or title to use as the message`, errMsg);
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

  declare isSaving: boolean;

  @gate
  get isLoading() {
    return !this.isLoaded && this.pendingCount > 0 && this.fulfilledCount === 0;
  }

  @gate
  get isLoaded() {
    if (this.isNew) {
      return true;
    }
    return this.fulfilledCount > 0 || !this.isEmpty;
  }

  @gate
  get isSaved() {
    const rd = this.cache;
    if (this.isDeleted) {
      assert(`Expected Cache to implement isDeletionCommitted()`, typeof rd.isDeletionCommitted === 'function');
      return rd.isDeletionCommitted(this.identifier);
    }
    if (this.isNew || this.isEmpty || !this.isValid || this.isDirty || this.isLoading) {
      return false;
    }
    return true;
  }

  @gate
  get isEmpty() {
    const rd = this.cache;
    // TODO this is not actually an RFC'd concept. Determine the
    // correct heuristic to replace this with.
    assert(`Expected Cache to implement isEmpty()`, typeof rd.isEmpty === 'function');
    return !this.isNew && rd.isEmpty(this.identifier);
  }

  @gate
  get isNew() {
    const rd = this.cache;
    assert(`Expected Cache to implement isNew()`, typeof rd.isNew === 'function');
    return rd.isNew(this.identifier);
  }

  @gate
  get isDeleted() {
    const rd = this.cache;
    assert(`Expected Cache to implement isDeleted()`, typeof rd.isDeleted === 'function');
    return rd.isDeleted(this.identifier);
  }

  @gate
  get isValid() {
    return this.record.errors.length === 0;
  }

  @gate
  get isDirty() {
    const rd = this.cache;
    if (this.isEmpty || rd.isDeletionCommitted(this.identifier) || (this.isDeleted && this.isNew)) {
      return false;
    }
    return this.isDeleted || this.isNew || rd.hasChangedAttrs(this.identifier);
  }

  @gate
  get isError() {
    const errorReq = this._errorRequests[this._errorRequests.length - 1];
    if (!errorReq) {
      return false;
    } else {
      return true;
    }
  }

  @gate
  get adapterError() {
    const request = this._lastError;
    if (!request) {
      return null;
    }
    return request.state === 'rejected' && request.response!.data;
  }

  @memoized
  get isPreloaded() {
    return !this.isEmpty && this.isLoading;
  }

  @memoized
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

  @memoized
  get dirtyType() {
    // we might be empty while loading so check this first
    if (this.isLoading || this.isEmpty) {
      return '';

      // deleted substates
    } else if (this.isDirty && this.isDeleted) {
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
defineSignal(RecordState.prototype, 'isSaving', false);

function notifyErrorsStateChanged(state: RecordState) {
  state.notify('isValid');
  state.notify('isError');
  state.notify('adapterError');
}
