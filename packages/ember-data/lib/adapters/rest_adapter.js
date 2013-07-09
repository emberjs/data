require("ember-data/core");
require('ember-data/system/adapter');
require('ember-data/serializers/rest_serializer');
require('ember-data/system/error');

/**
  @module data
  @submodule data-adapters
*/

var get = Ember.get, set = Ember.set;

DS.rejectionHandler = function(reason) {
  Ember.Logger.assert([reason, reason.message, reason.stack]);

  throw reason;
};

DS.HttpResponse = function(xhr, textStatus, content) {
  this.status = xhr.status;
  this.textStatus = textStatus;
  this.content = content || xhr.responseText;
  this.header = function(header) {
    return xhr.getResponseHeader(header);
  };
  this.isSuccess = (xhr.status >= 200 && xhr.status < 400);
};

/**
  The REST adapter allows your store to communicate with an HTTP server by
  transmitting JSON via XHR. Most Ember.js apps that consume a JSON API
  should use the REST adapter.

  This adapter is designed around the idea that the JSON exchanged with
  the server should be conventional.

  ## JSON Structure

  The REST adapter expects the JSON returned from your server to follow
  these conventions.

  ### Object Root

  The JSON payload should be an object that contains the record inside a
  root property. For example, in response to a `GET` request for
  `/posts/1`, the JSON should look like this:

  ```js
  {
    "post": {
      title: "I'm Running to Reform the W3C's Tag",
      author: "Yehuda Katz"
    }
  }
  ```

  ### Conventional Names

  Attribute names in your JSON payload should be the underscored versions of
  the attributes in your Ember.js models.

  For example, if you have a `Person` model:

  ```js
  App.Person = DS.Model.extend({
    firstName: DS.attr('string'),
    lastName: DS.attr('string'),
    occupation: DS.attr('string')
  });
  ```

  The JSON returned should look like this:

  ```js
  {
    "person": {
      "first_name": "Barack",
      "last_name": "Obama",
      "occupation": "President"
    }
  }
  ```

  @class RESTAdapter
  @constructor
  @namespace DS
  @extends DS.Adapter
*/
DS.RESTAdapter = DS.Adapter.extend({
  namespace: null,
  bulkCommit: false,
  since: 'since',

  serializer: DS.RESTSerializer,

  shouldSave: function(record) {
    var reference = get(record, '_reference');

    return !reference.parent;
  },

  dirtyRecordsForRecordChange: function(dirtySet, record) {
    this._dirtyTree(dirtySet, record);
  },

  dirtyRecordsForHasManyChange: function(dirtySet, record, relationship) {
    var embeddedType = get(this, 'serializer').embeddedType(record.constructor, relationship.secondRecordName);

    if (embeddedType === 'always') {
      relationship.childReference.parent = relationship.parentReference;
      this._dirtyTree(dirtySet, record);
    }
  },

  _dirtyTree: function(dirtySet, record) {
    dirtySet.add(record);

    get(this, 'serializer').eachEmbeddedRecord(record, function(embeddedRecord, embeddedType) {
      if (embeddedType !== 'always') { return; }
      if (dirtySet.has(embeddedRecord)) { return; }
      this._dirtyTree(dirtySet, embeddedRecord);
    }, this);

    var reference = record.get('_reference');

    if (reference.parent) {
      var store = get(record, 'store');
      var parent = store.recordForReference(reference.parent);
      this._dirtyTree(dirtySet, parent);
    }
  },

  createRecord: function(store, type, record) {
    var root = this.rootForType(type);
    var adapter = this;
    var data = {};

    data[root] = this.serialize(record, { includeId: true });

    return this.request(type, this.buildURL(root), {
      method: "POST",
      data: data,
      success: function(payload) {
        this.didCreateRecord(store, type, record, payload);
      }
    });
  },

  createRecords: function(store, type, records) {
    var adapter = this;

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

    return this.request(type, this.buildURL(root), {
      method: "POST",
      data: data,
      success: function(payload) {
        this.didCreateRecords(store, type, records, payload);
      },
      error: function(response) {
        var error = this.extractError(response, type),
            thenable = Ember.RSVP.reject(error);
        records.forEach(function(record) {
          store.resolveWith(thenable, record);
        });
      }
    });
  },

  updateRecord: function(store, type, record) {
    var id, root, adapter, data;

    id = get(record, 'id');
    root = this.rootForType(type);
    adapter = this;

    data = {};
    data[root] = this.serialize(record);

    return this.request(type, this.buildURL(root, id, record), {
      method: "PUT",
      data: data,
      success: function(payload) {
        this.didUpdateRecord(store, type, record, payload);
      }
    });
  },

  updateRecords: function(store, type, records) {
    var root, plural, adapter, data;

    if (get(this, 'bulkCommit') === false) {
      return this._super(store, type, records);
    }

    root = this.rootForType(type);
    plural = this.pluralize(root);
    adapter = this;

    data = {};

    data[plural] = [];

    records.forEach(function(record) {
      data[plural].push(this.serialize(record, { includeId: true }));
    }, this);

    return this.request(type, this.buildURL(root, "bulk"), {
      method: "PUT",
      data: data,
      success: function(payload) {
        this.didUpdateRecords(store, type, records, payload);
      },
      error: function(response) {
        var error = this.extractError(response, type),
            thenable = Ember.RSVP.reject(error);
        records.forEach(function(record) {
          store.resolveWith(thenable, record);
        });
      }
    });
  },

  deleteRecord: function(store, type, record) {
    var id, root, adapter;

    id = get(record, 'id');
    root = this.rootForType(type);
    adapter = this;

    return this.request(type, this.buildURL(root, id, record), {
      method: "DELETE",
      success: function(payload) {
        this.didDeleteRecord(store, type, record, payload);
      }
    });
  },

  deleteRecords: function(store, type, records) {
    var root, plural, serializer, adapter, data;

    if (get(this, 'bulkCommit') === false) {
      return this._super(store, type, records);
    }

    root = this.rootForType(type);
    plural = this.pluralize(root);
    serializer = get(this, 'serializer');
    adapter = this;

    data = {};

    data[plural] = [];
    records.forEach(function(record) {
      data[plural].push(serializer.serializeId( get(record, 'id') ));
    });

    return this.request(type, this.buildURL(root, 'bulk'), {
      method: "DELETE",
      data: data,
      success: function(payload) {
        this.didDeleteRecords(store, type, records, payload);
      },
      error: function(response) {
        var error = this.extractError(response, type),
            thenable = Ember.RSVP.reject(error);
        records.forEach(function(record) {
          store.resolveWith(thenable, record);
        });
      }
    });
  },

  find: function(store, type, id) {
    var root = this.rootForType(type);

    return this.request(type, this.buildURL(root, id), {
      method: "GET",
      success: function(payload) {
        this.didFindRecord(store, type, payload, id);
      }
    });
  },

  findAll: function(store, type, since) {
    var root = this.rootForType(type);

    return this.request(type, this.buildURL(root), {
      method: "GET",
      data: this.sinceQuery(since),
      success: function(payload) {
        this.didFindAll(store, type, payload);
      }
    });
  },

  findQuery: function(store, type, query, recordArray) {
    var root = this.rootForType(type);

    return this.request(type, this.buildURL(root), {
      method: "GET",
      data: query,
      success: function(payload) {
        this.didFindQuery(store, type, payload, recordArray);
      }
    });
  },

  findMany: function(store, type, ids, owner) {
    var root = this.rootForType(type);

    ids = this.serializeIds(ids);

    return this.request(type, this.buildURL(root), {
      method: "GET",
      data: {ids: ids},
      success: function(payload) {
        this.didFindMany(store, type, payload);
      }
    });
  },

  /**
    @private

    This method serializes a list of IDs using `serializeId`

    @return {Array} an array of serialized IDs
  */
  serializeIds: function(ids) {
    var serializer = get(this, 'serializer');

    return Ember.EnumerableUtils.map(ids, function(id) {
      return serializer.serializeId(id);
    });
  },

  didError: function(response, type) {
    if (response.status === 422) {
      return this.didValidationError(response, type);
    } else {
      return this.didAdapterError(response, type);
    }
  },

  didAdapterError: function(response, type) {
    switch (response.textStatus) {
    case 'timeout':
      return new DS.TimeoutError(response.textStatus);
    case 'abort':
      return new DS.AbortError(response.textStatus);
    case 'parsererror':
      return new DS.ParserError(response.textStatus);
    default:
      switch (response.status) {
      case 401:
        return new DS.UnauthorizedError(response.content);
      case 403:
        return new DS.ForbiddenError(response.content);
      case 404:
        return new DS.NotFoundError(response.content);
      default:
        return new DS.AdapterError(response.content);
      }
    }
  },

  didValidationError: function(response, type) {
    var json = JSON.parse(response.content),
        serializer = get(this, 'serializer'),
        errors = serializer.extractValidationErrors(type, json),
        error = new DS.AdapterValidationError(errors);

    return error;
  },

  responseHandler: function(response, success, error) {
    if (response.isSuccess) {
      success.call(this, response.content);
    } else {
      throw error.call(this, response);
    }
  },

  request: function(type, url, options) {
    var adapter = this,
        success = options.success,
        error = options.error,
        method = options.method;

    error = error || function(response) {
      return this.didError(response, type);
    };

    delete options.success;
    delete options.error;
    delete options.method;

    return this.ajax(url, method, options)
      .then(function(response) {
        adapter.responseHandler(response, success, error);
      }, function(response) {
        throw error.call(adapter, response);
      })
      .then(null, DS.rejectionHandler);
  },

  ajax: function(url, method, options) {
    return new Ember.RSVP.Promise(function(resolve, reject) {
      options = options || {};
      options.url = url;
      options.type = method;
      options.dataType = 'json';

      if (options.data && method !== 'GET') {
        options.contentType = 'application/json; charset=utf-8';
        options.data = JSON.stringify(options.data);
      }

      options.success = function(json, textStatus, jqXHR) {
        var response = new DS.HttpResponse(jqXHR, textStatus, json);

        Ember.run(null, resolve, response);
      };

      options.error = function(jqXHR, textStatus, errorThrown) {
        var response = new DS.HttpResponse(jqXHR, textStatus);

        if (textStatus !== 'error' || response.status >= 500) {
          Ember.run(null, reject, response);
        } else {
          Ember.run(null, resolve, response);
        }
      };

      Ember.$.ajax(options);
    });
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

  buildURL: function(root, suffix, record) {
    var url = [this.url];

    Ember.assert("Namespace URL (" + this.namespace + ") must not start with slash", !this.namespace || this.namespace.toString().charAt(0) !== "/");
    Ember.assert("Root URL (" + root + ") must not start with slash", !root || root.toString().charAt(0) !== "/");
    Ember.assert("URL suffix (" + suffix + ") must not start with slash", !suffix || suffix.toString().charAt(0) !== "/");

    if (!Ember.isNone(this.namespace)) {
      url.push(this.namespace);
    }

    url.push(this.pluralize(root));
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
