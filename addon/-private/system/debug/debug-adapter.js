/**
  @module ember-data
*/
import Ember from 'ember';
import Model from "ember-data/model";
var get = Ember.get;
var capitalize = Ember.String.capitalize;
var underscore = Ember.String.underscore;
const { assert } = Ember;

/*
  Extend `Ember.DataAdapter` with ED specific code.

  @class DebugAdapter
  @namespace DS
  @extends Ember.DataAdapter
  @private
*/
export default Ember.DataAdapter.extend({
  getFilters() {
    return [
      { name: 'isNew', desc: 'New' },
      { name: 'isModified', desc: 'Modified' },
      { name: 'isClean', desc: 'Clean' }
    ];
  },

  detect(typeClass) {
    return typeClass !== Model && Model.detect(typeClass);
  },

  columnsForType(typeClass) {
    var columns = [{
      name: 'id',
      desc: 'Id'
    }];
    var count = 0;
    var self = this;
    get(typeClass, 'attributes').forEach((meta, name) => {
      if (count++ > self.attributeLimit) { return false; }
      var desc = capitalize(underscore(name).replace('_', ' '));
      columns.push({ name: name, desc: desc });
    });
    return columns;
  },

  getRecords(modelClass, modelName) {
    if (arguments.length < 2) {
      // Legacy Ember.js < 1.13 support
      let containerKey = modelClass._debugContainerKey;
      if (containerKey) {
        let match = containerKey.match(/model:(.*)/);
        if (match) {
          modelName = match[1];
        }
      }
    }
    assert("Cannot find model name. Please upgrade to Ember.js >= 1.13 for Ember Inspector support", !!modelName);
    return this.get('store').peekAll(modelName);
  },

  getRecordColumnValues(record) {
    var count = 0;
    var columnValues = { id: get(record, 'id') };

    record.eachAttribute((key) => {
      if (count++ > this.attributeLimit) {
        return false;
      }
      var value = get(record, key);
      columnValues[key] = value;
    });
    return columnValues;
  },

  getRecordKeywords(record) {
    var keywords = [];
    var keys = Ember.A(['id']);
    record.eachAttribute((key) => keys.push(key));
    keys.forEach((key) => keywords.push(get(record, key)));
    return keywords;
  },

  getRecordFilterValues(record) {
    return {
      isNew: record.get('isNew'),
      isModified: record.get('hasDirtyAttributes') && !record.get('isNew'),
      isClean: !record.get('hasDirtyAttributes')
    };
  },

  getRecordColor(record) {
    var color = 'black';
    if (record.get('isNew')) {
      color = 'green';
    } else if (record.get('hasDirtyAttributes')) {
      color = 'blue';
    }
    return color;
  },

  observeRecord(record, recordUpdated) {
    var releaseMethods = Ember.A();
    var keysToObserve = Ember.A(['id', 'isNew', 'hasDirtyAttributes']);

    record.eachAttribute((key) => keysToObserve.push(key));
    var adapter = this;

    keysToObserve.forEach(function(key) {
      var handler = function() {
        recordUpdated(adapter.wrapRecord(record));
      };
      Ember.addObserver(record, key, handler);
      releaseMethods.push(function() {
        Ember.removeObserver(record, key, handler);
      });
    });

    var release = function() {
      releaseMethods.forEach((fn) => fn());
    };

    return release;
  }
});
