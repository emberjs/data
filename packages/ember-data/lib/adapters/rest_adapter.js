/**
  @module ember-data
*/

import Adapter from "../system/adapter";
var get = Ember.get;
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
      "title": "I'm Running to Reform the W3C's Tag",
      "author": "Yehuda Katz"
    }
  }
  ```

  ### Conventional Names

  Attribute names in your JSON payload should be the camelCased versions of
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

  Some APIs require HTTP headers, e.g. to provide an API key. Arbitrary
  headers can be set as key/value pairs on the `RESTAdapter`'s `headers`
  object and Ember Data will send them along with each ajax request.


  ```js
  App.ApplicationAdapter = DS.RESTAdapter.extend({
    headers: {
      "API_KEY": "secret key",
      "ANOTHER_HEADER": "Some header value"
    }
  });
  ```

  `headers` can also be used as a computed property to support dynamic
  headers. In the example below, the `session` object has been
  injected into an adapter by Ember's container.

  ```js
  App.ApplicationAdapter = DS.RESTAdapter.extend({
    headers: function() {
      return {
        "API_KEY": this.get("session.authToken"),
        "ANOTHER_HEADER": "Some header value"
      };
    }.property("session.authToken")
  });
  ```

  In some cases, your dynamic headers may require data from some
  object outside of Ember's observer system (for example
  `document.cookie`). You can use the
  [volatile](/api/classes/Ember.ComputedProperty.html#method_volatile)
  function to set the property into a non-cached mode causing the headers to
  be recomputed with every request.

  ```js
  App.ApplicationAdapter = DS.RESTAdapter.extend({
    headers: function() {
      return {
        "API_KEY": Ember.get(document.cookie.match(/apiKey\=([^;]*)/), "1"),
        "ANOTHER_HEADER": "Some header value"
      };
    }.property().volatile()
  });
  ```

  @class RESTAdapter
  @constructor
  @namespace DS
  @extends DS.Adapter
*/
export default Adapter.extend({
  defaultSerializer: '-rest',
  /**
    Endpoint paths can be prefixed with a `namespace` by setting the namespace
    property on the adapter:

    ```javascript
    DS.RESTAdapter.reopen({
      namespace: 'api/1'
    });
    ```

    Requests for `App.Post` would now target `/api/1/post/`.

    @property namespace
    @type {String}
  */

  /**
    An adapter can target other hosts by setting the `host` property.

    ```javascript
    DS.RESTAdapter.reopen({
      host: 'https://api.example.com'
    });
    ```

    Requests for `App.Post` would now target `https://api.example.com/post/`.

    @property host
    @type {String}
  */

  /**
    Some APIs require HTTP headers, e.g. to provide an API
    key. Arbitrary headers can be set as key/value pairs on the
    `RESTAdapter`'s `headers` object and Ember Data will send them
    along with each ajax request. For dynamic headers see [headers
    customization](/api/data/classes/DS.RESTAdapter.html#toc_headers-customization).

    ```javascript
    App.ApplicationAdapter = DS.RESTAdapter.extend({
      headers: {
        "API_KEY": "secret key",
        "ANOTHER_HEADER": "Some header value"
      }
    });
    ```

    @property headers
    @type {Object}
  */

  /**
    Called by the store in order to fetch the JSON for a given
    type and ID.

    The `find` method makes an Ajax request to a URL computed by `buildURL`, and returns a
    promise for the resulting payload.

    This method performs an HTTP `GET` request with the id provided as part of the query string.

    @method find
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {String} id
    @param {DS.Model} record
    @return {Promise} promise
  */
  find: function(store, type, id, record) {
    return this.ajax(this.buildURL(type.typeKey, id, record), 'GET');
  },

  /**
    Called by the store in order to fetch a JSON array for all
    of the records for a given type.

    The `findAll` method makes an Ajax (HTTP GET) request to a URL computed by `buildURL`, and returns a
    promise for the resulting payload.

    @private
    @method findAll
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {String} sinceToken
    @return {Promise} promise
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

    The `findQuery` method makes an Ajax (HTTP GET) request to a URL computed by `buildURL`, and returns a
    promise for the resulting payload.

    The `query` argument is a simple JavaScript object that will be passed directly
    to the server as parameters.

    @private
    @method findQuery
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {Object} query
    @return {Promise} promise
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

    Many servers, such as Rails and PHP, will automatically convert this URL-encoded array
    into an Array for you on the server-side. If you want to encode the
    IDs, differently, just override this (one-line) method.

    The `findMany` method makes an Ajax (HTTP GET) request to a URL computed by `buildURL`, and returns a
    promise for the resulting payload.

    @method findMany
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {Array} ids
    @param {Array} records
    @return {Promise} promise
  */
  findMany: function(store, type, ids, records) {
    return this.ajax(this.buildURL(type.typeKey, ids, records), 'GET', { data: { ids: ids } });
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

    The `findHasMany` method will make an Ajax (HTTP GET) request to the originally specified URL.
    If the URL is host-relative (starting with a single slash), the
    request will use the host specified on the adapter (if any).

    @method findHasMany
    @param {DS.Store} store
    @param {DS.Model} record
    @param {String} url
    @return {Promise} promise
  */
  findHasMany: function(store, record, url) {
    var host = get(this, 'host'),
        id   = get(record, 'id'),
        type = record.constructor.typeKey;

    if (host && url.charAt(0) === '/' && url.charAt(1) !== '/') {
      url = host + url;
    }

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

    The `findBelongsTo` method will make an Ajax (HTTP GET) request to the originally specified URL.

    @method findBelongsTo
    @param {DS.Store} store
    @param {DS.Model} record
    @param {String} url
    @return {Promise} promise
  */
  findBelongsTo: function(store, record, url) {
    var id   = get(record, 'id'),
        type = record.constructor.typeKey;

    return this.ajax(this.urlPrefix(url, this.buildURL(type, id)), 'GET');
  },

  /**
    Called by the store when a newly created record is
    saved via the `save` method on a model record instance.

    The `createRecord` method serializes the record and makes an Ajax (HTTP POST) request
    to a URL computed by `buildURL`.

    See `serialize` for information on how to customize the serialized form
    of a record.

    @method createRecord
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {DS.Model} record
    @return {Promise} promise
  */
  createRecord: function(store, type, record) {
    var data = {};
    var serializer = store.serializerFor(type.typeKey);

    serializer.serializeIntoHash(data, type, record, { includeId: true });

    return this.ajax(this.buildURL(type.typeKey, null, record), "POST", { data: data });
  },

  /**
    Called by the store when an existing record is saved
    via the `save` method on a model record instance.

    The `updateRecord` method serializes the record and makes an Ajax (HTTP PUT) request
    to a URL computed by `buildURL`.

    See `serialize` for information on how to customize the serialized form
    of a record.

    @method updateRecord
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {DS.Model} record
    @return {Promise} promise
  */
  updateRecord: function(store, type, record) {
    var data = {};
    var serializer = store.serializerFor(type.typeKey);

    serializer.serializeIntoHash(data, type, record);

    var id = get(record, 'id');

    return this.ajax(this.buildURL(type.typeKey, id, record), "PUT", { data: data });
  },

  /**
    Called by the store when a record is deleted.

    The `deleteRecord` method  makes an Ajax (HTTP DELETE) request to a URL computed by `buildURL`.

    @method deleteRecord
    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {DS.Model} record
    @return {Promise} promise
  */
  deleteRecord: function(store, type, record) {
    var id = get(record, 'id');

    return this.ajax(this.buildURL(type.typeKey, id, record), "DELETE");
  },

  /**
    Builds a URL for a given type and optional ID.

    By default, it pluralizes the type's name (for example, 'post'
    becomes 'posts' and 'person' becomes 'people'). To override the
    pluralization see [pathForType](#method_pathForType).

    If an ID is specified, it adds the ID to the path generated
    for the type, separated by a `/`.

    @method buildURL
    @param {String} type
    @param {String} id
    @return {String} url
  */
  buildURL: function(type, id, record) {
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

  /**
    @method urlPrefix
    @private
    @param {String} path
    @param {String} parentUrl
    @return {String} urlPrefix
  */
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

  _urlWithoutTheId: function(store, record) {
    var type = store.modelFor(record);
    var url = this.buildURL(type.typeKey, record.get('id'), record);

    var expandedUrl =  url.split('/');
    if (expandedUrl[expandedUrl.length -1 ] === record.get('id')){
      expandedUrl[expandedUrl.length - 1] = "";
    }
    return expandedUrl.join('/');
  },

  groupRecordsForFindMany: function (store, records) {
    var groups = Ember.MapWithDefault.create({defaultValue: function(){return [];}});
    var _this = this;
    forEach.call(records, function(record){
      var baseUrl = _this._urlWithoutTheId(store, record);
      groups.get(baseUrl).push(record);
    });
    var groupsArray = [];
    groups.forEach(function(key, group){
      groupsArray.push(group);
    });

    return groupsArray;
  },

  /**
    Determines the pathname for a given type.

    By default, it pluralizes the type's name (for example,
    'post' becomes 'posts' and 'person' becomes 'people').

    ### Pathname customization

    For example if you have an object LineItem with an
    endpoint of "/line_items/".

    ```js
    App.ApplicationAdapter = DS.RESTAdapter.extend({
      pathForType: function(type) {
        var decamelized = Ember.String.decamelize(type);
        return Ember.String.pluralize(decamelized);
      }
    });
    ```

    @method pathForType
    @param {String} type
    @return {String} path
  **/
  pathForType: function(type) {
    var camelized = Ember.String.camelize(type);
    return Ember.String.pluralize(camelized);
  },

  /**
    Takes an ajax response, and returns a relevant error.

    Returning a `DS.InvalidError` from this method will cause the
    record to transition into the `invalid` state and make the
    `errors` object available on the record.

    ```javascript
    App.ApplicationAdapter = DS.RESTAdapter.extend({
      ajaxError: function(jqXHR) {
        var error = this._super(jqXHR);

        if (jqXHR && jqXHR.status === 422) {
          var jsonErrors = Ember.$.parseJSON(jqXHR.responseText)["errors"];

          return new DS.InvalidError(jsonErrors);
        } else {
          return error;
        }
      }
    });
    ```

    Note: As a correctness optimization, the default implementation of
    the `ajaxError` method strips out the `then` method from jquery's
    ajax response (jqXHR). This is important because the jqXHR's
    `then` method fulfills the promise with itself resulting in a
    circular "thenable" chain which may cause problems for some
    promise libraries.

    @method ajaxError
    @param  {Object} jqXHR
    @return {Object} jqXHR
  */
  ajaxError: function(jqXHR) {
    if (jqXHR && typeof jqXHR === 'object') {
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

    By default, `ajax` method has the following behavior:

    * It sets the response `dataType` to `"json"`
    * If the HTTP method is not `"GET"`, it sets the `Content-Type` to be
      `application/json; charset=utf-8`
    * If the HTTP method is not `"GET"`, it stringifies the data passed in. The
      data is the serialized record in the case of a save.
    * Registers success and failure handlers.

    @method ajax
    @private
    @param {String} url
    @param {String} type The request type GET, POST, PUT, DELETE etc.
    @param {Object} hash
    @return {Promise} promise
  */
  ajax: function(url, type, hash) {
    var adapter = this;

    return new Ember.RSVP.Promise(function(resolve, reject) {
      hash = adapter.ajaxOptions(url, type, hash);

      hash.success = function(json) {
        Ember.run(null, resolve, json);
      };

      hash.error = function(jqXHR, textStatus, errorThrown) {
        Ember.run(null, reject, adapter.ajaxError(jqXHR));
      };

      Ember.$.ajax(hash);
    }, "DS: RESTAdapter#ajax " + type + " to " + url);
  },

  /**
    @method ajaxOptions
    @private
    @param {String} url
    @param {String} type The request type GET, POST, PUT, DELETE etc.
    @param {Object} hash
    @return {Object} hash
  */
  ajaxOptions: function(url, type, hash) {
    hash = hash || {};
    hash.url = url;
    hash.type = type;
    hash.dataType = 'json';
    hash.context = this;

    if (hash.data && type !== 'GET') {
      hash.contentType = 'application/json; charset=utf-8';
      hash.data = JSON.stringify(hash.data);
    }

    var headers = get(this, 'headers');
    if (headers !== undefined) {
      hash.beforeSend = function (xhr) {
        forEach.call(Ember.keys(headers), function(key) {
          xhr.setRequestHeader(key, headers[key]);
        });
      };
    }


    return hash;
  }

});
