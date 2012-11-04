require("ember-data/core");
require('ember-data/system/adapter');
require('ember-data/serializers/rest_serializer');
/*global jQuery*/

var get = Ember.get, set = Ember.set;

var coerceId = function(id) {
  return id+'';
};

DS.NestedRESTAdapter = DS.Adapter.extend({
  bulkCommit: false,

  serializer: DS.RESTSerializer,

  commit: function(store, commitDetails) {
    var created, updated;
    
    created = Ember.OrderedSet.create();
    commitDetails.created.forEach(function(record) {
      var shouldCommit = this.shouldCommit(record);
      
      if (!shouldCommit) {
        store.didSaveRecord(record);
      } else {
        created.add(record);
      }
    }, this);
    commitDetails.created = created;
    
    updated = Ember.OrderedSet.create();
    commitDetails.updated.forEach(function(record) {
      var shouldCommit = this.shouldCommit(record);
      
      if (!shouldCommit) {
        store.didSaveRecord(record);
      } else {
        updated.add(record);
      }
    }, this);
    commitDetails.updated = updated;
    
    this.save(store, commitDetails);
  },
  
  groupByType: function(enumerable) {
    var map = Ember.MapWithDefault.create({
      defaultValue: function() { return Ember.OrderedSet.create(); }
    });
    
    var dependencies = [], seenTypes = [], type;

    enumerable.forEach(function(item) {
      if (!seenTypes.contains(item.constructor)) {
        seenTypes.push(item.constructor);
        if (!dependencies.contains(item.constructor)) {
          dependencies.push(item.constructor);
        }
        Ember.get(item.constructor, 'associationsByName').forEach(function(key, value) {
          if (value.kind === 'belongsTo') {
            dependencies.splice(dependencies.indexOf(item.constructor), 0, value.type);
          }
        });
      }
    });
    dependencies = dependencies.uniq();
    
    var callback = function(item) {
      if (item.constructor === type) {
        map.get(type).add(item);
      }
    };
    
    while (dependencies.length > 0) {
      type = dependencies.shift();
      enumerable.forEach(callback);
    }
    
    return map;
  },
  
  shouldCommit: function(record) {
    var ret = true;
    Ember.get(record.constructor, 'associationsByName').forEach(function(key, value) {
      if (value.kind === 'belongsTo' && record.get(key + '.id') === undefined) {
        ret = false;
      }
    });
    if (record.isCommittingBecause('attribute') || record.isCommittingBecause('belongsTo')) {
      return true;
    }
    return ret;
  },

  didSaveRecord: function(store, record, hash) {
    record.eachAssociation(function(name, meta) {
      if (meta.kind === 'belongsTo') {
        store.didUpdateRelationship(record, name);
      }
    });

    store.didSaveRecord(record, hash);
  },

  didSaveRecords: function(store, records, array) {
    var i = 0;

    records.forEach(function(record) {
      this.didSaveRecord(store, record, array && array[i++]);
    }, this);
  },

  createRecord: function(store, type, record) {
    var root = this.rootForType(type);

    var data = {};
    data[root] = this.toJSON(record, { includeId: true });

    this.ajax(this.buildURL(type, undefined, record), "POST", {
      data: data,
      context: this,
      success: function(json) {
        this.didCreateRecord(store, type, record, json);
      }
    });
  },

  didCreateRecord: function(store, type, record, json) {
    var root = this.rootForType(type);

    this.sideload(store, type, json, root);
    this.didSaveRecord(store, record, json[root]);
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
      data[plural].push(this.toJSON(record, { includeId: true }));
    }, this);

    this.ajax(this.buildURL(type, undefined, records[0]), "POST", {
      data: data,
      context: this,
      success: function(json) {
        this.didCreateRecords(store, type, records, json);
      }
    });
  },

  didCreateRecords: function(store, type, records, json) {
    var root = this.pluralize(this.rootForType(type));

    this.sideload(store, type, json, root);
    this.didSaveRecords(store, records, json[root]);
  },

  updateRecord: function(store, type, record) {
    var id = get(record, 'id');
    var root = this.rootForType(type);

    var data = {};
    data[root] = this.toJSON(record);

    this.ajax(this.buildURL(type, id, record), "PUT", {
      data: data,
      context: this,
      success: function(json) {
        this.didUpdateRecord(store, type, record, json);
      }
    });
  },

  didUpdateRecord: function(store, type, record, json) {
    var root = this.rootForType(type);

    this.sideload(store, type, json, root);
    this.didSaveRecord(store, record, json && json[root]);
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
      data[plural].push(this.toJSON(record, { includeId: true }));
    }, this);

    this.ajax(this.buildURL(type, "bulk", records[0]), "PUT", {
      data: data,
      context: this,
      success: function(json) {
        this.didUpdateRecords(store, type, records, json);
      }
    });
  },

  didUpdateRecords: function(store, type, records, json) {
    var root = this.pluralize(this.rootForType(type));

    this.sideload(store, type, json, root);
    this.didSaveRecords(store, records, json[root]);
  },

  deleteRecord: function(store, type, record) {
    var id = get(record, 'id');

    this.ajax(this.buildURL(type, id, record), "DELETE", {
      context: this,
      success: function(json) {
        this.didDeleteRecord(store, type, record, json);
      }
    });
  },

  didDeleteRecord: function(store, type, record, json) {
    if (json) { this.sideload(store, type, json); }
    this.didSaveRecord(store, record);
  },

  // TODO is there a better way to do this, without records[0] how to get the parent ID?
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

    this.ajax(this.buildURL(type, 'bulk', records[0]), "DELETE", {
      data: data,
      context: this,
      success: function(json) {
        this.didDeleteRecords(store, type, records, json);
      }
    });
  },

  didDeleteRecords: function(store, type, records, json) {
    if (json) { this.sideload(store, type, json); }
    this.didSaveRecords(store, records);
  },

  find: function(store, type, id) {
    this.ajax(this.buildURL(type, id), "GET", {
      success: function(json) {
        this.didFindRecord(store, type, json, id);
      }
    });
  },

  didFindRecord: function(store, type, json, id) {
    var root = this.rootForType(type);

    this.sideload(store, type, json, root);
    store.load(type, id, json[root]);
  },

  findAll: function(store, type, since) {
    this.ajax(this.buildURL(type), "GET", {
      data: this.sinceQuery(since),
      success: function(json) {
        this.didFindAll(store, type, json);
      }
    });
  },

  didFindAll: function(store, type, json) {
    var root = this.pluralize(this.rootForType(type)),
        since = this.extractSince(json);

    this.sideload(store, type, json, root);
    store.loadMany(type, json[root]);

    // this registers the id with the store, so it will be passed
    // into the next call to `findAll`
    if (since) { store.sinceForType(type, since); }

    store.didUpdateAll(type);
  },

  findQuery: function(store, type, query, recordArray) {
    var parentId = query['parent_id'] ? query['parent_id'] : null;
    // i'm not sure if this could cause problems
    //delete query['parent_id'];
    
    this.ajax(this.buildURL(type, undefined, parentId), "GET", {
      data: query,
      success: function(json) {
        this.didFindQuery(store, type, json, recordArray);
      }
    });
  },

  didFindQuery: function(store, type, json, recordArray) {
    var root = this.pluralize(this.rootForType(type));

    this.sideload(store, type, json, root);
    recordArray.load(json[root]);
  },

  findMany: function(store, type, ids) {
    ids = get(this, 'serializer').serializeIds(ids);

    this.ajax(this.buildURL(type), "GET", {
      data: {ids: ids},
      success: function(json) {
        this.didFindMany(store, type, json);
      }
    });
  },

  didFindMany: function(store, type, json) {
    var root = this.pluralize(this.rootForType(type));

    this.sideload(store, type, json, root);
    store.loadMany(type, json[root]);
  },

  // HELPERS

  plurals: {},
  singulars: {},
  
  // define a plurals hash in your subclass to define
  // special-case pluralization
  pluralize: function(name) {
    return this.plurals[name] || name + "s";
  },
  
  // TODO
  singularize: function(name) {
    if (this.singulars === {}) {
      for(var s in this.plurals) {
        this.singulars[this.plurals[s]] = s;
      }
    }
    return this.singulars[name] || name.substring(0, name.length-1);
  },

  resourceForType: function(type) {
    // use the last part of the name as the URL
    var parts = type.toString().split(".");
    var name = parts[parts.length - 1];
    return name.replace(/([A-Z])/g, '_$1').toLowerCase().slice(1);
  },
  
  rootForType: function(type) {
    if (type.root) { return type.root; }
    
    return this.resourceForType(type);
  },
  
  urlForType: function(type, record) {
    var matches, parentRecordId = '';
    
    if (type.url) { 
      matches = type.url.match(/%@([0-9]+)?/g);
      if (typeof record !== "object") {
        parentRecordId = record;
      } else if (matches && record !== undefined) {
        var parts = type.url.split('/');
        var association = this.singularize(parts[0]);
        var parentRecord = record.get(association);
        parentRecordId = record.get("data.belongsTo." + association);

        if (parentRecord && !parentRecordId) {
          parentRecordId = parentRecord.get('id');
        }
      }
      return Ember.String.fmt(type.url, [coerceId(parentRecordId)]);
    }
    
    return this.resourceForType(type);
  },

  ajax: function(url, type, hash) {
    hash.url = url;
    hash.type = type;
    hash.async = false;
    hash.dataType = 'json';
    hash.contentType = 'application/json; charset=utf-8';
    hash.context = this;

    if (hash.data && type !== 'GET') {
      hash.data = JSON.stringify(hash.data);
    }

    jQuery.ajax(hash);
  },

  sideload: function(store, type, json, root) {
    var sideloadedType, mappings, loaded = {};

    loaded[root] = true;

    for (var prop in json) {
      if (!json.hasOwnProperty(prop)) { continue; }
      if (prop === root) { continue; }
      if (prop === get(this, 'meta')) { continue; }

      sideloadedType = type.typeForAssociation(prop);

      if (!sideloadedType) {
        mappings = get(this, 'mappings');
        Ember.assert("Your server returned a hash with the key " + prop + " but you have no mappings", !!mappings);

        sideloadedType = get(mappings, prop);

        if (typeof sideloadedType === 'string') {
          sideloadedType = get(window, sideloadedType);
        }

        Ember.assert("Your server returned a hash with the key " + prop + " but you have no mapping for it", !!sideloadedType);
      }

      this.sideloadAssociations(store, sideloadedType, json, prop, loaded);
    }
  },

  sideloadAssociations: function(store, type, json, prop, loaded) {
    loaded[prop] = true;

    get(type, 'associationsByName').forEach(function(key, meta) {
      key = meta.key || key;
      if (meta.kind === 'belongsTo') {
        key = this.pluralize(key);
      }
      if (json[key] && !loaded[key]) {
        this.sideloadAssociations(store, meta.type, json, key, loaded);
      }
    }, this);

    this.loadValue(store, type, json[prop]);
  },

  loadValue: function(store, type, value) {
    if (value instanceof Array) {
      store.loadMany(type, value);
    } else {
      store.load(type, value);
    }
  },

  url: "",

  // TODO 
  buildURL: function(type, suffix, recordObject) {
    var url = [this.url];
    var record = this.urlForType(type, recordObject);
    
    Ember.assert("Namespace URL (" + this.namespace + ") must not start with slash", !this.namespace || this.namespace.toString().charAt(0) !== "/");
    Ember.assert("Record URL (" + record + ") must not start with slash", !record || record.toString().charAt(0) !== "/");
    Ember.assert("URL suffix (" + suffix + ") must not start with slash", !suffix || suffix.toString().charAt(0) !== "/");

    if (this.namespace !== undefined) {
      url.push(this.namespace);
    }

    var parts = record.split("/");
    var name = parts.pop();
    
    if (parts.length > 1) {
      url.push(parts.join("/"));
    }
    url.push(this.pluralize(name));
    if (suffix !== undefined) {
      url.push(suffix);
    }

    return url.join("/");
  },
  
  meta: 'meta',
  since: 'since',

  sinceQuery: function(since) {
    var query = {};
    query[get(this, 'since')] = since;
    return since ? query : null;
  },

  extractSince: function(json) {
    var meta = this.extractMeta(json);
    return meta[get(this, 'since')] || null;
  },

  extractMeta: function(json) {
    return json[get(this, 'meta')] || {};
  }
});