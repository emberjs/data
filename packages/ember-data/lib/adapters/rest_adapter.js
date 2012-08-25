require("ember-data/core");
require('ember-data/system/adapter');
/*global jQuery*/

var get = Ember.get, set = Ember.set;

DS.RESTSerializer = DS.Serializer.create({
  keyForBelongsTo: function(type, name) {
    return this.keyForAttributeName(type, name) + "_id";
  },

  keyForAttributeName: function(type, name) {
    return Ember.String.decamelize(name);
  },

  attributeNameForKey: function(type, key) {
    if (!this._attributeNamesByKey) {
      this._attributeNamesByKey = {};

      get(type, 'attributes').forEach(function(name) {
        this._attributeNamesByKey[this._keyForAttributeName(type, name)] = name;
      }, this);
    }

    return this._attributeNamesByKey[key];
  },

  materializeError: function(record, jqXHR) {
    var errorMessage = this._parseResponseText(jqXHR)['error'] || jqXHR.textStatus;

    return DS.ServerError.create({
      code: jqXHR.status,
      message: errorMessage,
      isFatal: this.errorIsFatal(record, jqXHR)
    });
  },

  materializeValidationErrors: function(record, jqXHR) {
    var errorsHash = this._parseResponseText(jqXHR)['errors'],
        key, attribute, errors = [],
        serializer = get(this, 'serializer');

    for (key in errorsHash) {
      if (errorsHash.hasOwnProperty(key)) {
        attribute = this.attributeNameForKey(record.constructor, key);
        if (attribute) {
          errors.push(DS.ServerValidationError.create({
            message: errorsHash[key],
            attribute: attribute
          }));
        }
      }
    }

    return errors;
  },

  errorIsFatal: function(record, jqXHR) {
    return jqXHR.status === 403;
  },

  _parseResponseText: function(jqXHR) {
    var data = {};
    if (jqXHR.responseJSON) {
      data = jqXHR.responseJSON;
    } else {
      try { data = JSON.parse(jqXHR.responseText); } catch (e) {}
      jqXHR.responseJSON = data;
    }
    return data;
  }
});

