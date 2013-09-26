require("ember-data/core");
require('ember-data/system/adapter');

require('ember-data/serializers/rest_serializer');

/**
  @module ember-data
*/

var get = Ember.get, set = Ember.set;
var forEach = Ember.ArrayPolyfills.forEach;

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

  Attribute names in your JSON payload should be the camelcased versions of
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
      "firstName": "Barack",
      "lastName": "Obama",
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

  An adapter can target other hosts by setting the `host` property.

  ```js
  DS.RESTAdapter.reopen({
    host: 'https://api.example.com'
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
  defaultSerializer: '_rest',

  /**
    Called by the store in order to fetch the JSON for a given
    type and ID.

    It makes an Ajax request to a URL computed by `buildURL`, and returns a
    promise for the resulting payload.

    @method find
    @see RESTAdapter/buildURL
    @see RESTAdapter/ajax
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {String} id
    @returns Promise
  */
  find: function(store, type, id) {
    return this.ajax(this.buildURL(type.typeKey, id), 'GET');
  },

  /**
    Called by the store in order to fetch a JSON array for all
    of the records for a given type.

    It makes an Ajax request to a URL computed by `buildURL`, and returns a
    promise for the resulting payload.

    @method findAll
    @see RESTAdapter/buildURL
    @see RESTAdapter/ajax
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {String} sinceToken
    @returns Promise
  */
  findAll: function(store, type, sinceToken) {
    var query;

    if (sinceToken) {
      query = { since: sinceToken };
    }

    return this.ajax(this.buildURL(type.typeKey), 'GET', { data: query });
  },

  /**
    Called by the store in order to fetch a JSON array for
    the records that match a particular query.

    The query is a simple JavaScript object that will be passed directly
    to the server as parameters.

    It makes an Ajax request to a URL computed by `buildURL`, and returns a
    promise for the resulting payload.

    @method findQuery
    @see RESTAdapter/buildURL
    @see RESTAdapter/ajax
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {Object} query
    @returns Promise
  */
  findQuery: function(store, type, query) {
    return this.ajax(this.buildURL(type.typeKey), 'GET', { data: query });
  },

  /**
    Called by the store in order to fetch a JSON array for
    the unloaded records in a has-many relationship that were originally
    specified as IDs.

    For example, if the original payload looks like:

    ```js
    {
      "id": 1,
      "title": "Rails is omakase",
      "comments": [ 1, 2, 3 ]
    }
    ```

    The IDs will be passed as a URL-encoded Array of IDs, in this form:

    ```
    ids[]=1&ids[]=2&ids[]=3
    ```

    Many servers, such as Rails and PHP, will automatically convert this
    into an Array for you on the server-side. If you want to encode the
    IDs, differently, just override this (one-line) method.

    It makes an Ajax request to a URL computed by `buildURL`, and returns a
    promise for the resulting payload.

    @method findMany
    @see RESTAdapter/buildURL
    @see RESTAdapter/ajax
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {Array<String>} ids
    @returns Promise
  */
  findMany: function(store, type, ids, owner) {
    return this.ajax(this.buildURL(type.typeKey), 'GET', { data: { ids: ids } });
  },

  /**
    Called by the store in order to fetch a JSON array for
    the unloaded records in a has-many relationship that were originally
    specified as a URL (inside of `links`).

    For example, if your original payload looks like this:

    ```js
    {
      "post": {
        "id": 1,
        "title": "Rails is omakase",
        "links": { "comments": "/posts/1/comments" }
      }
    }
    ```

    This method will be called with the parent record and `/posts/1/comments`.

    It will make an Ajax request to the originally specified URL.

    @method findHasMany
    @see RESTAdapter/buildURL
    @see RESTAdapter/ajax
    @param {DS.Store} store
    @param {DS.Model} record
    @param {String} url
    @returns Promise
  */
  findHasMany: function(store, record, url) {
    var id   = get(record, 'id'),
        type = record.constructor.typeKey;

    return this.ajax(this.urlPrefix(url, this.buildURL(type, id)), 'GET');
  },

  /**
    Called by the store in order to fetch a JSON array for
    the unloaded records in a belongs-to relationship that were originally
    specified as a URL (inside of `links`).

    For example, if your original payload looks like this:

    ```js
    {
      "person": {
        "id": 1,
        "name": "Tom Dale",
        "links": { "group": "/people/1/group" }
      }
    }
    ```

    This method will be called with the parent record and `/people/1/group`.

    It will make an Ajax request to the originally specified URL.

    @method findBelongsTo
    @see RESTAdapter/buildURL
    @see RESTAdapter/ajax
    @param {DS.Store} store
    @param {DS.Model} record
    @param {String} url
    @returns Promise
  */
  findBelongsTo: function(store, record, url) {
    var id   = get(record, 'id'),
        type = record.constructor.typeKey;

    return this.ajax(this.urlPrefix(url, this.buildURL(type, id)), 'GET');
  },

  /**
    Called by the store when a newly created record is
    `save`d.

    It serializes the record, and `POST`s it to a URL generated by `buildURL`.

    See `serialize` for information on how to customize the serialized form
    of a record.

    @method createRecord
    @see RESTAdapter/buildURL
    @see RESTAdapter/ajax
    @see RESTAdapter/serialize
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {DS.Model} record
    @returns Promise
  */
  createRecord: function(store, type, record) {
    var data = {};
    var serializer = store.serializerFor(type.typeKey);

    serializer.serializeIntoHash(data, type, record, { includeId: true });

    return this.ajax(this.buildURL(type.typeKey), "POST", { data: data });
  },

  /**
    Called by the store when an existing record is `save`d.

    It serializes the record, and `POST`s it to a URL generated by `buildURL`.

    See `serialize` for information on how to customize the serialized form
    of a record.

    @method updateRecord
    @see RESTAdapter/buildURL
    @see RESTAdapter/ajax
    @see RESTAdapter/serialize
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {DS.Model} record
    @returns Promise
  */
  updateRecord: function(store, type, record) {
    var data = {};
    var serializer = store.serializerFor(type.typeKey);

    serializer.serializeIntoHash(data, type, record);

    var id = get(record, 'id');

    return this.ajax(this.buildURL(type.typeKey, id), "PUT", { data: data });
  },

  /**
    Called by the store when an deleted record is `save`d.

    It serializes the record, and `POST`s it to a URL generated by `buildURL`.

    @method deleteRecord
    @see RESTAdapter/buildURL
    @see RESTAdapter/ajax
    @see RESTAdapter/serialize
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {DS.Model} record
    @returns Promise
  */
  deleteRecord: function(store, type, record) {
    var id = get(record, 'id');

    return this.ajax(this.buildURL(type.typeKey, id), "DELETE");
  },

  /**
    Builds a URL for a given type and optional ID.

    By default, it pluralizes the type's name (for example,
    'post' becomes 'posts' and 'person' becomes 'people').

    If an ID is specified, it adds the ID to the path generated
    for the type, separated by a `/`.

    @method buildURL
    @param {String} type
    @param {String} id
    @returns String
  */
  buildURL: function(type, id) {
    var url = [],
        host = get(this, 'host'),
        prefix = this.urlPrefix();

    if (type) { url.push(this.pathForType(type)); }
    if (id) { url.push(id); }

    if (prefix) { url.unshift(prefix); }

    url = url.join('/');
    if (!host && url) { url = '/' + url; }

    return url;
  },

  urlPrefix: function(path, parentURL) {
    var host = get(this, 'host'),
        namespace = get(this, 'namespace'),
        url = [];

    if (path) {
      // Absolute path
      if (path.charAt(0) === '/') {
        if (host) {
          path = path.slice(1);
          url.push(host);
        }
      // Relative path
      } else if (!/^http(s)?:\/\//.test(path)) {
        url.push(parentURL);
      }
    } else {
      if (host) { url.push(host); }
      if (namespace) { url.push(namespace); }
    }

    if (path) {
      url.push(path);
    }

    return url.join('/');
  },

  /**
    Determines the pathname for a given type.

    By default, it pluralizes the type's name (for example,
    'post' becomes 'posts' and 'person' becomes 'people').

    ### Pathname customization

    For example if you have an object LineItem with an
    endpoint of "/line_items/".

    ```js
    DS.RESTAdapter.reopen({
      pathForType: function(type) {
        var decamelized = Ember.String.decamelize(type);
        return Ember.String.pluralize(decamelized);
      };
    });
    ```

    @method pathForType
    @param {String} type
    @returns String
  **/
  pathForType: function(type) {
    return Ember.String.pluralize(type);
  },

  /**
    Takes an ajax response, and returns a relavant error.

    By default, it has the following behavior:

    * It simply returns the ajax response.

    @method ajaxError
    @param  jqXHR
  */
  ajaxError: function(jqXHR) {
    if (jqXHR) {
      jqXHR.then = null;
    }

    return jqXHR;
  },

  /**
    Takes a URL, an HTTP method and a hash of data, and makes an
    HTTP request.

    When the server responds with a payload, Ember Data will call into `extractSingle`
    or `extractArray` (depending on whether the original query was for one record or
    many records).

    By default, it has the following behavior:

    * It sets the response `dataType` to `"json"`
    * If the HTTP method is not `"GET"`, it sets the `Content-Type` to be
      `application/json; charset=utf-8`
    * If the HTTP method is not `"GET"`, it stringifies the data passed in. The
      data is the serialized record in the case of a save.
    * Registers success and failure handlers.

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
          forEach.call(Ember.keys(headers), function(key) {
            xhr.setRequestHeader(key, headers[key]);
          });
        };
      }

      hash.success = function(json) {
        Ember.run(null, resolve, json);
      };

      hash.error = function(jqXHR, textStatus, errorThrown) {
        Ember.run(null, reject, adapter.ajaxError(jqXHR));
      };

      Ember.$.ajax(hash);
    });
  }

});
