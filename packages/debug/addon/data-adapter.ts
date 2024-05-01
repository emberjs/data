/**
  # Overview

  This package provides the `DataAdapter` which the [Ember Inspector](https://github.com/emberjs/ember-inspector)
  uses to subscribe and retrieve information for the `data` tab in the inspector.

  This package adds roughly .6 KB when minified and compressed to your application in production; however,
  you can opt out of shipping this addon in production via options in `ember-cli-build.js`

  ```js
  let app = new EmberApp(defaults, {
    emberData: {
      includeDataAdapterInProduction: false
    }
  });
  ```

  When using `ember-data` as a dependency of your app, the default is to ship the inspector support to production.

  When not using `ember-data` as a dependency but instead using EmberData via declaring specific `@ember-data/<package>`
  dependencies the default is to not ship to production.

  @module @ember-data/debug
  @main @ember-data/debug
*/
import type Store from '@ember-data/store';
import type Model from '@ember-data/model';
import { ModelSchema } from '@ember-data/store/-types/q/ds-model';
import { assert } from '@ember/debug';
import DataAdapter from '@ember/debug/data-adapter';
import { addObserver, removeObserver } from '@ember/object/observers';
import { inject as service } from '@ember/service';
import { capitalize, underscore } from '@ember/string';
import { recordIdentifierFor } from '@ember-data/store';

import type { NativeArray } from '@ember/array';
import { A } from '@ember/array';

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
type WrappedTypeCallback = (types: WrappedType<string>[]) => void;

