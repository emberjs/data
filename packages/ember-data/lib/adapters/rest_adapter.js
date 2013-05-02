require("ember-data/core");
require('ember-data/system/adapter');
require('ember-data/serializers/rest_serializer');
/*global jQuery*/

/**
  @module data
  @submodule data-adapters
*/

var get = Ember.get, set = Ember.set;

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

  init: function() {
    this._super.apply(this, arguments);
  },

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

    return this.ajax(this.buildURL(root), "POST", {
      data: data
    }).then(function(json){
      Ember.run(adapter, 'didCreateRecord', store, type, record, json);
    }, function(xhr) {
      adapter.didError(store, type, record, xhr);
      throw xhr;
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

    return this.ajax(this.buildURL(root), "POST", {
      data: data
    }).then(function(json) {
      Ember.run(adapter, 'didCreateRecords', store, type, records, json);
    });
  },

  updateRecord: function(store, type, record) {
    var id, root, adapter, data;

    id = get(record, 'id');
    root = this.rootForType(type);
    adapter = this;

    data = {};
    data[root] = this.serialize(record);

    return this.ajax(this.buildURL(root, id), "PUT",{
      data: data
    }).then(function(json){
      Ember.run(adapter, 'didUpdateRecord', store, type, record, json);
    }, function(xhr) {
      adapter.didError(store, type, record, xhr);
      throw xhr;
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

    return this.ajax(this.buildURL(root, "bulk"), "PUT", {
      data: data
    }).then(function(json) {
      Ember.run(adapter, 'didUpdateRecords', store, type, records, json);
    });
  },

  deleteRecord: function(store, type, record) {
    var id, root, adapter;

    id = get(record, 'id');
    root = this.rootForType(type);
    adapter = this;

    return this.ajax(this.buildURL(root, id), "DELETE").then(function(json){
      Ember.run(adapter, 'didDeleteRecord', store, type, record, json);
    }, function(xhr){
      adapter.didError(store, type, record, xhr);
      throw xhr;
    });
  },

  deleteRecords: function(store, type, records) {
    var root, plural, serializer, adapter, data;

    if (get(this, 'bulkCommit') === false) {
      return this._super(store, type, records);
    }

    root = this.rootForType(type),
    plural = this.pluralize(root),
    serializer = get(this, 'serializer'),
    adapter = this;

    data = {};

    data[plural] = [];
    records.forEach(function(record) {
      data[plural].push(serializer.serializeId( get(record, 'id') ));
    });

    return this.ajax(this.buildURL(root, 'bulk'), "DELETE", { data: data }).then(function(json){
      Ember.run(adapter, 'didDeleteRecords', store, type, records, json);
    });
  },

  find: function(store, type, id) {
    var root = this.rootForType(type), adapter = this;

    return this.ajax(this.buildURL(root, id), "GET").then(function(json){
      return Ember.run(adapter,'didFindRecord', store, type, json, id);
    });
  },

  findAll: function(store, type, since) {
    var root, adapter;

    root = this.rootForType(type);
    adapter = this;

    return this.ajax(this.buildURL(root), "GET",{
      data: this.sinceQuery(since)
    }).then(function(json) {
      Ember.run(adapter,'didFindAll', store, type, json);
    });
  },

  findQuery: function(store, type, query, recordArray) {
    var root = this.rootForType(type),
    adapter = this;

    return this.ajax(this.buildURL(root), "GET", {
      data: query
    }).then(function(json){
      Ember.run(adapter, function(){
        this.didFindQuery(store, type, json, recordArray);
      });
    });
  },

  findMany: function(store, type, ids, owner) {
    var root = this.rootForType(type),
    adapter = this;

    ids = this.serializeIds(ids);

    return this.ajax(this.buildURL(root), "GET", {
      data: {ids: ids}
    }).then(function(json) {
      return Ember.run(adapter,'didFindMany', store, type, json);
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

  ajax: function(url, type, hash) {
    try {
      hash = hash || {};
      hash.url = url;
      hash.type = type;
      hash.dataType = 'json';
      hash.context = this;

      if (hash.data && type !== 'GET') {
        hash.contentType = 'application/json; charset=utf-8';
        hash.data = JSON.stringify(hash.data);
      }

      return Ember.RSVP.resolve(jQuery.ajax(hash));
    } catch (error) {
      return Ember.RSVP.reject(error);
    }
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

    if (!Ember.isNone(this.namespace)) {
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
