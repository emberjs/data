require("ember-data/core");
require('ember-data/system/adapter');
require('ember-data/serializers/rest_serializer');
/*global jQuery*/

var get = Ember.get, set = Ember.set;

DS.RESTAdapter = DS.Adapter.extend({
  bulkCommit: false,

  serializer: DS.RESTSerializer,

  createRecord: function(store, type, record) {
    var root = this.rootForType(type);

    var data = this.serialize(record, { includeId: true });

    this.ajax(this.buildURL(root), "POST", {
      data: this.buildMessage(type, data),
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

  didCreateRecord: function(store, type, record, json) {
    var root = this.rootForType(type);

    this.sideload(store, type, json, root);
    this.didSaveRecord(store, record, this.getMessageContent(type, json));
  },

  createRecords: function(store, type, records) {
    if (get(this, 'bulkCommit') === false) {
      return this._super(store, type, records);
    }

    var root = this.rootForType(type);
    var plural = this.pluralize(root);

    var data = [];
    records.forEach(function(record) {
      data.push(this.serialize(record, { includeId: true }));
    }, this);

    this.ajax(this.buildURL(root), "POST", {
      data: this.buildMessage(type, data, true),
      context: this,
      success: function(json) {
        Ember.run(this, function(){
          this.didCreateRecords(store, type, records, json);
        });
      }
    });
  },

  didCreateRecords: function(store, type, records, json) {
    var root = this.pluralize(this.rootForType(type));

    this.sideload(store, type, json, root);
    this.didSaveRecords(store, records, this.getMessageContent(type, json, true));
  },

  updateRecord: function(store, type, record) {
    var id = get(record, 'id');
    var root = this.rootForType(type);

    var data = this.serialize(record, { includeId: true });

    this.ajax(this.buildURL(root, id), "PUT", {
      data: this.buildMessage(type, data),
      context: this,
      success: function(json) {
        Ember.run(this, function(){
          this.didUpdateRecord(store, type, record, json);
        });
      },
      error: function(xhr) {
        this.didError(store, type, record, xhr);
      }
    });
  },

  didUpdateRecord: function(store, type, record, json) {
    var root = this.rootForType(type);

    this.sideload(store, type, json, root);
    this.didSaveRecord(store, record, json && this.getMessageContent(type, json));
  },

  updateRecords: function(store, type, records) {
    if (get(this, 'bulkCommit') === false) {
      return this._super(store, type, records);
    }

    var root = this.rootForType(type);

    var data = [];
    records.forEach(function(record) {
      data.push(this.serialize(record, { includeId: true }));
    }, this);

    this.ajax(this.buildURL(root, "bulk"), "PUT", {
      data: this.buildMessage(type, data, true),
      context: this,
      success: function(json) {
        Ember.run(this, function(){
          this.didUpdateRecords(store, type, records, json);
        });
      }
    });
  },

  didUpdateRecords: function(store, type, records, json) {
    var root = this.pluralize(this.rootForType(type));

    this.sideload(store, type, json, root);
    this.didSaveRecords(store, records, this.getMessageContent(type, json, true));
  },

  deleteRecord: function(store, type, record) {
    var id = get(record, 'id');
    var root = this.rootForType(type);

    this.ajax(this.buildURL(root, id), "DELETE", {
      context: this,
      success: function(json) {
        Ember.run(this, function(){
          this.didDeleteRecord(store, type, record, json);
        });
      }
    });
  },

  didDeleteRecord: function(store, type, record, json) {
    if (json) { this.sideload(store, type, json); }
    this.didSaveRecord(store, record);
  },

  deleteRecords: function(store, type, records) {
    if (get(this, 'bulkCommit') === false) {
      return this._super(store, type, records);
    }

    var root = this.rootForType(type),
        serializer = get(this, 'serializer');

    var data = [];
    records.forEach(function(record) {
      data.push(serializer.serializeId( get(record, 'id') ));
    });

    this.ajax(this.buildURL(root, 'bulk'), "DELETE", {
      data: this.buildMessage(type, data, true),
      context: this,
      success: function(json) {
        Ember.run(this, function(){
          this.didDeleteRecords(store, type, records, json);
        });
      }
    });
  },

  didDeleteRecords: function(store, type, records, json) {
    if (json) { this.sideload(store, type, json); }
    this.didSaveRecords(store, records);
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
    var root = this.rootForType(type);

    this.sideload(store, type, json, root);
    store.load(type, id, this.getMessageContent(type, json));
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
    var root = this.pluralize(this.rootForType(type)),
        since = this.extractSince(json);

    this.sideload(store, type, json, root);
    store.loadMany(type, this.getMessageContent(type, json, true));

    // this registers the id with the store, so it will be passed
    // into the next call to `findAll`
    if (since) { store.sinceForType(type, since); }

    store.didUpdateAll(type);
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
    var root = this.pluralize(this.rootForType(type));

    this.sideload(store, type, json, root);
    recordArray.load(this.getMessageContent(type, json, true));
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
    var root = this.pluralize(this.rootForType(type));

    this.sideload(store, type, json, root);
    store.loadMany(type, this.getMessageContent(type, json, true));
  },

  didError: function(store, type, record, xhr) {
    if (xhr.status === 422) {
      var data = JSON.parse(xhr.responseText);
      store.recordWasInvalid(record, data['errors']);
    } else {
      store.recordWasError(record);
    }
  },

  // HELPERS

  plurals: {},

  // define a plurals hash in your subclass to define
  // special-case pluralization
  pluralize: function(name) {
    return this.plurals[name] || name + "s";
  },

  rootForType: function(type, plural) {
    // use the last part of the name as the URL
    var parts = type.toString().split(".");
    var name = parts[parts.length - 1];
    var root = name.replace(/([A-Z])/g, '_$1').toLowerCase().slice(1);
    if (plural === true)
      root = this.pluralize(root);
    return root;
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

  buildMessage: function(type, content, plural) {
    var data = {};
    data[this.rootForType(type, plural)] = content;
    return data;
  },

  getMessageContent: function(type, message, plural) {
    return message[this.rootForType(type, plural)];
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

