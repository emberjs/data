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
import { A } from '@ember/array';
import { assert } from '@ember/debug';
import DataAdapter from '@ember/debug/data-adapter';
import { addObserver, removeObserver } from '@ember/object/observers';
import { inject as service } from '@ember/service';
import { capitalize, underscore } from '@ember/string';

const StoreTypesMap = new WeakMap();

function typesMapFor(store) {
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
export default class extends DataAdapter {
  @service('store') store;

  /**
    Specifies how records can be filtered based on the state of the record
    Records returned will need to have a `filterValues`
    property with a key for every name in the returned array

    @method getFilters
    @private
    @return {Array} List of objects defining filters
     The object should have a `name` and `desc` property
  */
  getFilters() {
    return [
      { name: 'isNew', desc: 'New' },
      { name: 'isModified', desc: 'Modified' },
      { name: 'isClean', desc: 'Clean' },
    ];
  }

  _nameToClass(type) {
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
  watchModelTypes(typesAdded, typesUpdated) {
    const { store } = this;

    const unsub = store.notifications.subscribe('resource', (identifier, notificationType) => {
      if (notificationType === 'added') {
        this.watchTypeIfUnseen(store, discoveredTypes, identifier.type, typesAdded, typesUpdated, _releaseMethods);
      }
    });

    const __getResourceCache = store._instanceCache.getResourceCache;
    const _releaseMethods = [
      () => {
        store.notifications.unsubscribe(unsub);
      },
    ];
    const discoveredTypes = typesMapFor(store);

    Object.keys(store.identifierCache._cache.resourcesByType).forEach((type) => {
      discoveredTypes.set(type, false);
    });

    // Add any models that were added during initialization of the app, before the inspector was opened
    discoveredTypes.forEach((_, type) => {
      this.watchTypeIfUnseen(store, discoveredTypes, type, typesAdded, typesUpdated, _releaseMethods);
    });

    let release = () => {
      _releaseMethods.forEach((fn) => fn());
      store._instanceCache.getResourceCache = __getResourceCache;
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
  watchTypeIfUnseen(store, discoveredTypes, type, typesAdded, typesUpdated, releaseMethods) {
    if (discoveredTypes.get(type) !== true) {
      let klass = store.modelFor(type);
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
  columnNameToDesc(name) {
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
  columnsForType(typeClass) {
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
  getRecords(modelClass, modelName) {
    if (arguments.length < 2) {
      // Legacy Ember.js < 1.13 support
      let containerKey = modelClass._debugContainerKey;
      if (containerKey) {
        let match = containerKey.match(/model:(.*)/);
        if (match !== null) {
          modelName = match[1];
        }
      }
    }
    assert('Cannot find model name. Please upgrade to Ember.js >= 1.13 for Ember Inspector support', !!modelName);
    return this.store.peekAll(modelName);
  }

  /**
    Gets the values for each column
    This is the attribute values for a given record

    @method getRecordColumnValues
    @private
    @param {Model} record to get values from
    @return {Object} Keys should match column names defined by the model type
  */
  getRecordColumnValues(record) {
    let count = 0;
    let columnValues = { id: record.id };

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
  getRecordKeywords(record) {
    let keywords = [];
    let keys = A(['id']);
    record.eachAttribute((key) => keys.push(key));
    keys.forEach((key) => keywords.push(record[key]));
    return keywords;
  }

  /**
    Returns the values of filters defined by `getFilters`
    These reflect the state of the record

    @method getRecordFilterValues
    @private
    @param {Model} record
    @return {Object} The record state filter values
  */
  getRecordFilterValues(record) {
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
  getRecordColor(record) {
    let color = 'black';
    if (record.isNew) {
      color = 'green';
    } else if (record.hasDirtyAttributes) {
      color = 'blue';
    }
    return color;
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
  observeRecord(record, recordUpdated) {
    let releaseMethods = A();
    let keysToObserve = A(['id', 'isNew', 'hasDirtyAttributes']);

    record.eachAttribute((key) => keysToObserve.push(key));
    let adapter = this;

    keysToObserve.forEach(function (key) {
      let handler = function () {
        recordUpdated(adapter.wrapRecord(record));
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
