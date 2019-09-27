/**
  @module @ember-data/debug
*/
import { addObserver, removeObserver } from '@ember/object/observers';

import { A } from '@ember/array';
import DataAdapter from '@ember/debug/data-adapter';
import { capitalize, underscore } from '@ember/string';
import { assert } from '@ember/debug';
import { get } from '@ember/object';
import Model from '@ember-data/model';

/**
  Implements `@ember/debug/data-adapter` with for EmberData
  integration with the ember-inspector.

  @class DebugAdapter
  @extends DataAdapter
  @private
*/
export default DataAdapter.extend({
  getFilters() {
    return [
      { name: 'isNew', desc: 'New' },
      { name: 'isModified', desc: 'Modified' },
      { name: 'isClean', desc: 'Clean' },
    ];
  },

  /**
    Detect whether a class is a Model
    @public
    @method detect
    @param {Model} typeClass
    @return {Boolean} Whether the typeClass is a Model class or not
  */
  detect(typeClass) {
    return typeClass !== Model && Model.detect(typeClass);
  },

  columnNameToDesc(name) {
    return capitalize(
      underscore(name)
        .replace(/_/g, ' ')
        .trim()
    );
  },

  /**
    Get the columns for a given model type
    @public
    @method columnsForType
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
    get(typeClass, 'attributes').forEach((meta, name) => {
      if (count++ > self.attributeLimit) {
        return false;
      }
      let desc = this.columnNameToDesc(name);
      columns.push({ name: name, desc: desc });
    });
    return columns;
  },

  /**
    Fetches all loaded records for a given type
    @public
    @method getRecords
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
    return this.get('store').peekAll(modelName);
  },

  /**
    Gets the values for each column
    This is the attribute values for a given record
    @public
    @method getRecordColumnValues
    @param {Model} record to get values from
    @return {Object} Keys should match column names defined by the model type
  */
  getRecordColumnValues(record) {
    let count = 0;
    let columnValues = { id: get(record, 'id') };

    record.eachAttribute(key => {
      if (count++ > this.attributeLimit) {
        return false;
      }
      columnValues[key] = get(record, key);
    });
    return columnValues;
  },

  /**
    Returns keywords to match when searching records
    @public
    @method getRecordKeywords
    @param {Model} record
    @return {Array} Relevant keywords for search based on the record's attribute values
  */
  getRecordKeywords(record) {
    let keywords = [];
    let keys = A(['id']);
    record.eachAttribute(key => keys.push(key));
    keys.forEach(key => keywords.push(get(record, key)));
    return keywords;
  },

  /**
    Returns the values of filters defined by `getFilters`
    These reflect the state of the record
    @public
    @method getRecordFilterValues
    @param {Model} record
    @return {Object} The record state filter values
  */
  getRecordFilterValues(record) {
    return {
      isNew: record.get('isNew'),
      isModified: record.get('hasDirtyAttributes') && !record.get('isNew'),
      isClean: !record.get('hasDirtyAttributes'),
    };
  },

  /**
    Returns a color that represents the record's state
    @public
    @method getRecordColor
    @param {Model} record
    @return {String} The record color
      Possible options: black, blue, green
  */
  getRecordColor(record) {
    let color = 'black';
    if (record.get('isNew')) {
      color = 'green';
    } else if (record.get('hasDirtyAttributes')) {
      color = 'blue';
    }
    return color;
  },

  /**
    Observes all relevant properties and re-sends the wrapped record
    when a change occurs
    @public
    @method observerRecord
    @param {Model} record
    @param {Function} recordUpdated Callback used to notify changes
    @return {Function} The function to call to remove all observers
  */
  observeRecord(record, recordUpdated) {
    let releaseMethods = A();
    let keysToObserve = A(['id', 'isNew', 'hasDirtyAttributes']);

    record.eachAttribute(key => keysToObserve.push(key));
    let adapter = this;

    keysToObserve.forEach(function(key) {
      let handler = function() {
        recordUpdated(adapter.wrapRecord(record));
      };
      addObserver(record, key, handler);
      releaseMethods.push(function() {
        removeObserver(record, key, handler);
      });
    });

    let release = function() {
      releaseMethods.forEach(fn => fn());
    };

    return release;
  },
});
