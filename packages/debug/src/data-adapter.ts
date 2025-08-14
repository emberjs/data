import type { NativeArray } from '@ember/array';
import { A } from '@ember/array';
import DataAdapter from '@ember/debug/data-adapter';
import { addObserver, removeObserver } from '@ember/object/observers';
import * as s from '@ember/service';

import { getGlobalConfig, macroCondition } from '@embroider/macros';

import type Model from '@ember-data/model';
import { capitalize, underscore } from '@ember-data/request-utils/string';
import type Store from '@ember-data/store';
import { recordIdentifierFor } from '@ember-data/store';
import type { ModelSchema } from '@ember-data/store/types';
import { assert } from '@warp-drive/core/build-config/macros';

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

function debugInfo(this: Model) {
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

function typesMapFor(store: Store): Map<string, boolean> {
  let typesMap = StoreTypesMap.get(store);

  if (typesMap === undefined) {
    typesMap = new Map();
    StoreTypesMap.set(store, typesMap);
  }

  return typesMap;
}

/**
  Implements `@ember/debug/data-adapter` with for EmberData
  integration with the ember-inspector.

  @private
*/
class InspectorDataAdapter extends DataAdapter<Model> {
  @service('store') declare store: Store;

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
      this.releaseMethods.removeObject(release);
    };
    this.releaseMethods.pushObject(release);
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
      installDebugInfo(klass as typeof Model);
      const wrapped = this.wrapModelType(klass, type);
      releaseMethods.push(this.observeModelType(type, typesUpdated));
      typesAdded([wrapped]);
      discoveredTypes.set(type, true);
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
    return this.store.peekAll(modelName) as unknown as NativeArray<Model>;
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
  getRecordKeywords<T extends Model>(record: T): NativeArray<unknown> {
    const keywords: unknown[] = [record.id];
    const keys = ['id'];

    record.eachAttribute((key) => {
      keys.push(key);
      keywords.push(record[key as keyof T]);
    });

    return A(keywords);
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
