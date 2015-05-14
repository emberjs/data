/**
  @module ember-data
*/

import JSONSerializer from "ember-data/serializers/json-serializer";
import normalizeModelName from "ember-data/system/normalize-model-name";
import {singularize} from "ember-inflector/lib/system/string";

var forEach = Ember.ArrayPolyfills.forEach;
var map = Ember.ArrayPolyfills.map;
var camelize = Ember.String.camelize;

function coerceId(id) {
  return id == null ? null : id + '';
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

  There are also a number of hooks that you might find useful to define
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
    keyForAttribute: function(attr, method) {
      return Ember.String.underscore(attr).toUpperCase();
    }
  });
  ```

  You can also implement `keyForRelationship`, which takes the name
  of the relationship as the first parameter, the kind of
  relationship (`hasMany` or `belongsTo`) as the second parameter, and
  the method (`serialize` or `deserialize`) as the third parameter.

  @class RESTSerializer
  @namespace DS
  @extends DS.JSONSerializer
*/
var RESTSerializer = JSONSerializer.extend({
  /**
    If you want to do normalizations specific to some part of the payload, you
    can specify those under `normalizeHash`.

    For example, given the following json where the the `IDs` under
    `"comments"` are provided as `_id` instead of `id`.

    ```javascript
    {
      "post": {
        "id": 1,
        "title": "Rails is omakase",
        "comments": [ 1, 2 ]
      },
      "comments": [{
        "_id": 1,
        "body": "FIRST"
      }, {
        "_id": 2,
        "body": "Rails is unagi"
      }]
    }
    ```

    You use `normalizeHash` to normalize just the comments:

    ```javascript
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

    The key under `normalizeHash` is usually just the original key
    that was in the original payload. However, key names will be
    impacted by any modifications done in the `normalizePayload`
    method. The `DS.RESTSerializer`'s default implementation makes no
    changes to the payload keys.

    @property normalizeHash
    @type {Object}
    @default undefined
  */

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
    @param {subclass of DS.Model} typeClass
    @param {Object} hash
    @param {String} prop
    @return {Object}
  */
  normalize: function(typeClass, hash, prop) {
    this.normalizeId(hash);
    this.normalizeAttributes(typeClass, hash);
    this.normalizeRelationships(typeClass, hash);

    this.normalizeUsingDeclaredMapping(typeClass, hash);

    if (this.normalizeHash && this.normalizeHash[prop]) {
      this.normalizeHash[prop](hash);
    }

    this.applyTransforms(typeClass, hash);
    return hash;
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
      extractSingle: function(store, typeClass, payload, id) {
        var comments = payload._embedded.comment;
        delete payload._embedded;

        payload = { comments: comments, post: payload };
        return this._super(store, typeClass, payload, id);
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

    @method extractSingle
    @param {DS.Store} store
    @param {subclass of DS.Model} primaryTypeClass
    @param {Object} payload
    @param {String} recordId
    @return {Object} the primary response to the original request
  */
  extractSingle: function(store, primaryTypeClass, rawPayload, recordId) {
    var payload = this.normalizePayload(rawPayload);
    var primaryTypeClassName = primaryTypeClass.modelName;
    var primaryRecord;

    for (var prop in payload) {
      var typeName  = this.typeForRoot(prop);

      if (!store.modelFactoryFor(typeName)) {
        Ember.warn(this.warnMessageNoModelForKey(prop, typeName), false);
        continue;
      }
      var type = store.modelFor(typeName);
      var isPrimary = type.modelName === primaryTypeClassName;
      var value = payload[prop];

      if (value === null) {
        continue;
      }

      // legacy support for singular resources
      if (isPrimary && Ember.typeOf(value) !== "array" ) {
        primaryRecord = this.normalize(primaryTypeClass, value, prop);
        continue;
      }

      /*jshint loopfunc:true*/
      forEach.call(value, function(hash) {
        var typeName = this.typeForRoot(prop);
        var type = store.modelFor(typeName);
        var typeSerializer = store.serializerFor(type);

        hash = typeSerializer.normalize(type, hash, prop);

        var isFirstCreatedRecord = isPrimary && !recordId && !primaryRecord;
        var isUpdatedRecord = isPrimary && coerceId(hash.id) === recordId;

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
          "comment_title": "Rails is unagi",
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
      extractArray: function(store, type, payload) {
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
        });

        payload = { comments: comments, posts: posts };

        return this._super(store, type, payload);
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

    If your primary array contains secondary (embedded) records of the same type,
    you cannot place these into the primary array `posts`. Instead, place the
    secondary items into an underscore prefixed property `_posts`, which will
    push these items into the store and will not affect the resulting query.

    @method extractArray
    @param {DS.Store} store
    @param {subclass of DS.Model} primaryTypeClass
    @param {Object} payload
    @return {Array} The primary array that was returned in response
      to the original query.
  */
  extractArray: function(store, primaryTypeClass, rawPayload) {
    var payload = this.normalizePayload(rawPayload);
    var primaryTypeClassName = primaryTypeClass.modelName;
    var primaryArray;

    for (var prop in payload) {
      var modelName = prop;
      var forcedSecondary = false;

      if (prop.charAt(0) === '_') {
        forcedSecondary = true;
        modelName = prop.substr(1);
      }

      var typeName = this.typeForRoot(modelName);
      if (!store.modelFactoryFor(typeName)) {
        Ember.warn(this.warnMessageNoModelForKey(prop, typeName), false);
        continue;
      }
      var type = store.modelFor(typeName);
      var typeSerializer = store.serializerFor(type);
      var isPrimary = (!forcedSecondary && (type.modelName === primaryTypeClassName));

      /*jshint loopfunc:true*/
      var normalizedArray = map.call(payload[prop], function(hash) {
        return typeSerializer.normalize(type, hash, prop);
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
    This method allows you to push a payload containing top-level
    collections of records organized per type.

    ```js
    {
      "posts": [{
        "id": "1",
        "title": "Rails is omakase",
        "author", "1",
        "comments": [ "1" ]
      }],
      "comments": [{
        "id": "1",
        "body": "FIRST"
      }],
      "users": [{
        "id": "1",
        "name": "@d2h"
      }]
    }
    ```

    It will first normalize the payload, so you can use this to push
    in data streaming in from your server structured the same way
    that fetches and saves are structured.

    @method pushPayload
    @param {DS.Store} store
    @param {Object} payload
  */
  pushPayload: function(store, rawPayload) {
    var payload = this.normalizePayload(rawPayload);

    for (var prop in payload) {
      var modelName = this.typeForRoot(prop);
      if (!store.modelFactoryFor(modelName, prop)) {
        Ember.warn(this.warnMessageNoModelForKey(prop, modelName), false);
        continue;
      }
      var type = store.modelFor(modelName);
      var typeSerializer = store.serializerFor(type);

      /*jshint loopfunc:true*/
      var normalizedArray = map.call(Ember.makeArray(payload[prop]), function(hash) {
        return typeSerializer.normalize(type, hash, prop);
      }, this);

      store.pushMany(modelName, normalizedArray);
    }
  },

  /**
    This method is used to convert each JSON root key in the payload
    into a modelName that it can use to look up the appropriate model for
    that part of the payload. By default the modelName for a model is its
    name in camelCase, so if your JSON root key is 'fast_car' you would
    use typeForRoot to convert it to 'fast-car' so that Ember Data finds
    the `FastCar` model.

    If you diverge from this norm you should also consider changes to
    store._normalizeModelName as well.

    For example, your server may return prefixed root keys like so:

    ```js
    {
      "response-fast-car": {
        "id": "1",
        "name": "corvette"
      }
    }
    ```

    In order for Ember Data to know that the model corresponding to
    the 'response-fast-car' hash is `FastCar` (modelName: 'fastCar'),
    you can override typeForRoot to convert 'response-fast-car' to
    'fastCar' like so:

    ```js
    App.ApplicationSerializer = DS.RESTSerializer.extend({
      typeForRoot: function(root) {
        // 'response-fast-car' should become 'fast-car'
        var subRoot = root.substring(9);

        // _super normalizes 'fast-car' to 'fastCar'
        return this._super(subRoot);
      }
    });
    ```

    @method typeForRoot
    @param {String} key
    @return {String} the model's modelName
  */
  typeForRoot: function(key) {
    return singularize(normalizeModelName(key));
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
      serialize: function(snapshot, options) {
        var json = {
          POST_TTL: snapshot.attr('title'),
          POST_BDY: snapshot.attr('body'),
          POST_CMS: snapshot.hasMany('comments', { ids: true })
        }

        if (options.includeId) {
          json.POST_ID_ = snapshot.id;
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
      serialize: function(snapshot, options) {
        var json = {};

        snapshot.eachAttribute(function(name) {
          json[serverAttributeName(name)] = snapshot.attr(name);
        })

        snapshot.eachRelationship(function(name, relationship) {
          if (relationship.kind === 'hasMany') {
            json[serverHasManyName(name)] = snapshot.hasMany(name, { ids: true });
          }
        });

        if (options.includeId) {
          json.ID_ = snapshot.id;
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
      serialize: function(snapshot, options) {
        var json = this._super(snapshot, options);

        json.subject = json.title;
        delete json.title;

        return json;
      }
    });
    ```

    @method serialize
    @param {DS.Snapshot} snapshot
    @param {Object} options
    @return {Object} json
  */
  serialize: function(snapshot, options) {
    return this._super.apply(this, arguments);
  },

  /**
    You can use this method to customize the root keys serialized into the JSON.
    By default the REST Serializer sends the modelName of a model, which is a camelized
    version of the name.

    For example, your server may expect underscored root objects.

    ```js
    App.ApplicationSerializer = DS.RESTSerializer.extend({
      serializeIntoHash: function(data, type, record, options) {
        var root = Ember.String.decamelize(type.modelName);
        data[root] = this.serialize(record, options);
      }
    });
    ```

    @method serializeIntoHash
    @param {Object} hash
    @param {subclass of DS.Model} typeClass
    @param {DS.Snapshot} snapshot
    @param {Object} options
  */
  serializeIntoHash: function(hash, typeClass, snapshot, options) {
    var rootTypeKey = camelize(typeClass.modelName);
    hash[rootTypeKey] = this.serialize(snapshot, options);
  },

  /**
    You can use this method to customize how polymorphic objects are serialized.
    By default the JSON Serializer creates the key by appending `Type` to
    the attribute and value from the model's camelcased model name.

    @method serializePolymorphicType
    @param {DS.Snapshot} snapshot
    @param {Object} json
    @param {Object} relationship
  */
  serializePolymorphicType: function(snapshot, json, relationship) {
    var key = relationship.key;
    var belongsTo = snapshot.belongsTo(key);
    key = this.keyForAttribute ? this.keyForAttribute(key, "serialize") : key;
    if (Ember.isNone(belongsTo)) {
      json[key + "Type"] = null;
    } else {
      json[key + "Type"] = Ember.String.camelize(belongsTo.modelName);
    }
  }
});

Ember.runInDebug(function() {
  RESTSerializer.reopen({
    warnMessageNoModelForKey: function(prop, modelName) {
      return 'Encountered "' + prop + '" in payload, but no model was found for model name "' + modelName + '" (resolved model name using ' + this.constructor.toString() + '.typeForRoot("' + prop + '"))';
    }
  });
});

export default RESTSerializer;