function debugInfo(this: Model) {
  const relationships: { belongsTo?: []; hasMany?: [] } = {};
  const expensiveProperties: string[] = [];

  const identifier = recordIdentifierFor(this);
  const schema = this.store.getSchemaDefinitionService();
  const attrDefs = schema.attributesDefinitionFor(identifier);
  const relDefs = schema.relationshipsDefinitionFor(identifier);

  const attributes = Object.keys(attrDefs);
  attributes.unshift('id');

  const groups = [
    {
      name: 'Attributes',
      properties: attributes,
      expand: true,
    },
  ];

  Object.keys(relDefs).forEach((name) => {
    const relationship = relDefs[name];
    let properties: string[] | undefined = relationships[relationship.kind];

    if (properties === undefined) {
      properties = relationships[relationship.kind] = [];
      groups.push({
        name: relationship.kind,
        properties,
        expand: true,
      });
    }
    properties.push(name);
    expensiveProperties.push(name);
  });

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

   @internal
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

  @class InspectorDataAdapter
  @extends DataAdapter
  @private
*/
export default class extends DataAdapter<Model> {
  @service('store') declare store: Store;

  /**
    Specifies how records can be filtered based on the state of the record
    Records returned will need to have a `filterValues`
    property with a key for every name in the returned array

    @method getFilters
    @private
    @return {Array} List of objects defining filters
     The object should have a `name` and `desc` property
  */
  override getFilters() {
    return [
      { name: 'isNew', desc: 'New' },
      { name: 'isModified', desc: 'Modified' },
      { name: 'isClean', desc: 'Clean' },
    ];
  }

  override _nameToClass(type: string) {
    return this.store.modelFor(type);
  }

  /**
    Fetch the model types and observe them for changes.
    Maintains the list of model types without needing the Model package for detection.

    @method watchModelTypes
    @private
    @param {Function} typesAdded Callback to call to add types.
    Takes an array of objects containing wrapped types (returned from `wrapModelType`).
    @param {Function} typesUpdated Callback to call when a type has changed.
    Takes an array of objects containing wrapped types.
    @return {Function} Method to call to remove all observers
  */
  override watchModelTypes(typesAdded: WrappedTypeCallback, typesUpdated: WrappedTypeCallback) {
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

    Object.keys(store.identifierCache._cache.resourcesByType).forEach((type) => {
      discoveredTypes.set(type, false);
    });

    // Add any models that were added during initialization of the app, before the inspector was opened
    discoveredTypes.forEach((_, type) => {
      this.watchTypeIfUnseen(store, discoveredTypes, type, typesAdded, typesUpdated, _releaseMethods);
    });

    let release = () => {
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
   * @method watchTypeIfUnseen
   * @param {store} store
   * @param {Map} discoveredTypes
   * @param {String} type
   * @param {Function} typesAdded
   * @param {Function} typesUpdated
   * @param {Array} releaseMethods
   * @private
   */
  watchTypeIfUnseen(
    store: Store,
    discoveredTypes: Map<string, boolean>,
    type: string,
    typesAdded: WrappedTypeCallback,
    typesUpdated: WrappedTypeCallback,
    releaseMethods: Array<() => void>
  ) {
    if (discoveredTypes.get(type) !== true) {
      let klass = store.modelFor(type);
      installDebugInfo(klass as typeof Model);
      let wrapped = this.wrapModelType(klass, type);
      releaseMethods.push(this.observeModelType(type, typesUpdated));
      typesAdded([wrapped]);
      discoveredTypes.set(type, true);
    }
  }

  /**
    Creates a human readable string used for column headers

    @method columnNameToDesc
    @private
    @param {String} name The attribute name
    @return {String} Human readable string based on the attribute name
  */
  columnNameToDesc(name: string) {
    return capitalize(underscore(name).replace(/_/g, ' ').trim());
  }

  /**
    Get the columns for a given model type

    @method columnsForType
    @private
    @param {Model} typeClass
    @return {Array} An array of columns of the following format:
     name: {String} The name of the column
     desc: {String} Humanized description (what would show in a table column name)
  */
  override columnsForType(typeClass: ModelSchema) {
    let columns = [
      {
        name: 'id',
        desc: 'Id',
      },
    ];
    let count = 0;
    let self = this;
    typeClass.attributes.forEach((meta, name) => {
      if (count++ > self.attributeLimit) {
        return false;
      }
      let desc = this.columnNameToDesc(name);
      columns.push({ name: name, desc: desc });
    });
    return columns;
  }

  /**
    Fetches all loaded records for a given type

    @method getRecords
    @private
    @param {Model} modelClass of the record
    @param {String} modelName of the record
    @return {Array} An array of Model records
     This array will be observed for changes,
     so it should update when new records are added/removed
  */
  override getRecords(modelClass: ModelSchema, modelName: string) {
    if (arguments.length < 2) {
      // Legacy Ember.js < 1.13 support
      let containerKey = (modelClass as unknown as { _debugContainerKey?: string })._debugContainerKey;
      if (containerKey) {
        let match = containerKey.match(/model:(.*)/);
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

    @method getRecordColumnValues
    @private
    @param {Model} record to get values from
    @return {Object} Keys should match column names defined by the model type
  */
  override getRecordColumnValues(record: Model) {
    let count = 0;
    let columnValues: Record<string, unknown> = { id: record.id };

    record.eachAttribute((key) => {
      if (count++ > this.attributeLimit) {
        return false;
      }
      columnValues[key] = record[key];
    });
    return columnValues;
  }

  /**
    Returns keywords to match when searching records

    @method getRecordKeywords
    @private
    @param {Model} record
    @return {Array} Relevant keywords for search based on the record's attribute values
  */
  override getRecordKeywords(record: Model): NativeArray<unknown> {
    const keywords: unknown[] = [record.id];
    const keys = ['id'];

    record.eachAttribute((key) => {
      keys.push(key);
      keywords.push(record[key]);
    });

    return A(keywords);
  }

  /**
    Returns the values of filters defined by `getFilters`
    These reflect the state of the record

    @method getRecordFilterValues
    @private
    @param {Model} record
    @return {Object} The record state filter values
  */
  override getRecordFilterValues(record: Model) {
    return {
      isNew: record.isNew,
      isModified: record.hasDirtyAttributes && !record.isNew,
      isClean: !record.hasDirtyAttributes,
    };
  }

  /**
    Returns a color that represents the record's state
    Possible colors: black, blue, green

    @method getRecordColor
    @private
    @param {Model} record
    @return {String} The record color
  */
  override getRecordColor(record: Model) {
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

    @method observeRecord
    @private
    @param {Model} record
    @param {Function} recordUpdated Callback used to notify changes
    @return {Function} The function to call to remove all observers
  */
  observeRecord(record: Model, recordUpdated: (record: WrappedRecord<Model>) => void) {
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

    let release = function () {
      releaseMethods.forEach((fn) => fn());
    };

    return release;
  }
}
