/**
  @module ember-data
*/

import Ember from 'ember';
import { assert, deprecate, runInDebug, warn } from "ember-data/-private/debug";
import JSONSerializer from "ember-data/serializers/json";
import normalizeModelName from "ember-data/-private/system/normalize-model-name";
import {singularize} from "ember-inflector";
import coerceId from "ember-data/-private/system/coerce-id";
import { modelHasAttributeOrRelationshipNamedType } from "ember-data/-private/utils";
import isEnabled from 'ember-data/-private/features';

var camelize = Ember.String.camelize;

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

  ```app/serializers/application.js
  import DS from 'ember-data';

  export default DS.RESTSerializer.extend({
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
   `keyForPolymorphicType` can be used to define a custom key when
   serializing and deserializing a polymorphic type. By default, the
   returned key is `${key}Type`.

   Example

    ```app/serializers/post.js
    import DS from 'ember-data';

    export default DS.RESTSerializer.extend({
      keyForPolymorphicType: function(key, relationship) {
        var relationshipKey = this.keyForRelationship(key);

        return 'type-' + relationshipKey;
      }
    });
    ```

   @method keyForPolymorphicType
   @param {String} key
   @param {String} typeClass
   @param {String} method
   @return {String} normalized key
  */
  keyForPolymorphicType(key, typeClass, method) {
    var relationshipKey = this.keyForRelationship(key);

    return `${relationshipKey}Type`;
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

    ```app/serializers/post.js
    import DS from 'ember-data';

    export default DS.RESTSerializer.extend({
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
    @param {DS.Model} modelClass
    @param {Object} resourceHash
    @param {String} prop
    @return {Object}
  */
  normalize(modelClass, resourceHash, prop) {
    if (this.normalizeHash && this.normalizeHash[prop]) {
      this.normalizeHash[prop](resourceHash);
    }
    return this._super(modelClass, resourceHash, prop);
  },

  /**
    Normalizes an array of resource payloads and returns a JSON-API Document
    with primary data and, if any, included data as `{ data, included }`.

    @method _normalizeArray
    @param {DS.Store} store
    @param {String} modelName
    @param {Object} arrayHash
    @param {String} prop
    @return {Object}
    @private
  */
  _normalizeArray(store, modelName, arrayHash, prop) {
    let documentHash = {
      data: [],
      included: []
    };

    let modelClass = store.modelFor(modelName);
    let serializer = store.serializerFor(modelName);

    /*jshint loopfunc:true*/
    Ember.makeArray(arrayHash).forEach((hash) => {
      let { data, included } = this._normalizePolymorphicRecord(store, hash, prop, modelClass, serializer);
      documentHash.data.push(data);
      if (included) {
        documentHash.included.push(...included);
      }
    });

    return documentHash;
  },

  _normalizePolymorphicRecord(store, hash, prop, primaryModelClass, primarySerializer) {
    let serializer, modelClass;
    const primaryHasTypeAttribute = modelHasAttributeOrRelationshipNamedType(primaryModelClass);
    // Support polymorphic records in async relationships
    if (!primaryHasTypeAttribute && hash.type && store._hasModelFor(this.modelNameFromPayloadKey(hash.type))) {
      serializer = store.serializerFor(this.modelNameFromPayloadKey(hash.type));
      modelClass = store.modelFor(this.modelNameFromPayloadKey(hash.type));
    } else {
      serializer = primarySerializer;
      modelClass = primaryModelClass;
    }
    return serializer.normalize(modelClass, hash, prop);
  },

  /*
    @method _normalizeResponse
    @param {DS.Store} store
    @param {DS.Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @param {Boolean} isSingle
    @return {Object} JSON-API Document
    @private
  */
  _normalizeResponse(store, primaryModelClass, payload, id, requestType, isSingle) {
    let documentHash = {
      data: null,
      included: []
    };

    let meta = this.extractMeta(store, primaryModelClass, payload);
    if (meta) {
      assert('The `meta` returned from `extractMeta` has to be an object, not "' + Ember.typeOf(meta) + '".', Ember.typeOf(meta) === 'object');
      documentHash.meta = meta;
    }

    var keys = Object.keys(payload);

    for (let i = 0, length = keys.length; i < length; i++) {
      let prop = keys[i];
      var modelName = prop;
      var forcedSecondary = false;

      /*
        If you want to provide sideloaded records of the same type that the
        primary data you can do that by prefixing the key with `_`.

        Example

        ```
        {
          users: [
            { id: 1, title: 'Tom', manager: 3 },
            { id: 2, title: 'Yehuda', manager: 3 }
          ],
          _users: [
            { id: 3, title: 'Tomster' }
          ]
        }
        ```

        This forces `_users` to be added to `included` instead of `data`.
       */
      if (prop.charAt(0) === '_') {
        forcedSecondary = true;
        modelName = prop.substr(1);
      }

      var typeName = this.modelNameFromPayloadKey(modelName);
      if (!store.modelFactoryFor(typeName)) {
        warn(this.warnMessageNoModelForKey(modelName, typeName), false, {
          id: 'ds.serializer.model-for-key-missing'
        });
        continue;
      }

      var isPrimary = (!forcedSecondary && this.isPrimaryType(store, typeName, primaryModelClass));
      var value = payload[prop];

      if (value === null) {
        continue;
      }

      /*
        Support primary data as an object instead of an array.

        Example

        ```
        {
          user: { id: 1, title: 'Tom', manager: 3 }
        }
        ```
       */
      if (isPrimary && Ember.typeOf(value) !== 'array') {
        let { data, included } = this._normalizePolymorphicRecord(store, value, prop, primaryModelClass, this);
        documentHash.data = data;
        if (included) {
          documentHash.included.push(...included);
        }
        continue;
      }

      let { data, included } = this._normalizeArray(store, typeName, value, prop);

      if (included) {
        documentHash.included.push(...included);
      }

      if (isSingle) {
        /*jshint loopfunc:true*/
        data.forEach((resource) => {

          /*
            Figures out if this is the primary record or not.

            It's either:

            1. The record with the same ID as the original request
            2. If it's a newly created record without an ID, the first record
               in the array
           */
          var isUpdatedRecord = isPrimary && coerceId(resource.id) === id;
          var isFirstCreatedRecord = isPrimary && !id && !documentHash.data;

          if (isFirstCreatedRecord || isUpdatedRecord) {
            documentHash.data = resource;
          } else {
            documentHash.included.push(resource);
          }
        });
      } else {
        if (isPrimary) {
          documentHash.data = data;
        } else {
          if (data) {
            documentHash.included.push(...data);
          }
        }
      }
    }

    return documentHash;
  },

  isPrimaryType(store, typeName, primaryTypeClass) {
    var typeClass = store.modelFor(typeName);
    return typeClass.modelName === primaryTypeClass.modelName;
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
  pushPayload(store, payload) {
    let documentHash = {
      data: [],
      included: []
    };

    for (var prop in payload) {
      var modelName = this.modelNameFromPayloadKey(prop);
      if (!store.modelFactoryFor(modelName)) {
        warn(this.warnMessageNoModelForKey(prop, modelName), false, {
          id: 'ds.serializer.model-for-key-missing'
        });
        continue;
      }
      var type = store.modelFor(modelName);
      var typeSerializer = store.serializerFor(type.modelName);

      /*jshint loopfunc:true*/
      Ember.makeArray(payload[prop]).forEach((hash) => {
        let { data, included } = typeSerializer.normalize(type, hash, prop);
        documentHash.data.push(data);
        if (included) {
          documentHash.included.push(...included);
        }
      });
    }

    if (isEnabled('ds-pushpayload-return')) {
      return store.push(documentHash);
    } else {
      store.push(documentHash);
    }
  },

  /**
    This method is used to convert each JSON root key in the payload
    into a modelName that it can use to look up the appropriate model for
    that part of the payload.

    For example, your server may send a model name that does not correspond with
    the name of the model in your app. Let's take a look at an example model,
    and an example payload:

    ```app/models/post.js
    import DS from 'ember-data';

    export default DS.Model.extend({
    });
    ```

    ```javascript
      {
        "blog/post": {
          "id": "1
        }
      }
    ```

    Ember Data is going to normalize the payload's root key for the modelName. As a result,
    it will try to look up the "blog/post" model. Since we don't have a model called "blog/post"
    (or a file called app/models/blog/post.js in ember-cli), Ember Data will throw an error
    because it cannot find the "blog/post" model.

    Since we want to remove this namespace, we can define a serializer for the application that will
    remove "blog/" from the payload key whenver it's encountered by Ember Data:

    ```app/serializers/application.js
    import DS from 'ember-data';

    export default DS.RESTSerializer.extend({
      modelNameFromPayloadKey: function(payloadKey) {
        if (payloadKey === 'blog/post') {
          return this._super(payloadKey.replace('blog/', ''));
        } else {
         return this._super(payloadKey);
        }
      }
    });
    ```

    After refreshing, Ember Data will appropriately look up the "post" model.

    By default the modelName for a model is its
    name in dasherized form. This means that a payload key like "blogPost" would be
    normalized to "blog-post" when Ember Data looks up the model. Usually, Ember Data
    can use the correct inflection to do this for you. Most of the time, you won't
    need to override `modelNameFromPayloadKey` for this purpose.

    @method modelNameFromPayloadKey
    @param {String} key
    @return {String} the model's modelName
  */
  modelNameFromPayloadKey(key) {
    return singularize(normalizeModelName(key));
  },

  // SERIALIZE

  /**
    Called when a record is saved in order to convert the
    record into JSON.

    By default, it creates a JSON object with a key for
    each attribute and belongsTo relationship.

    For example, consider this model:

    ```app/models/comment.js
    import DS from 'ember-data';

    export default DS.Model.extend({
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

    ```app/serializers/post.js
    import DS from 'ember-data';

    export default DS.RESTSerializer.extend({
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

    ```app/serializers/application.js
    import DS from 'ember-data';

    export default DS.RESTSerializer.extend({
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

    ```app/serializers/post.js
    import DS from 'ember-data';

    export default DS.RESTSerializer.extend({
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
  serialize(snapshot, options) {
    return this._super(...arguments);
  },

  /**
    You can use this method to customize the root keys serialized into the JSON.
    The hash property should be modified by reference (possibly using something like _.extend)
    By default the REST Serializer sends the modelName of a model, which is a camelized
    version of the name.

    For example, your server may expect underscored root objects.

    ```app/serializers/application.js
    import DS from 'ember-data';

    export default DS.RESTSerializer.extend({
      serializeIntoHash: function(data, type, record, options) {
        var root = Ember.String.decamelize(type.modelName);
        data[root] = this.serialize(record, options);
      }
    });
    ```

    @method serializeIntoHash
    @param {Object} hash
    @param {DS.Model} typeClass
    @param {DS.Snapshot} snapshot
    @param {Object} options
  */
  serializeIntoHash(hash, typeClass, snapshot, options) {
    var normalizedRootKey = this.payloadKeyFromModelName(typeClass.modelName);
    hash[normalizedRootKey] = this.serialize(snapshot, options);
  },

  /**
    You can use `payloadKeyFromModelName` to override the root key for an outgoing
    request. By default, the RESTSerializer returns a camelized version of the
    model's name.

    For a model called TacoParty, its `modelName` would be the string `taco-party`. The RESTSerializer
    will send it to the server with `tacoParty` as the root key in the JSON payload:

    ```js
    {
      "tacoParty": {
        "id": "1",
        "location": "Matthew Beale's House"
      }
    }
    ```

    For example, your server may expect dasherized root objects:

    ```app/serializers/application.js
    import DS from 'ember-data';

    export default DS.RESTSerializer.extend({
      payloadKeyFromModelName: function(modelName) {
        return Ember.String.dasherize(modelName);
      }
    });
    ```

    Given a `TacoParty` model, calling `save` on it would produce an outgoing
    request like:

    ```js
    {
      "taco-party": {
        "id": "1",
        "location": "Matthew Beale's House"
      }
    }
    ```

    @method payloadKeyFromModelName
    @param {String} modelName
    @return {String}
  */
  payloadKeyFromModelName(modelName) {
    return camelize(modelName);
  },

  /**
    You can use this method to customize how polymorphic objects are serialized.
    By default the REST Serializer creates the key by appending `Type` to
    the attribute and value from the model's camelcased model name.

    @method serializePolymorphicType
    @param {DS.Snapshot} snapshot
    @param {Object} json
    @param {Object} relationship
  */
  serializePolymorphicType(snapshot, json, relationship) {
    var key = relationship.key;
    var belongsTo = snapshot.belongsTo(key);
    var typeKey = this.keyForPolymorphicType(key, relationship.type, 'serialize');

    // old way of getting the key for the polymorphic type
    key = this.keyForAttribute ? this.keyForAttribute(key, "serialize") : key;
    key = `${key}Type`;

    // The old way of serializing the type of a polymorphic record used
    // `keyForAttribute`, which is not correct. The next code checks if the old
    // way is used and if it differs from the new way of using
    // `keyForPolymorphicType`. If this is the case, a deprecation warning is
    // logged and the old way is restored (so nothing breaks).
    if (key !== typeKey && this.keyForPolymorphicType === RESTSerializer.prototype.keyForPolymorphicType) {
      deprecate("The key to serialize the type of a polymorphic record is created via keyForAttribute which has been deprecated. Use the keyForPolymorphicType hook instead.", false, {
        id: 'ds.rest-serializer.deprecated-key-for-polymorphic-type',
        until: '3.0.0'
      });

      typeKey = key;
    }

    if (Ember.isNone(belongsTo)) {
      json[typeKey] = null;
    } else {
      json[typeKey] = camelize(belongsTo.modelName);
    }
  },

  /**
    You can use this method to customize how a polymorphic relationship should
    be extracted.

    @method extractPolymorphicRelationship
    @param {Object} relationshipType
    @param {Object} relationshipHash
    @param {Object} relationshipOptions
    @return {Object}
   */
  extractPolymorphicRelationship(relationshipType, relationshipHash, relationshipOptions) {
    var { key, resourceHash, relationshipMeta } = relationshipOptions;

    // A polymorphic belongsTo relationship can be present in the payload
    // either in the form where the `id` and the `type` are given:
    //
    //   {
    //     message: { id: 1, type: 'post' }
    //   }
    //
    // or by the `id` and a `<relationship>Type` attribute:
    //
    //   {
    //     message: 1,
    //     messageType: 'post'
    //   }
    //
    // The next code checks if the latter case is present and returns the
    // corresponding JSON-API representation. The former case is handled within
    // the base class JSONSerializer.
    var isPolymorphic = relationshipMeta.options.polymorphic;
    var typeProperty = this.keyForPolymorphicType(key, relationshipType, 'deserialize');

    if (isPolymorphic && resourceHash.hasOwnProperty(typeProperty) && typeof relationshipHash !== 'object') {
      let type = this.modelNameFromPayloadKey(resourceHash[typeProperty]);
      return {
        id: relationshipHash,
        type: type
      };
    }

    return this._super(...arguments);
  }
});

runInDebug(function() {
  RESTSerializer.reopen({
    warnMessageNoModelForKey(prop, typeKey) {
      return 'Encountered "' + prop + '" in payload, but no model was found for model name "' + typeKey + '" (resolved model name using ' + this.constructor.toString() + '.modelNameFromPayloadKey("' + prop + '"))';
    }
  });
});

export default RESTSerializer;
