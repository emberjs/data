import { getOwner } from '@ember/application';

import { recordIdentifierFor, type Store } from '@warp-drive/core';
import { assert } from '@warp-drive/core/build-config/macros';
import { _deprecatingNormalize } from '@warp-drive/core/store/-private';
import type { ObjectValue } from '@warp-drive/core/types/json/raw';
import type { SingleResourceDocument } from '@warp-drive/core/types/spec/json-api-raw';

import { FetchManager, upgradeStore } from './compat/-private.ts';
import type {
  AdapterPayload,
  MinimumAdapterInterface,
} from './compat/legacy-network-handler/minimum-adapter-interface.ts';
import type {
  MinimumSerializerInterface,
  SerializerOptions,
} from './compat/legacy-network-handler/minimum-serializer-interface.ts';

export { LegacyNetworkHandler } from './compat/legacy-network-handler/legacy-network-handler.ts';

export type { MinimumAdapterInterface, MinimumSerializerInterface, SerializerOptions, AdapterPayload };

export interface LegacyStoreCompat extends Store {
  _fetchManager: FetchManager;
  adapterFor(this: Store, modelName: string): MinimumAdapterInterface;
  adapterFor(this: Store, modelName: string, _allowMissing: true): MinimumAdapterInterface | undefined;

  serializerFor<K extends string>(modelName: K, _allowMissing?: boolean): MinimumSerializerInterface | null;

  normalize(modelName: string, payload: ObjectValue): ObjectValue;
  pushPayload(modelName: string, payload: ObjectValue): void;
  serializeRecord(record: unknown, options?: SerializerOptions): unknown;

  _adapterCache: Record<string, MinimumAdapterInterface & { store: Store }>;
  _serializerCache: Record<string, MinimumSerializerInterface & { store: Store }>;
}

export type CompatStore = LegacyStoreCompat;

/**
  Returns an instance of the adapter for a given type. For
  example, `adapterFor('person')` will return an instance of
  the adapter located at `app/adapters/person.js`

  If no `person` adapter is found, this method will look
  for an `application` adapter (the default adapter for
  your entire application).

  @public
  @param modelName
*/
export function adapterFor(this: Store, modelName: string): MinimumAdapterInterface;
export function adapterFor(this: Store, modelName: string, _allowMissing: true): MinimumAdapterInterface | undefined;
export function adapterFor(this: Store, modelName: string, _allowMissing?: true): MinimumAdapterInterface | undefined {
  assert(
    `Attempted to call store.adapterFor(), but the store instance has already been destroyed.`,
    !(this.isDestroying || this.isDestroyed)
  );
  assert(`You need to pass a model name to the store's adapterFor method`, modelName);
  assert(
    `Passing classes to store.adapterFor has been removed. Please pass a dasherized string instead of ${modelName}`,
    typeof modelName === 'string'
  );
  upgradeStore(this);
  this._adapterCache =
    this._adapterCache || (Object.create(null) as Record<string, MinimumAdapterInterface & { store: Store }>);

  const normalizedModelName = _deprecatingNormalize(modelName);

  const { _adapterCache } = this;
  let adapter: (MinimumAdapterInterface & { store: Store }) | undefined = _adapterCache[normalizedModelName];
  if (adapter) {
    return adapter;
  }

  const owner = getOwner(this)!;

  // name specific adapter
  adapter = owner.lookup(`adapter:${normalizedModelName}`) as (MinimumAdapterInterface & { store: Store }) | undefined;
  if (adapter !== undefined) {
    _adapterCache[normalizedModelName] = adapter;
    return adapter;
  }

  // no adapter found for the specific name, fallback and check for application adapter
  adapter = _adapterCache.application || owner.lookup('adapter:application');
  if (adapter !== undefined) {
    _adapterCache[normalizedModelName] = adapter;
    _adapterCache.application = adapter;
    return adapter;
  }

  assert(
    `No adapter was found for '${modelName}' and no 'application' adapter was found as a fallback.`,
    _allowMissing
  );
}

/**
  Returns an instance of the serializer for a given type. For
  example, `serializerFor('person')` will return an instance of
  `App.PersonSerializer`.

  If no `App.PersonSerializer` is found, this method will look
  for an `App.ApplicationSerializer` (the default serializer for
  your entire application).

  If a serializer cannot be found on the adapter, it will fall back
  to an instance of `JSONSerializer`.

  @public
  @param modelName the record to serialize
  */
export function serializerFor(this: Store, modelName: string): MinimumSerializerInterface | null {
  assert(
    `Attempted to call store.serializerFor(), but the store instance has already been destroyed.`,
    !(this.isDestroying || this.isDestroyed)
  );
  assert(`You need to pass a model name to the store's serializerFor method`, modelName);
  assert(
    `Passing classes to store.serializerFor has been removed. Please pass a dasherized string instead of ${modelName}`,
    typeof modelName === 'string'
  );
  upgradeStore(this);
  this._serializerCache =
    this._serializerCache || (Object.create(null) as Record<string, MinimumSerializerInterface & { store: Store }>);
  const normalizedModelName = _deprecatingNormalize(modelName);

  const { _serializerCache } = this;
  let serializer: (MinimumSerializerInterface & { store: Store }) | undefined = _serializerCache[normalizedModelName];
  if (serializer) {
    return serializer;
  }

  // by name
  const owner = getOwner(this)!;
  serializer = owner.lookup(`serializer:${normalizedModelName}`) as
    | (MinimumSerializerInterface & { store: Store })
    | undefined;
  if (serializer !== undefined) {
    _serializerCache[normalizedModelName] = serializer;
    return serializer;
  }

  // no serializer found for the specific model, fallback and check for application serializer
  serializer = _serializerCache.application || owner.lookup('serializer:application');
  if (serializer !== undefined) {
    _serializerCache[normalizedModelName] = serializer;
    _serializerCache.application = serializer;
    return serializer;
  }

  return null;
}

