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

function coerceId(id) {
  return id == null ? null : id+'';
}

DS.RESTSerializer = DS.NewJSONSerializer.extend({
  normalize: function(type, hash) {
    this.normalizeId(type, hash);
    this.normalizeAttributes(type, hash);
    return hash;
  },

  normalizeId: function(type, hash) {
    var primaryKey = get(this, 'primaryKey');

    if (!primaryKey) { return; }

    hash.id = hash[primaryKey];
    delete hash[primaryKey];
  },

  normalizeAttributes: function(type, hash) {
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

  extract: function(store, primaryType, record, payload) {
    var primaryTypeName = primaryType.typeKey,
        recordId = get(record, 'id'),
        primaryRecord;

    for (var prop in payload) {
      var typeName = this.singularize(prop),
          type = store.modelFor(typeName);

      /*jshint loopfunc:true*/
      payload[prop].forEach(function(hash) {
        hash = this.normalize(type, hash);

        var isFirstCreatedRecord = typeName === primaryTypeName && !recordId && !primaryRecord,
            isUpdatedRecord = typeName === primaryTypeName && coerceId(hash.id) === recordId;

        if (isFirstCreatedRecord || isUpdatedRecord) {
          primaryRecord = hash;
        } else {
          store.push(typeName, hash);
        }
      }, this);
    }

    return primaryRecord;
  },

  normalize: function(type, payload) {
    var serializer = this.container.lookup('serializer:' + type.typeKey);

    if (!serializer) {
      return payload;
    } else {
      return serializer.normalize(type, payload);
    }
  },

  pluralize: function(type) {
    return type + 's';
  },

  singularize: function(key) {
    return key.substr(0, key.length - 1);
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
