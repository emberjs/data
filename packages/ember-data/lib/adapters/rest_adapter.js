require("ember-data/core");
require('ember-data/system/adapter');

/**
  @module ember-data
*/

var get = Ember.get, set = Ember.set;
var forEach = Ember.ArrayPolyfills.forEach;

DS.rejectionHandler = function(reason) {
  Ember.Logger.assert([reason, reason.message, reason.stack]);

  throw reason;
};

function coerceId(id) {
  return id == null ? null : id+'';
}

/**
  Normally, applications will use the `RESTSerializer` by implementing
  the `normalize` method and individual normalizations under
  `normalizeHash`.

  This allows you to do whatever kind of munging you need, and is
  especially useful if your server is inconsistent and you need to
  do munging differently for many different kinds of responses.

  See the `normalize` documentation for more information.

  ## Across the Board Normalization

  There are also a number of hooks that you might find useful to defined
  across-the-board rules for your payload. These rules will be useful
  if your server is consistent, or if you're building an adapter for
  an infrastructure service, like Parse, and want to encode service
  conventions.

  For example, if all of your keys are underscored and all-caps, but
  otherwise consistent with the names you use in your models, you
  can implement across-the-board rules for how to convert an attribute
  name in your model to a key in your JSON.

  ```js
  App.ApplicationSerializer = DS.RESTSerializer.extend({
    keyForAttribute: function(attr) {
      return Ember.String.underscore(attr).toUpperCase();
    }
  });
  ```

  You can also implement `keyForRelationship`, which takes the name
  of the relationship as the first parameter, and the kind of
  relationship (`hasMany` or `belongsTo`) as the second parameter.
*/
DS.RESTSerializer = DS.JSONSerializer.extend({
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
    App.PostSerializer = DS.RESTSerializer.extend({
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
    this.normalizeId(hash);
    this.normalizeUsingDeclaredMapping(type, hash);
    this.normalizeAttributes(type, hash);
    this.normalizeRelationships(type, hash);

    if (this.normalizeHash && this.normalizeHash[prop]) {
      return this.normalizeHash[prop](hash);
    }

    return hash;
  },

  /**
    @method normalizeId
    @private
  */
  normalizeId: function(hash) {
    var primaryKey = get(this, 'primaryKey');

    if (primaryKey === 'id') { return; }

    hash.id = hash[primaryKey];
    delete hash[primaryKey];
  },

  /**
    @method normalizeUsingDeclaredMapping
    @private
  */
  normalizeUsingDeclaredMapping: function(type, hash) {
    var attrs = get(this, 'attrs'), payloadKey, key;

    if (attrs) {
      for (key in attrs) {
        payloadKey = attrs[key];

        hash[key] = hash[payloadKey];
        delete hash[payloadKey];
      }
    }
  },

  /**
    @method normalizeAttributes
    @private
  */
  normalizeAttributes: function(type, hash) {
    var payloadKey, key;

    if (this.keyForAttribute) {
      type.eachAttribute(function(key) {
        payloadKey = this.keyForAttribute(key);
        if (key === payloadKey) { return; }

        hash[key] = hash[payloadKey];
        delete hash[payloadKey];
      }, this);
    }
  },

  /**
    @method normalizeRelationships
    @private
  */
  normalizeRelationships: function(type, hash) {
    var payloadKey, key;

    if (this.keyForRelationship) {
      type.eachRelationship(function(key, relationship) {
        payloadKey = this.keyForRelationship(key, relationship.kind);
        if (key === payloadKey) { return; }

        hash[key] = hash[payloadKey];
        delete hash[payloadKey];
      }, this);
    }
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

    You could implement a serializer that looks like this to get your payload
    into shape:

    ```js
    App.PostSerializer = DS.RESTSerializer.extend({
      // First, restructure the top-level so it's organized by type
      extractSingle: function(store, type, payload, id, requestType) {
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
      forEach.call(payload[prop], function(hash) {
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

    You could implement a serializer that looks like this to get your payload
    into shape:

    ```js
    App.PostSerializer = DS.RESTSerializer.extend({
      // First, restructure the top-level so it's organized by type
      // and the comments are listed under a post's `comments` key.
      extractArray: function(store, type, payload, id, requestType) {
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

    When you call super from your own implementation of `extractArray`, the
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

  // SERIALIZE

  /**
    Called when a record is saved in order to convert the
    record into JSON.

    By default, it creates a JSON object with a key for
    each attribute and belongsTo relationship.

    For example, consider this model:

    ```js
    App.Comment = DS.Model.extend({
      title: DS.attr(),
      body: DS.attr(),

      author: DS.belongsTo('user')
    });
    ```

    The default serialization would create a JSON object like:

    ```js
    {
      "title": "Rails is unagi",
      "body": "Rails? Omakase? O_O",
      "author": 12
    }
    ```

    By default, attributes are passed through as-is, unless
    you specified an attribute type (`DS.attr('date')`). If
    you specify a transform, the JavaScript value will be
    serialized when inserted into the JSON hash.

    By default, belongs-to relationships are converted into
    IDs when inserted into the JSON hash.

    ## IDs

    `serialize` takes an options hash with a single option:
    `includeId`. If this option is `true`, `serialize` will,
    by default include the ID in the JSON object it builds.

    The adapter passes in `includeId: true` when serializing
    a record for `createRecord`, but not for `updateRecord`.

    ## Customization

    Your server may expect a different JSON format than the
    built-in serialization format.

    In that case, you can implement `serialize` yourself and
    return a JSON hash of your choosing.

    ```js
    App.PostSerializer = DS.RESTSerializer.extend({
      serialize: function(post, options) {
        var json = {
          POST_TTL: post.get('title'),
          POST_BDY: post.get('body'),
          POST_CMS: post.get('comments').mapProperty('id')
        }

        if (options.includeId) {
          json.POST_ID_ = post.get('id');
        }

        return json;
      }
    });
    ```

    ## Customizing an App-Wide Serializer

    If you want to define a serializer for your entire
    application, you'll probably want to use `eachAttribute`
    and `eachRelationship` on the record.

    ```js
    App.ApplicationSerializer = DS.RESTSerializer.extend({
      serialize: function(record, options) {
        var json = {};

        record.eachAttribute(function(name) {
          json[serverAttributeName(name)] = record.get(name);
        })

        record.eachRelationship(function(name, relationship) {
          if (relationship.kind === 'hasMany') {
            json[serverHasManyName(name)] = record.get(name).mapBy('id');
          }
        });

        if (options.includeId) {
          json.ID_ = record.get('id');
        }

        return json;
      }
    });

    function serverAttributeName(attribute) {
      return attribute.underscore().toUpperCase();
    }

    function serverHasManyName(name) {
      return serverAttributeName(name.singularize()) + "_IDS";
    }
    ```

    This serializer will generate JSON that looks like this:

    ```js
    {
      "TITLE": "Rails is omakase",
      "BODY": "Yep. Omakase.",
      "COMMENT_IDS": [ 1, 2, 3 ]
    }
    ```

    ## Tweaking the Default JSON

    If you just want to do some small tweaks on the default JSON,
    you can call super first and make the tweaks on the returned
    JSON.

    ```js
    App.PostSerializer = DS.RESTSerializer.extend({
      serialize: function(record, options) {
        var json = this._super(record, options);

        json.subject = json.title;
        delete json.title;

        return json;
      }
    });
    ```
  */
  serialize: function(record, options) {
    return this._super.apply(this, arguments);
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
    return this.ajax(this.buildURL(type), 'GET', { data: query });
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
    return this.ajax(this.buildURL(type), 'GET', { data: { ids: ids } });
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
    var host = get(this, 'host'),
        namespace = get(this, 'namespace'),
        url = [];

    if (host) { url.push(host); }
    if (namespace) { url.push(namespace); }

    url.push(Ember.String.pluralize(type.typeKey));
    if (id) { url.push(id); }

    url = url.join('/');
    if (!host) { url = '/' + url; }

    return url;
  },

  serializerFor: function(type) {
    // This logic has to be kept in sync with DS.Store#serializerFor
    return this.container.lookup('serializer:' + type) ||
           this.container.lookup('serializer:application') ||
           this.container.lookup('serializer:_rest');
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
        if (jqXHR) {
          jqXHR.then = null;
        }

        Ember.run(null, reject, jqXHR);
      };

      Ember.$.ajax(hash);
    });
  }

});