/**
  `normalize` converts a json payload into the normalized form that
  [push](../methods/push?anchor=push) expects.

  Example

  ```js
  socket.on('message', function(message) {
    let modelName = message.model;
    let data = message.data;
    store.push(store.normalize(modelName, data));
  });
  ```

  @public
  @param modelName The name of the model type for this payload
  @return The normalized payload
*/
// TODO @runspired @deprecate users should call normalize on the associated serializer directly
export function normalize(this: Store, modelName: string, payload: ObjectValue): SingleResourceDocument {
  upgradeStore(this);
  assert(
    `Attempted to call store.normalize(), but the store instance has already been destroyed.`,
    !(this.isDestroying || this.isDestroyed)
  );
  assert(`You need to pass a model name to the store's normalize method`, modelName);
  assert(
    `Passing classes to store methods has been removed. Please pass a dasherized string instead of ${typeof modelName}`,
    typeof modelName === 'string'
  );
  const normalizedModelName = _deprecatingNormalize(modelName);
  const serializer = this.serializerFor(normalizedModelName);
  const schema = this.modelFor(normalizedModelName);
  assert(
    `You must define a normalize method in your serializer in order to call store.normalize`,
    typeof serializer?.normalize === 'function'
  );
  return serializer.normalize(schema, payload);
}

/**
    Push some raw data into the store.

    This method can be used both to push in brand new
    records, as well as to update existing records. You
    can push in more than one type of object at once.
    All objects should be in the format expected by the
    serializer.

    ```js [app/serializers/application.js]
    import RESTSerializer from '@ember-data/serializer/rest';

    export default class ApplicationSerializer extends RESTSerializer;
    ```

    ```js
    let pushData = {
      posts: [
        { id: 1, postTitle: "Great post", commentIds: [2] }
      ],
      comments: [
        { id: 2, commentBody: "Insightful comment" }
      ]
    }

    store.pushPayload(pushData);
    ```

    By default, the data will be deserialized using a default
    serializer (the application serializer if it exists).

    Alternatively, `pushPayload` will accept a model type which
    will determine which serializer will process the payload.

    ```js [app/serializers/application.js]
    import RESTSerializer from '@ember-data/serializer/rest';

     export default class ApplicationSerializer extends RESTSerializer;
    ```

    ```js [app/serializers/post.js]
    import JSONSerializer from '@ember-data/serializer/json';

    export default JSONSerializer;
    ```

    ```js
    store.pushPayload(pushData); // Will use the application serializer
    store.pushPayload('post', pushData); // Will use the post serializer
    ```

    @public
    @param modelName Optionally, a model type used to determine which serializer will be used
    @param inputPayload
  */
// TODO @runspired @deprecate pushPayload in favor of looking up the serializer
export function pushPayload(this: Store, modelName: string, inputPayload: ObjectValue): void {
  upgradeStore(this);
  assert(
    `Attempted to call store.pushPayload(), but the store instance has already been destroyed.`,
    !(this.isDestroying || this.isDestroyed)
  );

  const payload: ObjectValue = inputPayload || (modelName as unknown as ObjectValue);
  const normalizedModelName = inputPayload ? _deprecatingNormalize(modelName) : 'application';
  const serializer = this.serializerFor(normalizedModelName);

  assert(
    `You cannot use 'store.pushPayload(<type>, <payload>)' unless the serializer for '${normalizedModelName}' defines 'pushPayload'`,
    serializer && typeof serializer.pushPayload === 'function'
  );
  serializer.pushPayload(this, payload);
}

// TODO @runspired @deprecate records should implement their own serialization if desired
export function serializeRecord(this: Store, record: unknown, options?: SerializerOptions): unknown {
  upgradeStore(this);
  // TODO we used to check if the record was destroyed here
  if (!this._fetchManager) {
    this._fetchManager = new FetchManager(this);
  }

  return this._fetchManager.createSnapshot(recordIdentifierFor(record)).serialize(options);
}

export function cleanup(this: Store): void {
  upgradeStore(this);
  // enqueue destruction of any adapters/serializers we have created
  for (const adapterName in this._adapterCache) {
    const adapter = this._adapterCache[adapterName];
    if (typeof adapter.destroy === 'function') {
      adapter.destroy();
    }
  }

  for (const serializerName in this._serializerCache) {
    const serializer = this._serializerCache[serializerName];
    if (typeof serializer.destroy === 'function') {
      serializer.destroy();
    }
  }
}
