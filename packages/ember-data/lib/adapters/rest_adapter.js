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
    return this.ajax(this.buildURL(type, id), 'GET');
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
    @returns Promise
  */
  findAll: function(store, type) {
    return this.ajax(this.buildURL(type), 'GET');
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
    return this.ajax(this.buildURL(type), 'GET', query);
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
  findMany: function(store, type, ids) {
    return this.ajax(this.buildURL(type), 'GET', { ids: ids });
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
    return this.ajax(url, 'GET');
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
    data[type.typeKey] = this.serializerFor(type.typeKey).serialize(record, { includeId: true });

    return this.ajax(this.buildURL(type), "POST", { data: data });
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
    data[type.typeKey] = this.serializerFor(type.typeKey).serialize(record);

    var id = get(record, 'id');

    return this.ajax(this.buildURL(type, id), "PUT", { data: data });
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

    return this.ajax(this.buildURL(type, id), "DELETE");
  },

  /**
    Builds a URL for a given type and optional ID.

    By default, it pluralizes the type's name (for example,
    'post' becomes 'posts' and 'person' becomes 'people').

    If an ID is specified, it adds the ID to the plural form
    of the type, separated by a `/`.

    @method buildURL
    @param {subclass of DS.Model} type
    @param {String} id
    @returns String
  */
  buildURL: function(type, id) {
    var url = "/" + this.pluralize(type.typeKey);
    if (id) { url += "/" + id; }

    return url;
  },

  serializerFor: function(type) {
    // This logic has to be kept in sync with DS.Store#serializerFor
    return this.container.lookup('serializer:' + type) ||
           this.container.lookup('serializer:application') ||
           this.container.lookup('serializer:_rest');
  },

  /**
    Called when the server has returned a payload representing
    a single record, such as in response to a `find` or `save`.

    It is your opportunity to clean up the server's response into the normalized
    form expected by Ember Data.

    If you want, you can just restructure the top-level of your payload, and
    do more fine-grained normalization in the `normalize` method.

    For example, if you have a payload like this in response to a request for
    post 1:

    ```js
    {
      "id": 1,
      "title": "Rails is omakase",

      "_embedded": {
        "comment": [{
          "_id": 1,
          "comment_title": "FIRST"
        }, {
          "_id": 2,
          "comment_title": "Rails is unagi"
        }]
      }
    }
    ```

    You could implement an adapter that looks like this to get your payload
    into shape:

    ```js
    App.PostAdapter = DS.Adapter.extend({
      // First, restructure the top-level so it's organized by type
      extract: function(store, type, payload, id, requestType) {
        var comments = payload._embedded.comment;
        delete payload._embedded;

        payload = { comments: comments, post: payload };
        return this._super(store, type, payload, id, requestType);
      },

      normalizeHash: {
        // Next, normalize individual comments, which (after `extract`)
        // are now located under `comments`
        comments: function(hash) {
          hash.id = hash._id;
          hash.title = hash.comment_title;
          delete hash._id;
          delete hash.comment_title;
          return hash;
        }
      }
    })
    ```

    When you call super from your own implementation of `extractSingle`, the
    built-in implementation will find the primary record in your normalized
    payload and push the remaining records into the store.

    The primary record is the single hash found under `post` or the first
    element of the `posts` array.

    The primary record has special meaning when the record is being created
    for the first time or updated (`createRecord` or `updateRecord`). In
    particular, it will update the properties of the record that was saved.

    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {Object} payload
    @param {String} id
    @param {'find'|'createRecord'|'updateRecord'|'deleteRecord'} requestType
    @returns Object the primary response to the original request
  */
  extractSingle: function(store, primaryType, payload, recordId, requestType) {
    var primaryTypeName = primaryType.typeKey,
        primaryRecord;

    for (var prop in payload) {
      // legacy support for singular names
      if (prop === primaryTypeName) {
        primaryRecord = this.normalize(primaryType, prop, payload[prop]);
        continue;
      }

      var typeName = this.singularize(prop),
          type = store.modelFor(typeName);

      /*jshint loopfunc:true*/
      payload[prop].forEach(function(hash) {
        hash = this.normalize(type, prop, hash);

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

  /**
    Called when the server has returned a payload representing
    multiple records, such as in response to a `findAll` or `findQuery`.

    It is your opportunity to clean up the server's response into the normalized
    form expected by Ember Data.

    If you want, you can just restructure the top-level of your payload, and
    do more fine-grained normalization in the `normalize` method.

    For example, if you have a payload like this in response to a request for
    all posts:

    ```js
    {
      "_embedded": {
        "post": [{
          "id": 1,
          "title": "Rails is omakase"
        }, {
          "id": 2,
          "title": "The Parley Letter"
        }],
        "comment": [{
          "_id": 1,
          "comment_title": "Rails is unagi"
          "post_id": 1
        }, {
          "_id": 2,
          "comment_title": "Don't tread on me",
          "post_id": 2
        }]
      }
    }
    ```

    You could implement an adapter that looks like this to get your payload
    into shape:

    ```js
    App.PostAdapter = DS.Adapter.extend({
      // First, restructure the top-level so it's organized by type
      // and the comments are listed under a post's `comments` key.
      extract: function(store, type, payload, id, requestType) {
        var posts = payload._embedded.post;
        var comments = [];
        var postCache = {};

        posts.forEach(function(post) {
          post.comments = [];
          postCache[post.id] = post;
        });

        payload._embedded.comment.forEach(function(comment) {
          comments.push(comment);
          postCache[comment.post_id].comments.push(comment);
          delete comment.post_id;
        }

        payload = { comments: comments, posts: payload };

        return this._super(store, type, payload, id, requestType);
      },

      normalizeHash: {
        // Next, normalize individual comments, which (after `extract`)
        // are now located under `comments`
        comments: function(hash) {
          hash.id = hash._id;
          hash.title = hash.comment_title;
          delete hash._id;
          delete hash.comment_title;
          return hash;
        }
      }
    })
    ```

    When you call super from your own implementation of `extractMany`, the
    built-in implementation will find the primary array in your normalized
    payload and push the remaining records into the store.

    The primary array is the array found under `posts`.

    The primary record has special meaning when responding to `findQuery`
    or `findHasMany`. In particular, the primary array will become the
    list of records in the record array that kicked off the request.

    @param {DS.Store} store
    @param {subclass of DS.Model} type
    @param {Object} payload
    @param {'findAll'|'findMany'|'findHasMany'|'findQuery'} requestType
    @returns {Array<Object>} The primary array that was returned in response
      to the original query.
  */
  extractArray: function(store, primaryType, payload) {
    var primaryTypeName = primaryType.typeKey,
        primaryArray;

    for (var prop in payload) {
      var typeName = this.singularize(prop),
          type = store.modelFor(typeName),
          isPrimary = typeName === primaryTypeName;

      /*jshint loopfunc:true*/
      var normalizedArray = payload[prop].map(function(hash) {
        return this.normalize(type, prop, hash);
      }, this);

      if (isPrimary) {
        primaryArray = normalizedArray;
      } else {
        store.pushMany(typeName, normalizedArray);
      }
    }

    return primaryArray;
  },

  /**
    Normalizes a part of the JSON payload returned by
    the server. You should override this method, munge the hash
    and call super if you have generic normalization to do.

    It takes the type of the record that is being normalized
    (as a DS.Model class), the property where the hash was
    originally found, and the hash to normalize.

    For example, if you have a payload that looks like this:

    ```js
    {
      "post": {
        "id": 1,
        "title": "Rails is omakase",
        "comments": [ 1, 2 ]
      },
      "comments": [{
        "id": 1,
        "body": "FIRST"
      }, {
        "id": 2,
        "body": "Rails is unagi"
      }]
    }
    ```

    The `normalize` method will be called three times:

    * With `App.Post`, `"posts"` and `{ id: 1, title: "Rails is omakase", ... }`
    * With `App.Comment`, `"comments"` and `{ id: 1, body: "FIRST" }`
    * With `App.Comment`, `"comments"` and `{ id: 2, body: "Rails is unagi" }`

    You can use this method, for example, to normalize underscored keys to camelized
    or other general-purpose normalizations.

    If you want to do normalizations specific to some part of the payload, you
    can specify those under `normalizeHash`.

    For example, if the `IDs` under `"comments"` are provided as `_id` instead of
    `id`, you can specify how to normalize just the comments:

    ```js
    App.PostAdapter = DS.RESTAdapter.extend({
      normalizeHash: {
        comments: function(hash) {
          hash.id = hash._id;
          delete hash._id;
          return hash;
        }
      }
    });
    ```

    The key under `normalizeHash` is just the original key that was in the original
    payload.

    @method normalize
    @param {subclass of DS.Model} type
    @param {String} prop
    @param {Object} hash
    @returns Object
  */
  normalize: function(type, prop, hash) {
    var serializer = this.serializerFor(type.typeKey);

    if (this.normalizeHash && this.normalizeHash[prop]) {
      return this.normalizeHash[prop](hash);
    }

    return serializer.normalize(type, hash);
  },

  /**
    @private
    @method pluralize
    @param {String} key
  */
  pluralize: function(key) {
    return Ember.String.pluralize(key);
  },

  /**
    @private
    @method singularize
    @param {String} key
  */
  singularize: function(key) {
    return Ember.String.singularize(key);
  },

  /**
    Takes a URL, an HTTP method and a hash of data, and makes an
    HTTP request.

    When the server responds with a payload, Ember Data will call into `extractSingle`
    or `extractMany` (depending on whether the original query was for one record or
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
  }

});
