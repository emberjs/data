import { addObserver, removeObserver } from '@ember/object/observers';
import type Owner from '@ember/owner';
import { getOwner, setOwner } from '@ember/owner';
import * as s from '@ember/service';
import { createCache, getValue } from '@glimmer/tracking/primitives/cache';

import { getGlobalConfig, macroCondition } from '@embroider/macros';

import type { Store } from '@warp-drive/core';
import { recordIdentifierFor } from '@warp-drive/core';
import { assert } from '@warp-drive/core/build-config/macros';
import { assertPrivateStore } from '@warp-drive/core/store/-private';
import type { ModelSchema } from '@warp-drive/core/types';
import { capitalize, underscore } from '@warp-drive/utilities/string';

// oxlint-disable-next-line typescript/no-empty-object-type
interface Model extends ModelSchema {}
declare class Model {
  id: string | null;
  isNew: boolean;
  hasDirtyAttributes: boolean;
  store: Store;
}

const service = s.service ?? s.inject;
const StoreTypesMap = new WeakMap<Store, Map<string, boolean>>();

type RecordColor = 'black' | 'red' | 'blue' | 'green';
type Column = {
  name: string;
  desc: string;
};
type WrappedType<N extends string = string> = {
  name: N;
  count: number;
  columns: Column[];
  object: unknown;
};
type WrappedRecord<T> = {
  object: T;
  columnValues: object;
  searchKeywords: unknown[];
  filterValues: object;
  color: RecordColor | null;
};
type WrappedTypeCallback = (types: WrappedType[]) => void;

function debugInfo<T extends Model>(this: T) {
  const relationships: { belongsTo?: []; hasMany?: [] } = {};
  const expensiveProperties: string[] = [];

  const identifier = recordIdentifierFor(this);
  const fields = this.store.schema.fields(identifier);

  const attrGroup = {
    name: 'Attributes',
    properties: ['id'],
    expand: true,
  };
  const attributes = attrGroup.properties;
  const groups = [attrGroup];

  for (const field of fields.values()) {
    switch (field.kind) {
      case 'attribute':
        attributes.push(field.name);
        break;
      case 'belongsTo':
      case 'hasMany': {
        let properties: string[] | undefined = relationships[field.kind];

        if (properties === undefined) {
          properties = relationships[field.kind] = [];
          groups.push({
            name: field.kind,
            properties,
            expand: true,
          });
        }
        properties.push(field.name);
        expensiveProperties.push(field.name);
        break;
      }
    }
  }

  groups.push({
    name: 'Flags',
    properties: ['isLoaded', 'hasDirtyAttributes', 'isSaving', 'isDeleted', 'isError', 'isNew', 'isValid'],
    expand: false,
  });

  return {
    propertyInfo: {
      // include all other mixins / properties (not just the grouped ones)
      includeOtherProperties: true,
      groups: groups,
      // don't pre-calculate unless cached
      expensiveProperties: expensiveProperties,
    },
  };
}

function installDebugInfo(ModelKlass: typeof Model) {
  /**
   Provides info about the model for debugging purposes
   by grouping the properties into more semantic groups.

   Meant to be used by debugging tools such as the Chrome Ember Extension.

   - Groups all attributes in "Attributes" group.
   - Groups all belongsTo relationships in "Belongs To" group.
   - Groups all hasMany relationships in "Has Many" group.
   - Groups all flags in "Flags" group.
   - Flags relationship CPs as expensive properties.
   */
  (ModelKlass.prototype as unknown as { _debugInfo: typeof debugInfo })._debugInfo = debugInfo;
}

type Cache<T> = ReturnType<typeof createCache<T>>;
type RecordCallback = (records: WrappedRecord<Model>[]) => void;

/**
  Calls `fn` once for each record, then lets the inspector know which
  records were added, updated, and removed since the last call.

  A record is "updated" when something `wrapRecord` read for it changed.
  This uses autotracking through the public cache primitives, so the
  inspector sees the same values the app renders.

  @private
*/
class RecordsWatcher {
  declare records: Model[];
  declare wrapRecord: (record: Model) => WrappedRecord<Model>;
  declare recordsAdded: RecordCallback;
  declare recordsUpdated: RecordCallback;
  declare recordsRemoved: RecordCallback;
  declare release: () => void;