DS.RESTAdapter = DS.Adapter.extend({
  bulkCommit: false,

  serializer: DS.RESTSerializer,

  shouldCommit: function(record) {
    if (record.isCommittingBecause('attribute') || record.isCommittingBecause('belongsTo')) {
      return true;
    }
  },

  createRecord: function(store, type, record) {
    var root = this.rootForType(type);

    var data = {};
    data[root] = this.toJSON(record, { includeId: true });

    this.ajax(this.buildURL(root), "POST", {
      data: data,
      success: function(json) {
        this.didCreateRecord(store, type, record, json);
      },
      error: function(jqXHR) {
        this.handleError(store, [record], jqXHR);
      }
    });
  },

  didCreateRecord: function(store, type, record, json) {
    var root = this.rootForType(type);

    this.sideload(store, type, json, root);
    store.didSaveRecord(record, json[root]);
  },

  createRecords: function(store, type, records) {
    if (get(this, 'bulkCommit') === false) {
      return this._super(store, type, records);
    }

    var root = this.rootForType(type),
        plural = this.pluralize(root);

    var data = {};
    data[plural] = records.map(function(record) {
      return this.toJSON(record, { includeId: true });
    }, this);

    this.ajax(this.buildURL(root), "POST", {
      data: data,
      success: function(json) {
        this.didCreateRecords(store, type, records, json);
      },
      error: function(jqXHR) {
        this.handleError(store, records, jqXHR);
      }
    });
  },

  didCreateRecords: function(store, type, records, json) {
    var root = this.pluralize(this.rootForType(type));

    this.sideload(store, type, json, root);
    store.didSaveRecords(records, json[root]);
  },

  updateRecord: function(store, type, record) {
    var id = get(record, 'id');
    var root = this.rootForType(type);

    var data = {};
    data[root] = this.toJSON(record);

    this.ajax(this.buildURL(root, id), "PUT", {
      data: data,
      success: function(json) {
        this.didUpdateRecord(store, type, record, json);
      },
      error: function(jqXHR) {
        this.handleError(store, [record], jqXHR);
      }
    });
  },

  didUpdateRecord: function(store, type, record, json) {
    var root = this.rootForType(type);

    this.sideload(store, type, json, root);
    store.didSaveRecord(record, json && json[root]);
  },

  updateRecords: function(store, type, records) {
    if (get(this, 'bulkCommit') === false) {
      return this._super(store, type, records);
    }

    var root = this.rootForType(type),
        plural = this.pluralize(root);

    var data = {};
    data[plural] = records.map(this.toJSON, this);

    this.ajax(this.buildURL(root, "bulk"), "PUT", {
      data: data,
      success: function(json) {
        this.didUpdateRecords(store, type, records, json);
      },
      error: function(jqXHR) {
        this.handleError(store, records, jqXHR);
      }
    });
  },

  didUpdateRecords: function(store, type, records, json) {
    var root = this.pluralize(this.rootForType(type));

    this.sideload(store, type, json, root);
    store.didSaveRecords(records, json[root]);
  },

  deleteRecord: function(store, type, record) {
    var id = get(record, 'id');
    var root = this.rootForType(type);

    this.ajax(this.buildURL(root, id), "DELETE", {
      success: function(json) {
        this.didDeleteRecord(store, type, record, json);
      },
      error: function(jqXHR) {
        this.handleError(store, [record], jqXHR);
      }
    });
  },

  didDeleteRecord: function(store, type, record, json) {
    if (json) { this.sideload(store, type, json); }
    store.didSaveRecord(record);
  },

  deleteRecords: function(store, type, records) {
    if (get(this, 'bulkCommit') === false) {
      return this._super(store, type, records);
    }

    var root = this.rootForType(type),
        plural = this.pluralize(root);

    var data = {};
    data[plural] = records.map(function(record) {
      return get(record, 'id');
    });

    this.ajax(this.buildURL(root, 'bulk'), "DELETE", {
      data: data,
      success: function(json) {
        this.didDeleteRecords(store, type, records, json);
      },
      error: function(jqXHR) {
        this.handleError(store, records, jqXHR);
      }
    });
  },

  didDeleteRecords: function(store, type, records, json) {
    if (json) { this.sideload(store, type, json); }
    store.didSaveRecords(records);
  },

  find: function(store, type, id, record) {
    var root = this.rootForType(type);

    this.ajax(this.buildURL(root, id), "GET", {
      success: function(json) {
        this.sideload(store, type, json, root);
        store.load(type, json[root]);
      },
      error: function(jqXHR) {
        this.handleError(store, [record], jqXHR);
      }
    });
  },

  findMany: function(store, type, ids, recordArray) {
    this.findQuery(store, type, {ids: ids}, recordArray);
  },

  findQuery: function(store, type, query, recordArray) {
    var root = this.rootForType(type), plural = this.pluralize(root);

    this.ajax(this.buildURL(root), "GET", {
      data: query,
      success: function(json) {
        this.sideload(store, type, json, plural);
        recordArray.load(json[plural]);
      },
      error: function(jqXHR) {
        this.handleError(store, recordArray, jqXHR);
      }
    });
  },

  // HELPERS

  plurals: {},

  // define a plurals hash in your subclass to define
  // special-case pluralization
  pluralize: function(name) {
    return this.plurals[name] || name + "s";
  },

  rootForType: function(type) {
    if (type.url) { return type.url; }

    // use the last part of the name as the URL
    var parts = type.toString().split(".");
    var name = parts[parts.length - 1];
    return name.replace(/([A-Z])/g, '_$1').toLowerCase().slice(1);
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

  buildURL: function(record, suffix) {
    var url = [""];

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

  handleError: function(store, records, jqXHR) {
    var error, serializer = get(this, 'serializer');

    if (jqXHR.status === 422) {
      records.forEach(function(record) {
        error = serializer.materializeValidationErrors(record, jqXHR);

        store.recordWasInvalid(record, error);
      });
    } else {
      error = serializer.materializeError(records, jqXHR);

      if (DS.RecordArray.detectInstance(records)) {
        store.recordArrayDidError(records, error);
      } else {
        records.forEach(function(record) {
          store.recordDidError(record, error);
        });
      }
    }
  }
});

