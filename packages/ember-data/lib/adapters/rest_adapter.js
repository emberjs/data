require("ember-data/core");
require('ember-data/system/adapter');
require('ember-data/serializers/rest_serializer');

/**
  @module ember-data
*/

var get = Ember.get, set = Ember.set;

DS.rejectionHandler = function(reason) {
  Ember.Logger.assert([reason, reason.message, reason.stack]);

  throw reason;
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

  ## Customization

  ### Endpoint path customization

  Endpoint paths can be prefixed with a `namespace` by setting the namespace
  property on the adapter:

  ```js
  DS.RESTAdapter.reopen({
    namespace: 'api/1'
  });
  ```
  Requests for `App.Person` would now target `/api/1/people/1`.

  ### Host customization

  An adapter can target other hosts by setting the `url` property.

  ```js
  DS.RESTAdapter.reopen({
    url: 'https://api.example.com'
  });
  ```

  ### Headers customization

  Some APIs require HTTP headers, eg to provide an API key. An array of
  headers can be added to the adapter which are passed with every request:

  ```js
  DS.RESTAdapter.reopen({
    headers: {
      "API_KEY": "secret key",
      "ANOTHER_HEADER": "asdsada"
    }
  });
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

  /**
    Called on each record before saving. If false is returned, the record
    will not be saved.

    By default, this method returns `true` except when the record is embedded.

    @method   shouldSave
    @property {DS.Model} record
    @return   {Boolean}  `true` to save, `false` to not. Defaults to true.
  */
  shouldSave: function(record) {
    var reference = get(record, '_reference');

    return !reference.parent;
  },

  /**
    @method dirtyRecordsForRecordChange
    @param {Ember.OrderedSet} dirtySet
    @param {DS.Model} record
  */
  dirtyRecordsForRecordChange: function(dirtySet, record) {
    this._dirtyTree(dirtySet, record);
  },

  /**
    @method dirtyRecordsForHasManyChange
    @param {Ember.OrderedSet} dirtySet
    @param {DS.Model} record
    @param {DS.RelationshipChange} relationship
  */
  dirtyRecordsForHasManyChange: function(dirtySet, record, relationship) {
    var embeddedType = get(this, 'serializer').embeddedType(record.constructor, relationship.secondRecordName);

    if (embeddedType === 'always') {
      relationship.childReference.parent = relationship.parentReference;
      this._dirtyTree(dirtySet, record);
    }
  },

  /**
    @method _dirtyTree
    @private
    @param {Ember.OrderedSet} dirtySet
    @param {DS.Model} record
  */
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

  /**
    Serializes the record and sends it to the server.

    By default, the record is serialized with the adapter's `serialize`
    method and assigned to a root obtained by the `rootForType` method.

    The url is created with `buildURL` and then called as a 'POST' request
    with the adapter's `ajax` method.

    If successful, the adapter's `didCreateRecord` method is called,
    otherwise `didError`

    @method createRecord
    @property {DS.Store} store
    @property {DS.Model} type   the DS.Model class of the record
    @property {DS.Model} record
  */
  createRecord: function(store, type, record) {
    var root = this.rootForType(type);
    var adapter = this;
    var data = {};

    data[root] = this.serialize(record, { includeId: true });

    return this.ajax(this.buildURL(root), "POST", {
      data: data
    }).then(function(json){
      adapter.didCreateRecord(store, type, record, json);
    }, function(xhr) {
      adapter.didError(store, type, record, xhr);
      throw xhr;
    }).then(null, DS.rejectionHandler);
  },

  /**
    @method createRecords
    @param  store
    @param  type
    @param  records
  */
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

    return this.ajax(this.buildURL(root), "POST", {
      data: data
    }).then(function(json) {
      adapter.didCreateRecords(store, type, records, json);
    }).then(null, DS.rejectionHandler);
  },

  /**
    @method updateRecord
    @param  store
    @param  type
    @param  record
  */
  updateRecord: function(store, type, record) {
    var id, root, adapter, data;

    id = get(record, 'id');
    root = this.rootForType(type);
    adapter = this;

    data = {};
    data[root] = this.serialize(record);

    return this.ajax(this.buildURL(root, id, record), "PUT",{
      data: data
    }).then(function(json){
      adapter.didUpdateRecord(store, type, record, json);
    }, function(xhr) {
      adapter.didError(store, type, record, xhr);
      throw xhr;
    }).then(null, DS.rejectionHandler);
  },

  /**
    @method updateRecords
    @param  store
    @param  type
    @param  records
  */
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

    return this.ajax(this.buildURL(root, "bulk"), "PUT", {
      data: data
    }).then(function(json) {
      adapter.didUpdateRecords(store, type, records, json);
    }).then(null, DS.rejectionHandler);
  },

  /**
    @method deleteRecord
    @param  store
    @param  type
    @param  record
  */
  deleteRecord: function(store, type, record) {
    var id, root, adapter;

    id = get(record, 'id');
    root = this.rootForType(type);
    adapter = this;

    return this.ajax(this.buildURL(root, id, record), "DELETE").then(function(json){
      adapter.didDeleteRecord(store, type, record, json);
    }, function(xhr){
      adapter.didError(store, type, record, xhr);
      throw xhr;
    }).then(null, DS.rejectionHandler);
  },

  /**
    @method deleteRecords
    @param  store
    @param  type
    @param  records
  */
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

    return this.ajax(this.buildURL(root, 'bulk'), "DELETE", {
      data: data
    }).then(function(json){
      adapter.didDeleteRecords(store, type, records, json);
    }).then(null, DS.rejectionHandler);
  },

  /**
    @method find
    @param  store
    @param  type
    @param  id
  */
  find: function(store, type, id) {
    var root = this.rootForType(type), adapter = this;

    return this.ajax(this.buildURL(root, id), "GET").
      then(function(json){
        adapter.didFindRecord(store, type, json, id);
    }).then(null, DS.rejectionHandler);
  },

  /**
    @method findAll
    @param  store
    @param  type
    @param  since
  */
  findAll: function(store, type, since) {
    var root, adapter;

    root = this.rootForType(type);
    adapter = this;

    return this.ajax(this.buildURL(root), "GET",{
      data: this.sinceQuery(since)
    }).then(function(json) {
      adapter.didFindAll(store, type, json);
    }).then(null, DS.rejectionHandler);
  },

  /**
    @method findQuery
    @param  store
    @param  type
    @param  query
    @param  recordArray
  */
  findQuery: function(store, type, query, recordArray) {
    var root = this.rootForType(type),
        adapter = this;

    return this.ajax(this.buildURL(root), "GET", {
      data: query
    }).then(function(json){
      adapter.didFindQuery(store, type, json, recordArray);
    }).then(null, DS.rejectionHandler);
  },

  /**
    @method findMany
    @param  store
    @param  type
    @param  ids
    @param  owner
  */
  findMany: function(store, type, ids, owner) {
    var root = this.rootForType(type),
    adapter = this;

    ids = this.serializeIds(ids);

    return this.ajax(this.buildURL(root), "GET", {
      data: {ids: ids}
    }).then(function(json) {
      adapter.didFindMany(store, type, json);
    }).then(null, DS.rejectionHandler);
  },

  /**
    This method serializes a list of IDs using `serializeId`

    @method serializeIds
    @private
    @param  ids
    @return {Array} an array of serialized IDs
  */
  serializeIds: function(ids) {
    var serializer = get(this, 'serializer');

    return Ember.EnumerableUtils.map(ids, function(id) {
      return serializer.serializeId(id);
    });
  },

  /**
    @method didError
    @private
    @param  store
    @param  type
    @param  record
    @param  xhr
  */
  didError: function(store, type, record, xhr) {
    if (xhr.status === 422) {
      var json = JSON.parse(xhr.responseText),
          serializer = get(this, 'serializer'),
          errors = serializer.extractValidationErrors(type, json);

      store.recordWasInvalid(record, errors);
    } else {
      this._super.apply(this, arguments);
    }
  },

  /**
    @method ajax
    @private
    @param  url
    @param  type
    @param  hash
  */
  ajax: function(url, type, hash) {
    var adapter = this;

    return new Ember.RSVP.Promise(function(resolve, reject) {
      hash = hash || {};
      hash.url = url;
      hash.type = type;
      hash.dataType = 'json';
      hash.context = adapter;

      if (hash.data && type !== 'GET') {
        hash.contentType = 'application/json; charset=utf-8';
        hash.data = JSON.stringify(hash.data);
      }

      if (adapter.headers !== undefined) {
        var headers = adapter.headers;
        hash.beforeSend = function (xhr) {
          Ember.keys(headers).forEach(function(key) {
            xhr.setRequestHeader(key, headers[key]);
          });
        };
      }

      hash.success = function(json) {
        Ember.run(null, resolve, json);
      };

      hash.error = function(jqXHR, textStatus, errorThrown) {
        if (jqXHR) {
          jqXHR.then = null;
        }

        Ember.run(null, reject, jqXHR);
      };

      Ember.$.ajax(hash);
    });
  },

  /**
    @property url
    @default ''
  */
  url: "",

  /**
    @method rootForType
    @private
    @param type
  */
  rootForType: function(type) {
    var serializer = get(this, 'serializer');
    return serializer.rootForType(type);
  },

  /**
    @method pluralize
    @private
    @param string
  */
  pluralize: function(string) {
    var serializer = get(this, 'serializer');
    return serializer.pluralize(string);
  },

  /**
    @method buildURL
    @private
    @param root
    @param suffix
    @param record
  */
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

  /**
    @method sinceQuery
    @private
    @param since
  */
  sinceQuery: function(since) {
    var query = {};
    query[get(this, 'since')] = since;
    return since ? query : null;
  }
});