  declare watchRecord: (record: Model) => () => void;

  recordCaches: Map<Model, Cache<void>> = new Map();
  unwatchRecord: Map<Model, () => void> = new Map();
  added: WrappedRecord<Model>[] = [];
  updated: WrappedRecord<Model>[] = [];
  declare recordArrayCache: Cache<Set<Model>>;

  constructor(
    records: Model[],
    recordsAdded: RecordCallback,
    recordsUpdated: RecordCallback,
    recordsRemoved: RecordCallback,
    wrapRecord: (record: Model) => WrappedRecord<Model>,
    watchRecord: (record: Model) => () => void,
    release: () => void
  ) {
    this.records = records;
    this.watchRecord = watchRecord;
    this.recordsAdded = recordsAdded;
    this.recordsUpdated = recordsUpdated;
    this.recordsRemoved = recordsRemoved;
    this.wrapRecord = wrapRecord;
    this.release = () => {
      this.unwatchRecord.forEach((unwatch) => unwatch());
      this.unwatchRecord.clear();
      release();
    };

    this.recordArrayCache = createCache(() => {
      const seen = new Set<Model>();
      for (const record of this.records) {
        getValue(this.getCacheForItem(record));
        seen.add(record);
      }
      return seen;
    });
  }

  getCacheForItem(record: Model): Cache<void> {
    let recordCache = this.recordCaches.get(record);

    if (!recordCache) {
      let hasBeenAdded = false;

      recordCache = createCache(() => {
        if (!hasBeenAdded) {
          this.added.push(this.wrapRecord(record));
          hasBeenAdded = true;
        } else {
          this.updated.push(this.wrapRecord(record));
        }
      });

      this.recordCaches.set(record, recordCache);
      this.unwatchRecord.set(record, this.watchRecord(record));
    }

    return recordCache;
  }

  revalidate(): void {
    const seen = getValue(this.recordArrayCache)!;

    // Find removed records outside of the cache, so that reading the wrapped
    // values of removed records is not tracked.
    const removed: WrappedRecord<Model>[] = [];
    this.recordCaches.forEach((_cache, record) => {
      if (!seen.has(record)) {
        removed.push(this.wrapRecord(record));
        this.recordCaches.delete(record);
        this.unwatchRecord.get(record)?.();
        this.unwatchRecord.delete(record);
      }
    });

    if (this.added.length > 0) {
      const added = this.added;
      this.added = [];
      this.recordsAdded(added);
    }

    if (this.updated.length > 0) {
      const updated = this.updated;
      this.updated = [];
      this.recordsUpdated(updated);
    }

    if (removed.length > 0) {
      this.recordsRemoved(removed);
    }
  }
}

/**
  Calls `onChange` when the records of a type change, after the first check.

  @private
*/
class TypeWatcher {
  declare cache: Cache<void>;
  declare release: () => void;

  constructor(records: Model[], onChange: () => void, release: () => void) {
    let hasBeenAccessed = false;
    this.release = release;

    this.cache = createCache(() => {
      // Iterate only to track changes to the records array
      Array.from(records);

      if (hasBeenAccessed) {
        onChange();
      } else {
        hasBeenAccessed = true;
      }
    });
  }

  revalidate(): void {
    getValue(this.cache);
  }
}

function typesMapFor(store: Store): Map<string, boolean> {
  let typesMap = StoreTypesMap.get(store);

  if (typesMap === undefined) {
    typesMap = new Map();
    StoreTypesMap.set(store, typesMap);
  }

  return typesMap;
}

/**
  The data adapter for the ember-inspector's Data tab.

  The inspector looks it up as `data-adapter:main` and uses only
  `attributeLimit`, `acceptsModelName`, `getFilters`, `watchModelTypes`
  and `watchRecords`. This class gives that contract itself instead of
  extending `@ember/debug/data-adapter`. The Ember class watches records
  with private Ember APIs and a backburner hook. Here, changes come from
  the store's notifications, and change detection uses the public cache
  primitives.

  @private
*/
class InspectorDataAdapter {
  @service('store') declare store: Store;

  /**
    The number of attributes to send as columns.
    The inspector sets this to 100.

    @private
  */
  attributeLimit = 3;

  /**
    Tells the inspector to call `watchRecords` with a model name.

    @private
  */
  acceptsModelName = true;

