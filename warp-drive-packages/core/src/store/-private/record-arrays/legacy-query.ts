import { assert } from '@warp-drive/core/build-config/macros';

import type { ImmutableRequestInfo } from '../../../types/request.ts';
import type { RecordArrayManager } from '../managers/record-array-manager.ts';
import {
  createIdentifierArray,
  destroy,
  type IdentifierArray,
  type IdentifierArrayCreateOptions,
} from './identifier-array.ts';

export type CollectionCreateOptions = IdentifierArrayCreateOptions & {
  manager: RecordArrayManager;
  query: ImmutableRequestInfo | Record<string, unknown> | null;
  isLoaded: boolean;
};

export interface Collection<T = unknown> extends IdentifierArray<T> {
  query: ImmutableRequestInfo | Record<string, unknown> | null;
  _manager: RecordArrayManager;
}

function _updateCollection(this: Collection): Promise<Collection> {
  const { store, query } = this;

  assert(`update cannot be used with this array`, this.modelName);
  assert(`update cannot be used with no query`, query);
  // @ts-expect-error typescript is unable to handle the complexity of
  //   T = unknown, modelName = string
  //   T extends TypedRecordInstance, modelName = TypeFromInstance<T>
  // both being valid options to pass through here.
  const promise = store.query<T>(this.modelName, query as Record<string, unknown>, { _recordArray: this });

  return promise;
}

function destroyCollection(this: Collection, clear: boolean): void {
  destroy.call(this, clear);
  this._manager._managed.delete(this);
  this._manager._pending.delete(this);
}

export function createLegacyQueryArray<T = unknown>(options: CollectionCreateOptions): Collection<T> {
  // @ts-expect-error
  options.EXT = {
    query: options.query || null,
    isLoaded: options.isLoaded || false,
    _update: _updateCollection,
    destroy: destroyCollection,
  };
  return createIdentifierArray(options) as Collection<T>;
}
