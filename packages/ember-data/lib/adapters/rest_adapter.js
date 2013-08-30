require("ember-data/core");
require('ember-data/system/adapter');

/**
  @module ember-data
*/

var get = Ember.get, set = Ember.set;

DS.rejectionHandler = function(reason) {
  Ember.Logger.assert([reason, reason.message, reason.stack]);

  throw reason;
};

function coerceId(id) {
  return id == null ? null : id+'';
}

DS.RESTSerializer = DS.JSONSerializer.extend({
  normalize: function(type, hash, requestType) {
    this.normalizeId(hash, requestType);
    this.normalizeAttributes(hash, requestType);
    return hash;
  },

  normalizeId: function(hash, requestType) {
    var primaryKey = get(this, 'primaryKey');

    if (primaryKey === 'id') { return; }

    hash.id = hash[primaryKey];
    delete hash[primaryKey];
  },

  normalizeAttributes: function(hash, requestType) {
    var attrs = get(this, 'attrs');

    if (!attrs) { return; }

    for (var key in attrs) {
      var payloadKey = attrs[key];

      hash[key] = hash[payloadKey];
      delete hash[payloadKey];
    }
  }
});

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
  find: function(store, type, id) {
    return this.ajax(this.buildURL(type, id), 'GET');
  },

  findAll: function(store, type, id) {
    return this.ajax(this.buildURL(type), 'GET');
  },

  findQuery: function(store, type, query) {
    return this.ajax(this.buildURL(type), 'GET', query);
  },

  findMany: function(store, type, ids) {
    return this.ajax(this.buildURL(type), 'GET', { ids: ids });
  },

  findHasMany: function(store, record, link) {
    return this.ajax(link, 'GET');
  },

  createRecord: function(store, type, record) {
    var data = {};
    data[type.typeKey] = this.serializerFor(type).serialize(record, { includeId: true });

    return this.ajax(this.buildURL(type), "POST", { data: data });
  },

  updateRecord: function(store, type, record) {
    var data = {};
    data[type.typeKey] = this.serializerFor(type).serialize(record);

    var id = get(record, 'id');

    return this.ajax(this.buildURL(type, id), "PUT", { data: data });
  },

  deleteRecord: function(store, type, record) {
    var id = get(record, 'id');

    return this.ajax(this.buildURL(type, id), "DELETE");
  },

  buildURL: function(type, id) {
    var url = "/" + this.pluralize(type.typeKey);
    if (id) { url += "/" + id; }

    return url;
  },

  serializerFor: function(type) {
    return this.container.lookup('serializer:' + type.typeKey) ||
           this.container.lookup('serializer:_rest');
  },

  normalize: function(primaryType, payload) {
    var serializer = this.container.lookup('serializer:' + primaryType.typeKey) ||
        this.container.lookup('serializer:_rest');

    return serializer.normalize(primaryType, payload);
  },

  extractSingle: function(store, primaryType, payload, recordId, requestType) {
    var primaryTypeName = primaryType.typeKey,
        primaryRecord;

    for (var prop in payload) {
      // legacy support for singular names
      if (prop === primaryTypeName) {
        primaryRecord = this.normalize(primaryType, payload[prop]);
        continue;
      }

      var typeName = this.singularize(prop),
          type = store.modelFor(typeName);

      /*jshint loopfunc:true*/
      payload[prop].forEach(function(hash) {
        hash = this.normalize(type, hash);

        var isFirstCreatedRecord = typeName === primaryTypeName && !recordId && !primaryRecord,
            isUpdatedRecord = typeName === primaryTypeName && coerceId(hash.id) === recordId;

        // find the primary record.
        //
        // It's either:
        // * the record with the same ID as the original request
        // * in the case of a newly created record that didn't have an ID, the first
        //   record in the Array
        if (isFirstCreatedRecord || isUpdatedRecord) {
          primaryRecord = hash;
        } else {
          store.push(typeName, hash);
        }
      }, this);
    }

    return primaryRecord;
  },

  extractArray: function(store, primaryType, payload) {
    var primaryTypeName = primaryType.typeKey,
        primaryArray;

    for (var prop in payload) {
      var typeName = this.singularize(prop),
          type = store.modelFor(typeName),
          isPrimary = typeName === primaryTypeName;

      /*jshint loopfunc:true*/
      var normalizedArray = payload[prop].map(function(hash) {
        return this.normalize(type, hash);
      }, this);

      if (isPrimary) {
        primaryArray = normalizedArray;
      } else {
        store.pushMany(typeName, normalizedArray);
      }
    }

    return primaryArray;
  },

  pluralize: function(key) {
    return Ember.String.pluralize(key);
  },

  singularize: function(key) {
    return Ember.String.singularize(key);
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

});