  /**
    Methods to call on destruction to remove all watchers.

    @private
  */
  releaseMethods: Array<() => void> = [];

  recordsWatchers: Map<Model[], RecordsWatcher> = new Map();
  typeWatchers: Map<Model[], TypeWatcher> = new Map();
  isDestroyed = false;

  #unsubscribe: (() => void) | null = null;
  #isFlushScheduled = false;

  static create<T extends InspectorDataAdapter>(this: new (owner: Owner) => T, props: object): T {
    return new this(getOwner(props)!);
  }

  constructor(owner: Owner) {
    setOwner(this, owner);
  }

  /**
    Specifies how records can be filtered based on the state of the record
    Records returned will need to have a `filterValues`
    property with a key for every name in the returned array

    @private
    @return List of objects defining filters
     The object should have a `name` and `desc` property
  */
  getFilters(): Array<{ name: string; desc: string }> {
    return [
      { name: 'isNew', desc: 'New' },
      { name: 'isModified', desc: 'Modified' },
      { name: 'isClean', desc: 'Clean' },
    ];
  }

  _nameToClass(type: string): ModelSchema {
    return this.store.modelFor(type);
  }

  /**
    Fetch the model types and observe them for changes.
    Maintains the list of model types without needing the Model package for detection.

    @private
    @param typesAdded Callback to call to add types.
    Takes an array of objects containing wrapped types (returned from `wrapModelType`).
    @param typesUpdated Callback to call when a type has changed.
    Takes an array of objects containing wrapped types.
    @return Method to call to remove all observers
  */
  watchModelTypes(typesAdded: WrappedTypeCallback, typesUpdated: WrappedTypeCallback): () => void {
    const { store } = this;

    const discoveredTypes = typesMapFor(store);
    const unsub = store.notifications.subscribe('resource', (identifier, notificationType) => {
      if (notificationType === 'added') {
        this.watchTypeIfUnseen(store, discoveredTypes, identifier.type, typesAdded, typesUpdated, _releaseMethods);
      }
    });

    const _releaseMethods = [
      () => {
        store.notifications.unsubscribe(unsub);
      },
    ];

    assertPrivateStore(store);
    Object.keys(store.cacheKeyManager._cache.resourcesByType).forEach((type) => {
      discoveredTypes.set(type, false);
    });

    // Add any models that were added during initialization of the app, before the inspector was opened
    discoveredTypes.forEach((_, type) => {
      this.watchTypeIfUnseen(store, discoveredTypes, type, typesAdded, typesUpdated, _releaseMethods);
    });

    const release = () => {
      _releaseMethods.forEach((fn) => fn());
      // reset the list so the models can be added if the inspector is re-opened
      // the entries are set to false instead of removed, since the models still exist in the app
      // we just need the inspector to become aware of them
      discoveredTypes.forEach((value, key) => {
        discoveredTypes.set(key, false);
      });
      const index = this.releaseMethods.indexOf(release);
      if (index !== -1) {
        this.releaseMethods.splice(index, 1);
      }
    };
    this.releaseMethods.push(release);
    return release;
  }

  /**
   * Loop over the discovered types and use the callbacks from watchModelTypes to notify
   * the consumer of this adapter about the mdoels.
   *
   * @private
   */
  watchTypeIfUnseen(
    store: Store,
    discoveredTypes: Map<string, boolean>,
    type: string,
    typesAdded: WrappedTypeCallback,
    typesUpdated: WrappedTypeCallback,
    releaseMethods: Array<() => void>
  ): void {
    if (discoveredTypes.get(type) !== true) {
      const klass = store.modelFor(type);
      installDebugInfo(klass as unknown as typeof Model);
      const wrapped = this.wrapModelType(klass, type);
      releaseMethods.push(this.observeModelType(type, typesUpdated));
      typesAdded([wrapped]);
      discoveredTypes.set(type, true);
    }
  }

