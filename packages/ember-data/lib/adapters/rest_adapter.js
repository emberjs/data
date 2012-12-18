require("ember-data/core");
require('ember-data/system/adapter');
require('ember-data/serializers/rest_serializer');
/*global jQuery*/

var get = Ember.get, set = Ember.set, merge = Ember.merge;

function loaderFor(store, id) {
  return {
    load: function(type, data, prematerialized) {
      return store.load(type, data, prematerialized);
    },

    loadMany: function(type, array) {
      return store.loadMany(type, array);
    },

    sideload: function(type, data) {
      return store.load(type, data);
    },

    sideloadMany: function(type, array) {
      return store.loadMany(type, array);
    },

    sinceForType: function(type, since) {
      store.sinceForType(type, since);
    }
  };
}

DS.RESTAdapter = DS.Adapter.extend({
  bulkCommit: false,
  since: 'since',

  serializer: DS.RESTSerializer,

  init: function() {
    this._super.apply(this, arguments);

    get(this, 'serializer').plurals = this.plurals || {};
  },

  load: function(store, type, payload) {
    var loader = loaderFor(store, null, this.extractId(type, payload));
    get(this, 'serializer').extractRecordRepresentation(loader, type, payload);
  },

  createRecord: function(store, type, record) {
    var root = this.rootForType(type);

    var data = {};
    data[root] = this.serialize(record, { includeId: true });

    this.ajax(this.buildURL(root), "POST", {
      data: data,
      context: this,
      success: function(json) {
        Ember.run(this, function(){
          this.didCreateRecord(store, type, record, json);
        });
      },
      error: function(xhr) {
        this.didError(store, type, record, xhr);
      }
    });
  },

  dirtyRecordsForHasManyChange: Ember.K,

  didCreateRecord: function(store, type, record, json) {
    store.didSaveRecord(record);

    if (json) {
      var loader = loaderFor(store);
      var serializer = get(this, 'serializer');

      loader.load = function(type, data, prematerialized) {
        store.updateId(record, data);
        store.load(type, data, prematerialized);
      };

      get(this, 'serializer').extract(loader, json, type);
    }
  },

  didCreateRecords: function(store, type, records, json) {
    records.forEach(function(record) {
      store.didSaveRecord(record);
    }, this);

    records = records.toArray();

    if (json) {
      var loader = loaderFor(store);
      loader.loadMany = function(type, array) {
        for (var i = 0; i < array.length; i++) {
          store.updateId(records[i], array[i]);
        }
        store.loadMany(type, array);
      };

      get(this, 'serializer').extractMany(loader, json, type);
    }
  },

  didSaveRecord: function(store, type, record, json) {
    store.didSaveRecord(record);

    if (json) {
      var loader = loaderFor(store);
      get(this, 'serializer').extract(loader, json, type);
    }
  },

  didSaveRecords: function(store, type, records, json) {
    records.forEach(function(record) {
      store.didSaveRecord(record);
    }, this);

    if (json) {
      var loader = loaderFor(store);
      get(this, 'serializer').extractMany(loader, json, type);
    }
  },

  createRecords: function(store, type, records) {
    if (get(this, 'bulkCommit') === false) {
      return this._super(store, type, records);
    }

    var root = this.rootForType(type),
        plural = this.pluralize(root);

    var data = {};
    data[plural] = [];
    records.forEach(function(record) {
      data[plural].push(this.serialize(record, { includeId: true }));
    }, this);

    this.ajax(this.buildURL(root), "POST", {
      data: data,
      context: this,
      success: function(json) {
        Ember.run(this, function(){
          this.didCreateRecords(store, type, records, json);
        });
      }
    });
  },

  updateRecord: function(store, type, record) {
    var id = get(record, 'id');
    var root = this.rootForType(type);

    var data = {};
    data[root] = this.serialize(record);

    this.ajax(this.buildURL(root, id), "PUT", {
      data: data,
      context: this,
      success: function(json) {
        Ember.run(this, function(){
          this.didSaveRecord(store, type, record, json);
        });
      },
      error: function(xhr) {
        this.didError(store, type, record, xhr);
      }
    });
  },

  updateRecords: function(store, type, records) {
    if (get(this, 'bulkCommit') === false) {
      return this._super(store, type, records);
    }

    var root = this.rootForType(type),
        plural = this.pluralize(root);

    var data = {};
    data[plural] = [];
    records.forEach(function(record) {
      data[plural].push(this.serialize(record, { includeId: true }));
    }, this);

    this.ajax(this.buildURL(root, "bulk"), "PUT", {
      data: data,
      context: this,
      success: function(json) {
        Ember.run(this, function(){
          this.didSaveRecords(store, type, records, json);
        });
      }
    });
  },

  deleteRecord: function(store, type, record) {
    var id = get(record, 'id');
    var root = this.rootForType(type);

    this.ajax(this.buildURL(root, id), "DELETE", {
      context: this,
      success: function(json) {
        Ember.run(this, function(){
          this.didSaveRecord(store, type, record, json);
        });
      }
    });
  },

  deleteRecords: function(store, type, records) {
    if (get(this, 'bulkCommit') === false) {
      return this._super(store, type, records);
    }

    var root = this.rootForType(type),
        plural = this.pluralize(root),
        serializer = get(this, 'serializer');

    var data = {};
    data[plural] = [];
    records.forEach(function(record) {
      data[plural].push(serializer.serializeId( get(record, 'id') ));
    });

    this.ajax(this.buildURL(root, 'bulk'), "DELETE", {
      data: data,
      context: this,
      success: function(json) {
        Ember.run(this, function(){
          this.didSaveRecords(store, type, records, json);
        });
      }
    });
  },

  find: function(store, type, id) {
    var root = this.rootForType(type);

    this.ajax(this.buildURL(root, id), "GET", {
      success: function(json) {
        Ember.run(this, function(){
          this.didFindRecord(store, type, json, id);
        });
      }
    });
  },

  didFindRecord: function(store, type, json, id) {
    var loader = loaderFor(store);

    loader.load = function(type, data, prematerialized) {
      prematerialized = prematerialized || {};
      prematerialized.id = id;

      return store.load(type, data, prematerialized);
    };

    get(this, 'serializer').extract(loader, json, type);
  },

  findAll: function(store, type, since) {
    var root = this.rootForType(type);

    this.ajax(this.buildURL(root), "GET", {
      data: this.sinceQuery(since),
      success: function(json) {
        Ember.run(this, function(){
          this.didFindAll(store, type, json);
        });
      }
    });
  },

  didFindAll: function(store, type, json) {
    var loader = loaderFor(store),
        serializer = get(this, 'serializer');

    store.didUpdateAll(type);

    serializer.extractMany(loader, json, type);
  },

  findQuery: function(store, type, query, recordArray) {
    var root = this.rootForType(type);

    this.ajax(this.buildURL(root), "GET", {
      data: query,
      success: function(json) {
        Ember.run(this, function(){
          this.didFindQuery(store, type, json, recordArray);
        });
      }
    });
  },

  didFindQuery: function(store, type, json, recordArray) {
    var loader = loaderFor(store);
    loader.loadMany = function(type, data) {
      recordArray.load(data);
    };

    get(this, 'serializer').extractMany(loader, json, type);
  },

  findMany: function(store, type, ids) {
    var root = this.rootForType(type);
    ids = this.serializeIds(ids);

    this.ajax(this.buildURL(root), "GET", {
      data: {ids: ids},
      success: function(json) {
        Ember.run(this, function(){
          this.didFindMany(store, type, json);
        });
      }
    });
  },

  /**
    @private

    This method serializes a list of IDs using `serializeId`

    @returns {Array} an array of serialized IDs
  */
  serializeIds: function(ids) {
    var serializer = get(this, 'serializer');

    return Ember.EnumerableUtils.map(ids, function(id) {
      return serializer.serializeId(id);
    });
  },

  didFindMany: function(store, type, json) {
    var loader = loaderFor(store);

    get(this, 'serializer').extractMany(loader, json, type);
  },

  didError: function(store, type, record, xhr) {
    if (xhr.status === 422) {
      var data = JSON.parse(xhr.responseText);
      store.recordWasInvalid(record, data['errors']);
    } else {
      store.recordWasError(record);
    }
  },

  ajax: function(url, type, hash) {
    hash.url = url;
    hash.type = type;
    hash.dataType = 'json';
    hash.contentType = 'application/json; charset=utf-8';
    hash.context = this;

    if (hash.data && type !== 'GET') {
      hash.data = JSON.stringify(hash.data);
    }

    jQuery.ajax(hash);
  },

  url: "",

  rootForType: function(type) {
    var serializer = get(this, 'serializer');
    return serializer.rootForType(type);
  },

  pluralize: function(string) {
    var serializer = get(this, 'serializer');
    return serializer.pluralize(string);
  },

  buildURL: function(record, suffix) {
    var url = [this.url];

    Ember.assert("Namespace URL (" + this.namespace + ") must not start with slash", !this.namespace || this.namespace.toString().charAt(0) !== "/");
    Ember.assert("Record URL (" + record + ") must not start with slash", !record || record.toString().charAt(0) !== "/");
    Ember.assert("URL suffix (" + suffix + ") must not start with slash", !suffix || suffix.toString().charAt(0) !== "/");

    if (this.namespace !== undefined) {
      url.push(this.namespace);
    }

    url.push(this.pluralize(record));
    if (suffix !== undefined) {
      url.push(suffix);
    }

    return url.join("/");
  },

  sinceQuery: function(since) {
    var query = {};
    query[get(this, 'since')] = since;
    return since ? query : null;
  }
});

