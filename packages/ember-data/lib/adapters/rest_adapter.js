var get = Ember.get, set = Ember.set, getPath = Ember.getPath;

DS.RESTAdapter = DS.Adapter.extend({
  createRecord: function(store, type, model) {
    var root = this.rootForType(type);

    var key = this.jsonKeyForType(type);

    var data = {};
    data[key] = get(model, 'data');

    this.ajax("/" + this.pluralize(root), "POST", {
      data: data,
      success: function(json) {
        store.didCreateRecord(model, json[key]);
      }
    });
  },

  createRecords: function(store, type, models) {
    if (get(this, 'bulkCommit') === false) {
      return this._super(store, type, models);
    }

    var root = this.rootForType(type),
        plural = this.pluralize(root);

    var key = this.pluralize(this.jsonKeyForType(type));
    
    var data = {};
    data[key] = models.map(function(model) {
      return get(model, 'data');
    });

    this.ajax("/" + this.pluralize(root), "POST", {
      data: data,
      success: function(json) {
        store.didCreateRecords(type, models, json[key]);
      }
    });
  },

  updateRecord: function(store, type, model) {
    var id = get(model, 'id');
    var root = this.rootForType(type);
    var key = this.jsonKeyForType(type);

    var data = {};
    data[key] = get(model, 'data');

    var url = ["", this.pluralize(root), id].join("/");

    this.ajax(url, "PUT", {
      data: data,
      success: function(json) {
        store.didUpdateRecord(model, json[key]);
      }
    });
  },

  updateRecords: function(store, type, models) {
    if (get(this, 'bulkCommit') === false) {
      return this._super(store, type, models);
    }

    var root = this.rootForType(type),
        plural = this.pluralize(root)

    var key = this.pluralize(this.jsonKeyForType(type));

    var data = {};
    data[key] = models.map(function(model) {
      return get(model, 'data');
    });

    this.ajax("/" + plural, "POST", {
      data: data,
      success: function(json) {
        store.didUpdateRecords(models, json[key]);
      }
    });
  },

  deleteRecord: function(store, type, model) {
    var id = get(model, 'id');
    var root = this.rootForType(type);

    var url = ["", this.pluralize(root), id].join("/");

    this.ajax(url, "DELETE", {
      success: function(json) {
        store.didDeleteRecord(model);
      }
    });
  },

  deleteRecords: function(store, type, models) {
    if (get(this, 'bulkCommit') === false) {
      return this._super(store, type, models);
    }

    var root = this.rootForType(type),
        plural = this.pluralize(root),
        primaryKey = getPath(type, 'proto.primaryKey');
        key = this.pluralize(this.jsonKeyForType(type));

    var data = {};
    data[key] = models.map(function(model) {
      return get(model, primaryKey);
    });

    this.ajax("/" + plural + "/delete", "POST", {
      data: data,
      success: function(json) {
        store.didDeleteRecords(models);
      }
    });
  },

  find: function(store, type, id) {
    var root = this.rootForType(type);
    var key = this.jsonKeyForType(type);

    var url = ["", this.pluralize(root), id].join("/");

    this.ajax(url, "GET", {
      success: function(json) {
        store.load(type, json[key]);
      }
    });
  },

  findMany: function(store, type, ids) {
    var root = this.rootForType(type), plural = this.pluralize(root);
    var key = this.pluralize(this.jsonKeyForType(type));

    var url = "/" + plural;
    
    this.ajax(url, "GET", {
      data: { ids: ids },
      success: function(json) {
        store.loadMany(type, ids, json[key]);
      }
    });
    
  },

  findAll: function(store, type) {
    var root = this.rootForType(type), plural = this.pluralize(root);
    var key = this.pluralize(this.jsonKeyForType(type));
    
    this.ajax("/" + plural, "GET", {
      success: function(json) {
        store.loadMany(type, json[key]);
      }
    });
  },

  findQuery: function(store, type, query, modelArray) {
    var root = this.rootForType(type), plural = this.pluralize(root);
    var key = this.pluralize(this.jsonKeyForType(type));

    this.ajax("/" + plural, "GET", {
      data: query,
      success: function(json) {
        modelArray.load(json[key]);
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
  
  nameForType: function(type) {
    var parts = type.toString().split(".");
    var name = parts[parts.length - 1];
    return Ember.String.decamelize(name);
  },

  rootForType: function(type) {
    return type.url || this.nameForType(type);
  },
  
  jsonKeyForType: function(type) {
    return type.jsonKey || this.nameForType(type);
  },

  ajax: function(url, type, hash) {
    hash.url = url;
    hash.type = type;
    hash.dataType = "json";

    jQuery.ajax(hash);
  }
});