  /**
    Fetch the records of a given type and observe them for changes.

    @private
    @return Method to call to remove the watcher
  */
  watchRecords(
    modelName: string,
    recordsAdded: RecordCallback,
    recordsUpdated: RecordCallback,
    recordsRemoved: RecordCallback
  ): () => void {
    const klass = this._nameToClass(modelName);
    const records = this.getRecords(klass, modelName);
    const { recordsWatchers } = this;

    let recordsWatcher = recordsWatchers.get(records);

    if (!recordsWatcher) {
      recordsWatcher = new RecordsWatcher(
        records,
        recordsAdded,
        recordsUpdated,
        recordsRemoved,
        (record) => this.wrapRecord(record),
        (record) => this.watchRecordChanges(record),
        () => {
          recordsWatchers.delete(records);
          this.updateSubscription();
        }
      );

      recordsWatchers.set(records, recordsWatcher);
      this.updateSubscription();

      recordsWatcher.revalidate();
    }

    return recordsWatcher.release;
  }

  /**
    Observes the records of a type, and calls `typesUpdated` when they change.

    @private
    @return Method to call to remove the watcher
  */
  observeModelType(modelName: string, typesUpdated: WrappedTypeCallback): () => void {
    const klass = this._nameToClass(modelName);
    const records = this.getRecords(klass, modelName);
    const { typeWatchers } = this;

    let typeWatcher = typeWatchers.get(records);

    if (!typeWatcher) {
      typeWatcher = new TypeWatcher(
        records,
        () => typesUpdated([this.wrapModelType(klass, modelName)]),
        () => {
          typeWatchers.delete(records);
          this.updateSubscription();
        }
      );

      typeWatchers.set(records, typeWatcher);
      this.updateSubscription();

      typeWatcher.revalidate();
    }

    return typeWatcher.release;
  }

  /**
    Subscribes to store notifications while there are watchers.
    A notification schedules one check of all watchers.

    @private
  */
  updateSubscription(): void {
    const hasWatchers = this.typeWatchers.size > 0 || this.recordsWatchers.size > 0;

    if (hasWatchers && this.#unsubscribe === null) {
      const { store } = this;
      const token = store.notifications.subscribe('resource', () => this.scheduleFlush());
      this.#unsubscribe = () => store.notifications.unsubscribe(token);
    } else if (!hasWatchers && this.#unsubscribe !== null) {
      this.#unsubscribe();
      this.#unsubscribe = null;
    }
  }

  /**
    Schedules a check of all watchers when the record changes.
    The `'resource'` subscription only gets added and removed records,
    so each watched record needs its own subscription for its fields and state.

    @private
    @return Method to call to unsubscribe
  */
  watchRecordChanges(record: Model): () => void {
    const { store } = this;
    const token = store.notifications.subscribe(recordIdentifierFor(record), () => this.scheduleFlush());
    return () => store.notifications.unsubscribe(token);
  }

  scheduleFlush(): void {
    if (this.#isFlushScheduled) {
      return;
    }
    this.#isFlushScheduled = true;

    queueMicrotask(() => {
      this.#isFlushScheduled = false;
      if (this.isDestroyed) {
        return;
      }
      this.typeWatchers.forEach((watcher) => watcher.revalidate());
      this.recordsWatchers.forEach((watcher) => watcher.revalidate());
    });
  }

  /**
    Wraps a model type with its record count and columns.

    @private
  */
  wrapModelType<N extends string>(klass: ModelSchema, name: N): WrappedType<N> {
    const records = this.getRecords(klass, name);

    return {
      name,
      count: records.length,
      columns: this.columnsForType(klass),
      object: klass,
    };
  }

  /**
    Wraps a record with the values the inspector shows.

    @private
  */
  wrapRecord(record: Model): WrappedRecord<Model> {
    return {
      object: record,
      columnValues: this.getRecordColumnValues(record),
      searchKeywords: this.getRecordKeywords(record),
      filterValues: this.getRecordFilterValues(record),
      color: this.getRecordColor(record),
    };
  }

  destroy(): void {
    if (this.isDestroyed) {
      return;
    }
    this.isDestroyed = true;

    this.typeWatchers.forEach((watcher) => watcher.release());
    this.recordsWatchers.forEach((watcher) => watcher.release());
    this.releaseMethods.slice().forEach((fn) => fn());

    if (this.#unsubscribe !== null) {
      this.#unsubscribe();
      this.#unsubscribe = null;
    }
  }

  /**
    Creates a human readable string used for column headers

    @private
    @param name The attribute name
    @return Human readable string based on the attribute name
  */
  columnNameToDesc(name: string): string {
    return capitalize(underscore(name).replace(/_/g, ' ').trim());
  }

