/**
  @module ember-data
*/
// Keep ED compatible with previous versions of ember
// TODO: Remove this check for Ember 1.0
if (!Ember.DataAdapter) { return; }

var get = Ember.get, capitalize = Ember.String.capitalize, underscore = Ember.String.underscore, DS = window.DS ;

/**
  Extend `Ember.DataAdapter` with ED specific code.
*/
DS.DebugAdapter = Ember.DataAdapter.extend({
  getFilters: function() {
    return [
      { name: 'isNew', desc: 'New' },
      { name: 'isModified', desc: 'Modified' },
      { name: 'isClean', desc: 'Clean' }
    ];
  },

  detect: function(klass) {
    return klass !== DS.Model && DS.Model.detect(klass);
  },

  columnsForType: function(type) {
    var columns = [{ name: 'id', desc: 'Id' }], count = 0, self = this;
    Ember.A(get(type, 'attributes')).forEach(function(name, meta) {
        if (count++ > self.attributeLimit) { return false; }
        var desc = capitalize(underscore(name).replace('_', ' '));
        columns.push({ name: name, desc: desc });
    });
    return columns;
  },

  getRecords: function(type) {
    return this.get('store').all(type);
  },

  getRecordColumnValues: function(record) {
    var self = this, count = 0,
        columnValues = { id: get(record, 'id') };

    record.eachAttribute(function(key) {
      if (count++ > self.attributeLimit) {
        return false;
      }
      var value = get(record, key);
      columnValues[key] = value;
    });
    return columnValues;
  },

  getRecordKeywords: function(record) {
    var keywords = [], keys = Ember.A(['id']);
    record.eachAttribute(function(key) {
      keys.push(key);
    });
    keys.forEach(function(key) {
      keywords.push(get(record, key));
    });
    return keywords;
  },

  getRecordFilterValues: function(record) {
    return {
      isNew: record.get('isNew'),
      isModified: record.get('isDirty') && !record.get('isNew'),
      isClean: !record.get('isDirty')
    };
  },

  getRecordColor: function(record) {
    var color = 'black';
    if (record.get('isNew')) {
      color = 'green';
    } else if (record.get('isDirty')) {
      color = 'blue';
    }
    return color;
  },

  observeRecord: function(record, recordUpdated) {
    var releaseMethods = Ember.A(), self = this,
        keysToObserve = Ember.A(['id', 'isNew', 'isDirty']);

    record.eachAttribute(function(key) {
      keysToObserve.push(key);
    });

    keysToObserve.forEach(function(key) {
      var handler = function() {
        recordUpdated(self.wrapRecord(record));
      };
      Ember.addObserver(record, key, handler);
      releaseMethods.push(function() {
        Ember.removeObserver(record, key, handler);
      });
    });

    var release = function() {
      releaseMethods.forEach(function(fn) { fn(); } );
    };

    return release;
  }

});