  /**
    Get the columns for a given model type

    @private
    @return An array of columns of the following format:
     name: {String} The name of the column
     desc: {String} Humanized description (what would show in a table column name)
  */
  columnsForType(typeClass: ModelSchema): Array<{ name: string; desc: string }> {
    const columns = [
      {
        name: 'id',
        desc: 'Id',
      },
    ];
    let count = 0;
    typeClass.attributes.forEach((meta, name) => {
      if (count++ > this.attributeLimit) {
        return false;
      }
      const desc = this.columnNameToDesc(name);
      columns.push({ name: name, desc: desc });
    });
    return columns;
  }

  /**
    Fetches all loaded records for a given type

    @private
    @param modelClass of the record
    @param modelName of the record
    @return An array of Model records
     This array will be observed for changes,
     so it should update when new records are added/removed
  */
  getRecords(modelClass: ModelSchema, modelName: string) {
    if (arguments.length < 2) {
      // Legacy Ember.js < 1.13 support
      const containerKey = (modelClass as unknown as { _debugContainerKey?: string })._debugContainerKey;
      if (containerKey) {
        const match = containerKey.match(/model:(.*)/);
        if (match !== null) {
          modelName = match[1];
        }
      }
    }
    assert('Cannot find model name. Please upgrade to Ember.js >= 1.13 for Ember Inspector support', !!modelName);
    return this.store.peekAll(modelName) as unknown as Model[];
  }

  /**
    Gets the values for each column
    This is the attribute values for a given record

    @private
    @param record to get values from
    @return Keys should match column names defined by the model type
  */
  getRecordColumnValues<T extends Model>(record: T): Record<string, unknown> {
    let count = 0;
    const columnValues: Record<string, unknown> = { id: record.id };

    record.eachAttribute((key) => {
      if (count++ > this.attributeLimit) {
        return false;
      }
      columnValues[key] = record[key as keyof T];
    });
    return columnValues;
  }

  /**
    Returns keywords to match when searching records

    @private
    @return Relevant keywords for search based on the record's attribute values
  */
  getRecordKeywords<T extends Model>(record: T): unknown[] {
    const keywords: unknown[] = [record.id];
    const keys = ['id'];

    record.eachAttribute((key) => {
      keys.push(key);
      keywords.push(record[key as keyof T]);
    });

    return keywords;
  }

  /**
    Returns the values of filters defined by `getFilters`
    These reflect the state of the record

    @private
    @return The record state filter values
  */
  getRecordFilterValues(record: Model): { isNew: boolean; isModified: boolean; isClean: boolean } {
    return {
      isNew: record.isNew,
      isModified: record.hasDirtyAttributes && !record.isNew,
      isClean: !record.hasDirtyAttributes,
    };
  }

  /**
    Returns a color that represents the record's state
    Possible colors: black, blue, green

    @private
    @return The record color
  */
  getRecordColor(record: Model): RecordColor {
    let color = 'black';
    if (record.isNew) {
      color = 'green';
    } else if (record.hasDirtyAttributes) {
      color = 'blue';
    }
    return color as RecordColor;
  }

  /**
    Observes all relevant properties and re-sends the wrapped record
    when a change occurs

    @private
    @param record
    @param recordUpdated Callback used to notify changes
    @return The function to call to remove all observers
  */
  observeRecord(record: Model, recordUpdated: (record: WrappedRecord<Model>) => void): () => void {
    const releaseMethods: Array<() => void> = [];
    const keysToObserve = ['id', 'isNew', 'hasDirtyAttributes'];

    record.eachAttribute((key: string) => keysToObserve.push(key));

    keysToObserve.forEach((key) => {
      const handler = () => {
        recordUpdated(this.wrapRecord(record));
      };
      addObserver(record, key, handler);
      releaseMethods.push(function () {
        removeObserver(record, key, handler);
      });
    });

    const release = function () {
      releaseMethods.forEach((fn) => fn());
    };

    return release;
  }
}

const Exported: typeof InspectorDataAdapter | null = macroCondition(
  getGlobalConfig<{ WarpDrive: { includeDataAdapter: boolean } }>().WarpDrive.includeDataAdapter
)
  ? InspectorDataAdapter
  : null;

export default Exported;
