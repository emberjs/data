import Serializer from "ember-data/system/serializer";
import coerceId from "ember-data/system/coerce-id";

var get = Ember.get;
var isNone = Ember.isNone;
var map = Ember.ArrayPolyfills.map;
var merge = Ember.merge;

/*
  Ember Data 2.0 Serializer:

  In Ember Data a Serializer is used to serialize and deserialize
  records when they are transferred in and out of an external source.
  This process involves normalizing property names, transforming
  attribute values and serializing relationships.

  By default Ember Data recommends using the JSONApiSerializer.

  `JSONSerializer` is useful for simpler or legacy backends that may
  not support the http://jsonapi.org/ spec.

  `JSONSerializer` normalizes a JSON payload that looks like:

  ```js
    App.User = DS.Model.extend({
      name: DS.attr(),
      friends: DS.hasMany('user'),
      house: DS.belongsTo('location'),
    });
  ```
  ```js
    { id: 1,
      name: 'Sebastian',
      friends: [3, 4],
      links: {
        house: '/houses/lefkada'
      }
    }
  ```
  to JSONApi format that the Ember Data store expects.

  You can customize how JSONSerializer processes it's payload by passing options in
  the attrs hash or by subclassing the JSONSerializer and overriding hooks:

    -To customize how a single record is normalized, use the `normalize` hook
    -To customize how JSONSerializer normalizes the whole server response, use the
      normalizeResponse hook
    -To customize how JSONSerializer normalizes a specific response from the server,
      use one of the many specific normalizeResponse hooks
    -To customize how JSONSerializer normalizes your attributes or relationships,
      use the extractAttributes and extractRelationships hooks.

  JSONSerializer normalization process follows these steps:
    - `normalizeResponse` - entry method to the Serializer
    - `normalizeCreateRecordResponse` - a normalizeResponse for a specific operation is called
    - `normalizeSingleResponse`|`normalizeArrayResponse` - for methods like `createRecord` we expect
      a single record back, while for methods like `findAll` we expect multiple methods back
    - `normalize` - normalizeArray iterates and calls normalize for each of it's records while normalizeSingle
      calls it once. This is the method you most likely want to subclass
    - `extractId` | `extractAttributes` | `extractRelationships` - normalize delegates to these methods to
      turn the record payload into the JSONApi format

  @class JSONSerializer
  @namespace DS
  @extends DS.Serializer
*/

/**
  In Ember Data a Serializer is used to serialize and deserialize
  records when they are transferred in and out of an external source.
  This process involves normalizing property names, transforming
  attribute values and serializing relationships.

  For maximum performance Ember Data recommends you use the
  [RESTSerializer](DS.RESTSerializer.html) or one of its subclasses.

  `JSONSerializer` is useful for simpler or legacy backends that may
  not support the http://jsonapi.org/ spec.

  @class JSONSerializer
  @namespace DS
  @extends DS.Serializer
*/
export default Serializer.extend({

  /**
    The primaryKey is used when serializing and deserializing
    data. Ember Data always uses the `id` property to store the id of
    the record. The external source may not always follow this
    convention. In these cases it is useful to override the
    primaryKey property to match the primaryKey of your external
    store.

    Example

    ```app/serializers/application.js
    import DS from 'ember-data';

    export default DS.JSONSerializer.extend({
      primaryKey: '_id'
    });
    ```

    @property primaryKey
    @type {String}
    @default 'id'
  */
  primaryKey: 'id',

  /**
    The `attrs` object can be used to declare a simple mapping between
    property names on `DS.Model` records and payload keys in the
    serialized JSON object representing the record. An object with the
    property `key` can also be used to designate the attribute's key on
    the response payload.

    Example

    ```app/models/person.js
    import DS from 'ember-data';

    export default DS.Model.extend({
      firstName: DS.attr('string'),
      lastName: DS.attr('string'),
      occupation: DS.attr('string'),
      admin: DS.attr('boolean')
    });
    ```

    ```app/serializers/person.js
    import DS from 'ember-data';

    export default DS.JSONSerializer.extend({
      attrs: {
        admin: 'is_admin',
        occupation: { key: 'career' }
      }
    });
    ```

    You can also remove attributes by setting the `serialize` key to
    false in your mapping object.

    Example

    ```app/serializers/person.js
    import DS from 'ember-data';

    export default DS.JSONSerializer.extend({
      attrs: {
        admin: {serialize: false},
        occupation: { key: 'career' }
      }
    });
    ```

    When serialized:

    ```javascript
    {
      "firstName": "Harry",
      "lastName": "Houdini",
      "career": "magician"
    }
    ```

    Note that the `admin` is now not included in the payload.

    @property attrs
    @type {Object}
  */
  mergedProperties: ['attrs'],

  /**
   Given a subclass of `DS.Model` and a JSON object this method will
   iterate through each attribute of the `DS.Model` and invoke the
   `DS.Transform#deserialize` method on the matching property of the
   JSON object.  This method is typically called after the
   serializer's `normalize` method.

   @method applyTransforms
   @private
   @param {DS.Model} typeClass
   @param {Object} data The data to transform
   @return {Object} data The transformed data object
  */
  applyTransforms: function(typeClass, data) {
    typeClass.eachTransformedAttribute(function applyTransform(key, typeClass) {
      if (!data.hasOwnProperty(key)) { return; }

      var transform = this.transformFor(typeClass);
      data[key] = transform.deserialize(data[key]);
    }, this);

    return data;
  },

  /*
    The `normalizeResponse` method is used to normalize a payload from the
    server to a JSON-API Document.

    http://jsonapi.org/format/#document-structure

    This method delegates to a more specific normalize method based on
    the `requestType`.

    To override this method with a custom one, make sure to call
    `return this._super(store, primaryModelClass, payload, id, requestType)` with your
    pre-processed data.

    Here's an example of using `normalizeResponse` manually:

    ```javascript
    socket.on('message', function(message) {
      var data = message.data;
      var modelClass = store.modelFor(data.modelName);
      var serializer = store.serializerFor(data.modelName);
      var json = serializer.normalizeSingleResponse(store, modelClass, data, data.id);

      store.push(normalized);
    });
    ```

    @method normalizeResponse
    @param {DS.Store} store
    @param {DS.Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeResponse: function(store, primaryModelClass, payload, id, requestType) {
    switch (requestType) {
      case 'find':
        return this.normalizeFindResponse(...arguments);
      case 'findAll':
        return this.normalizeFindAllResponse(...arguments);
      case 'findBelongsTo':
        return this.normalizeFindBelongsToResponse(...arguments);
      case 'findHasMany':
        return this.normalizeFindHasManyResponse(...arguments);
      case 'findMany':
        return this.normalizeFindManyResponse(...arguments);
      case 'findQuery':
        return this.normalizeFindQueryResponse(...arguments);
      case 'createRecord':
        return this.normalizeCreateRecordResponse(...arguments);
      case 'deleteRecord':
        return this.normalizeDeleteRecordResponse(...arguments);
      case 'updateRecord':
        return this.normalizeUpdateRecordResponse(...arguments);
    }
  },

  /*
    @method normalizeFindResponse
    @param {DS.Store} store
    @param {DS.Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeFindResponse: function(store, primaryModelClass, payload, id, requestType) {
    return this.normalizeSingleResponse(...arguments);
  },

  /*
    @method normalizeFindAllResponse
    @param {DS.Store} store
    @param {DS.Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeFindAllResponse: function(store, primaryModelClass, payload, id, requestType) {
    return this.normalizeArrayResponse(...arguments);
  },

  /*
    @method normalizeFindBelongsToResponse
    @param {DS.Store} store
    @param {DS.Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeFindBelongsToResponse: function(store, primaryModelClass, payload, id, requestType) {
    return this.normalizeSingleResponse(...arguments);
  },

  /*
    @method normalizeFindHasManyResponse
    @param {DS.Store} store
    @param {DS.Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeFindHasManyResponse: function(store, primaryModelClass, payload, id, requestType) {
    return this.normalizeArrayResponse(...arguments);
  },

  /*
    @method normalizeFindManyResponse
    @param {DS.Store} store
    @param {DS.Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeFindManyResponse: function(store, primaryModelClass, payload, id, requestType) {
    return this.normalizeArrayResponse(...arguments);
  },

  /*
    @method normalizeFindQueryResponse
    @param {DS.Store} store
    @param {DS.Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeFindQueryResponse: function(store, primaryModelClass, payload, id, requestType) {
    return this.normalizeArrayResponse(...arguments);
  },

  /*
    @method normalizeCreateRecordResponse
    @param {DS.Store} store
    @param {DS.Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeCreateRecordResponse: function(store, primaryModelClass, payload, id, requestType) {
    return this.normalizeSaveResponse(...arguments);
  },

  /*
    @method normalizeDeleteRecordResponse
    @param {DS.Store} store
    @param {DS.Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeDeleteRecordResponse: function(store, primaryModelClass, payload, id, requestType) {
    return this.normalizeSaveResponse(...arguments);
  },

  /*
    @method normalizeUpdateRecordResponse
    @param {DS.Store} store
    @param {DS.Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeUpdateRecordResponse: function(store, primaryModelClass, payload, id, requestType) {
    return this.normalizeSaveResponse(...arguments);
  },

  /*
    @method normalizeSaveResponse
    @param {DS.Store} store
    @param {DS.Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeSaveResponse: function(store, primaryModelClass, payload, id, requestType) {
    return this.normalizeSingleResponse(...arguments);
  },

  /*
    @method normalizeSingleResponse
    @param {DS.Store} store
    @param {DS.Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeSingleResponse: function(store, primaryModelClass, payload, id, requestType) {
    return this._normalizeResponse(store, primaryModelClass, payload, id, requestType, true);
  },

  /*
    @method normalizeArrayResponse
    @param {DS.Store} store
    @param {DS.Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeArrayResponse: function(store, primaryModelClass, payload, id, requestType) {
    return this._normalizeResponse(store, primaryModelClass, payload, id, requestType, false);
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
  _normalizeResponse: function(store, primaryModelClass, payload, id, requestType, isSingle) {
    let documentHash = {
      data: null,
      included: []
    };

    let meta = this.extractMeta(store, primaryModelClass, payload);
    if (meta) {
      Ember.assert('The `meta` returned from `extractMeta` has to be an object, not "' + Ember.typeOf(meta) + '".', Ember.typeOf(meta) === 'object');
      documentHash.meta = meta;
    }

    if (isSingle) {
      let { data } = this.normalize(primaryModelClass, payload);
      documentHash.data = data;
    } else {
      documentHash.data = payload.map((item) => {
        let { data } = this.normalize(primaryModelClass, item);
        return data;
      });
    }

    return documentHash;
  },


  /**
    Normalizes a part of the JSON payload returned by
    the server. You should override this method, munge the hash
    and call super if you have generic normalization to do.

    It takes the type of the record that is being normalized
    (as a DS.Model class), the property where the hash was
    originally found, and the hash to normalize.

    You can use this method, for example, to normalize underscored keys to camelized
    or other general-purpose normalizations.

    Example

    ```app/serializers/application.js
    import DS from 'ember-data';

    export default DS.JSONSerializer.extend({
      normalize: function(typeClass, hash) {
        var fields = Ember.get(typeClass, 'fields');
        fields.forEach(function(field) {
          var payloadField = Ember.String.underscore(field);
          if (field === payloadField) { return; }

          hash[field] = hash[payloadField];
          delete hash[payloadField];
        });
        return this._super.apply(this, arguments);
      }
    });
    ```

    @method normalize
    @param {DS.Model} typeClass
    @param {Object} hash
    @return {Object}
  */
  normalize: function(typeClass, hash) {
    if (Ember.FEATURES.isEnabled('ds-new-serializer-api') && this.get('isNewSerializerAPI')) {
      return _newNormalize.apply(this, arguments);
    }

    if (!hash) { return hash; }

    this.normalizeId(hash);
    this.normalizeAttributes(typeClass, hash);
    this.normalizeRelationships(typeClass, hash);

    this.normalizeUsingDeclaredMapping(typeClass, hash);
    this.applyTransforms(typeClass, hash);
    return hash;
  },

  /*
    Returns the resource's ID.

    @method extractId
    @param {Object} resourceHash
    @return {String}
  */
  extractId: function(resourceHash) {
    var primaryKey = get(this, 'primaryKey');
    var id = resourceHash[primaryKey];
    return coerceId(id);
  },

  /*
    Returns the resource's attributes formatted as a JSON-API "attributes object".

    http://jsonapi.org/format/#document-resource-object-attributes

    @method extractId
    @param {Object} resourceHash
    @return {Object}
  */
  extractAttributes: function(modelClass, resourceHash) {
    var attributeKey;
    var attributes = {};

    modelClass.eachAttribute(function(key) {
      attributeKey = this.keyForAttribute(key, 'deserialize');
      if (resourceHash.hasOwnProperty(attributeKey)) {
        attributes[key] = resourceHash[attributeKey];
      }
    }, this);

    return attributes;
  },

  /*
    Returns a relationship formatted as a JSON-API "relationship object".

    http://jsonapi.org/format/#document-resource-object-relationships

    @method extractRelationship
    @param {Object} relationshipModelName
    @param {Object} relationshipHash
    @return {Object}
  */
  extractRelationship: function(relationshipModelName, relationshipHash) {
    if (Ember.isNone(relationshipHash)) { return null; }
    /*
      When `relationshipHash` is an object it usually means that the relationship
      is polymorphic. It could however also be embedded resources that the
      EmbeddedRecordsMixin has be able to process.
    */
    if (Ember.typeOf(relationshipHash) === 'object') {
      if (relationshipHash.id) {
        relationshipHash.id = coerceId(relationshipHash.id);
      }
      if (relationshipHash.type) {
        relationshipHash.type = this.modelNameFromPayloadKey(relationshipHash.type);
      }
      return relationshipHash;
    }
    return { id: coerceId(relationshipHash), type: relationshipModelName };
  },

  /*
    Returns the resource's relationships formatted as a JSON-API "relationships object".

    http://jsonapi.org/format/#document-resource-object-relationships

    @method extractRelationships
    @param {Object} modelClass
    @param {Object} resourceHash
    @return {Object}
  */
  extractRelationships: function(modelClass, resourceHash) {
    let relationships = {};

    modelClass.eachRelationship(function(key, relationshipMeta) {
      let relationship = null;
      let relationshipKey = this.keyForRelationship(key, relationshipMeta.kind, 'deserialize');
      if (resourceHash.hasOwnProperty(relationshipKey)) {
        let data = null;
        let relationshipHash = resourceHash[relationshipKey];
        if (relationshipMeta.kind === 'belongsTo') {
          data = this.extractRelationship(relationshipMeta.type, relationshipHash);
        } else if (relationshipMeta.kind === 'hasMany') {
          data = Ember.A(relationshipHash).map(function(item) {
            return this.extractRelationship(relationshipMeta.type, item);
          }, this);
        }
        relationship = { data };
      }

      let linkKey = this.keyForLink(key, relationshipMeta.kind);
      if (resourceHash.links && resourceHash.links.hasOwnProperty(linkKey)) {
        let related = resourceHash.links[linkKey];
        relationship = relationship || {};
        relationship.links = { related };
      }

      if (relationship) {
        relationships[key] = relationship;
      }
    }, this);

    return relationships;
  },

  /**
    You can use this method to normalize all payloads, regardless of whether they
    represent single records or an array.

    For example, you might want to remove some extraneous data from the payload:

    ```app/serializers/application.js
    import DS from 'ember-data';

    export default DS.JSONSerializer.extend({
      normalizePayload: function(payload) {
        delete payload.version;
        delete payload.status;
        return payload;
      }
    });
    ```

    @method normalizePayload
    @param {Object} payload
    @return {Object} the normalized payload
  */
  normalizePayload: function(payload) {
    return payload;
  },

  /**
    @method normalizeAttributes
    @private
  */
  normalizeAttributes: function(typeClass, hash) {
    var payloadKey;

    if (this.keyForAttribute) {
      typeClass.eachAttribute(function(key) {
        payloadKey = this.keyForAttribute(key, 'deserialize');
        if (key === payloadKey) { return; }
        if (!hash.hasOwnProperty(payloadKey)) { return; }

        hash[key] = hash[payloadKey];
        delete hash[payloadKey];
      }, this);
    }
  },

  /**
    @method normalizeRelationships
    @private
  */
  normalizeRelationships: function(typeClass, hash) {
    var payloadKey;

    if (this.keyForRelationship) {
      typeClass.eachRelationship(function(key, relationship) {
        payloadKey = this.keyForRelationship(key, relationship.kind, 'deserialize');
        if (key === payloadKey) { return; }
        if (!hash.hasOwnProperty(payloadKey)) { return; }

        hash[key] = hash[payloadKey];
        delete hash[payloadKey];
      }, this);
    }
  },

  /**
    @method normalizeUsingDeclaredMapping
    @private
  */
  normalizeUsingDeclaredMapping: function(typeClass, hash) {
    var attrs = get(this, 'attrs');
    var payloadKey, key;

    if (attrs) {
      for (key in attrs) {
        payloadKey = this._getMappedKey(key);
        if (!hash.hasOwnProperty(payloadKey)) { continue; }

        if (payloadKey !== key) {
          hash[key] = hash[payloadKey];
          delete hash[payloadKey];
        }
      }
    }
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
    @method normalizeErrors
    @private
  */
  normalizeErrors: function(typeClass, hash) {
    this.normalizeId(hash);
    this.normalizeAttributes(typeClass, hash);
    this.normalizeRelationships(typeClass, hash);
    this.normalizeUsingDeclaredMapping(typeClass, hash);
  },

  /**
    Looks up the property key that was set by the custom `attr` mapping
    passed to the serializer.

    @method _getMappedKey
    @private
    @param {String} key
    @return {String} key
  */
  _getMappedKey: function(key) {
    var attrs = get(this, 'attrs');
    var mappedKey;
    if (attrs && attrs[key]) {
      mappedKey = attrs[key];
      //We need to account for both the { title: 'post_title' } and
      //{ title: { key: 'post_title' }} forms
      if (mappedKey.key) {
        mappedKey = mappedKey.key;
      }
      if (typeof mappedKey === 'string') {
        key = mappedKey;
      }
    }

    return key;
  },

  /**
    Check attrs.key.serialize property to inform if the `key`
    can be serialized

    @method _canSerialize
    @private
    @param {String} key
    @return {boolean} true if the key can be serialized
  */
  _canSerialize: function(key) {
    var attrs = get(this, 'attrs');

    return !attrs || !attrs[key] || attrs[key].serialize !== false;
  },

  /**
    When attrs.key.serialize is set to true then
    it takes priority over the other checks and the related
    attribute/relationship will be serialized

    @method _mustSerialize
    @private
    @param {String} key
    @return {boolean} true if the key must be serialized
  */
  _mustSerialize: function(key) {
    var attrs = get(this, 'attrs');

    return attrs && attrs[key] && attrs[key].serialize === true;
  },

  /**
    Check if the given hasMany relationship should be serialized

    @method _shouldSerializeHasMany
    @private
    @param {DS.Snapshot} snapshot
    @param {String} key
    @param {String} relationshipType
    @return {boolean} true if the hasMany relationship should be serialized
  */
  _shouldSerializeHasMany: function (snapshot, key, relationship) {
    var relationshipType = snapshot.type.determineRelationshipType(relationship, this.store);
    if (this._mustSerialize(key)) {
      return true;
    }
    return this._canSerialize(key) && (relationshipType === 'manyToNone' || relationshipType === 'manyToMany');
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

    ```javascript
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

    export default DS.JSONSerializer.extend({
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

    export default DS.JSONSerializer.extend({
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

    ```javascript
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

    export default DS.JSONSerializer.extend({
      serialize: function(snapshot, options) {
        var json = this._super.apply(this, arguments);

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
    var json = {};

    if (options && options.includeId) {
      var id = snapshot.id;

      if (id) {
        json[get(this, 'primaryKey')] = id;
      }
    }

    snapshot.eachAttribute(function(key, attribute) {
      this.serializeAttribute(snapshot, json, key, attribute);
    }, this);

    snapshot.eachRelationship(function(key, relationship) {
      if (relationship.kind === 'belongsTo') {
        this.serializeBelongsTo(snapshot, json, relationship);
      } else if (relationship.kind === 'hasMany') {
        this.serializeHasMany(snapshot, json, relationship);
      }
    }, this);

    return json;
  },

  /**
    You can use this method to customize how a serialized record is added to the complete
    JSON hash to be sent to the server. By default the JSON Serializer does not namespace
    the payload and just sends the raw serialized JSON object.
    If your server expects namespaced keys, you should consider using the RESTSerializer.
    Otherwise you can override this method to customize how the record is added to the hash.

    For example, your server may expect underscored root objects.

    ```app/serializers/application.js
    import DS from 'ember-data';

    export default DS.RESTSerializer.extend({
      serializeIntoHash: function(data, type, snapshot, options) {
        var root = Ember.String.decamelize(type.modelName);
        data[root] = this.serialize(snapshot, options);
      }
    });
    ```

    @method serializeIntoHash
    @param {Object} hash
    @param {DS.Model} typeClass
    @param {DS.Snapshot} snapshot
    @param {Object} options
  */
  serializeIntoHash: function(hash, typeClass, snapshot, options) {
    merge(hash, this.serialize(snapshot, options));
  },

  /**
   `serializeAttribute` can be used to customize how `DS.attr`
   properties are serialized

   For example if you wanted to ensure all your attributes were always
   serialized as properties on an `attributes` object you could
   write:

   ```app/serializers/application.js
   import DS from 'ember-data';

   export default DS.JSONSerializer.extend({
     serializeAttribute: function(snapshot, json, key, attributes) {
       json.attributes = json.attributes || {};
       this._super(snapshot, json.attributes, key, attributes);
     }
   });
   ```

   @method serializeAttribute
   @param {DS.Snapshot} snapshot
   @param {Object} json
   @param {String} key
   @param {Object} attribute
  */
  serializeAttribute: function(snapshot, json, key, attribute) {
    var type = attribute.type;

    if (this._canSerialize(key)) {
      var value = snapshot.attr(key);
      if (type) {
        var transform = this.transformFor(type);
        value = transform.serialize(value);
      }

      // if provided, use the mapping provided by `attrs` in
      // the serializer
      var payloadKey =  this._getMappedKey(key);

      if (payloadKey === key && this.keyForAttribute) {
        payloadKey = this.keyForAttribute(key, 'serialize');
      }

      json[payloadKey] = value;
    }
  },

  /**
   `serializeBelongsTo` can be used to customize how `DS.belongsTo`
   properties are serialized.

   Example

   ```app/serializers/post.js
   import DS from 'ember-data';

   export default DS.JSONSerializer.extend({
     serializeBelongsTo: function(snapshot, json, relationship) {
       var key = relationship.key;

       var belongsTo = snapshot.belongsTo(key);

       key = this.keyForRelationship ? this.keyForRelationship(key, "belongsTo", "serialize") : key;

       json[key] = Ember.isNone(belongsTo) ? belongsTo : belongsTo.record.toJSON();
     }
   });
   ```

   @method serializeBelongsTo
   @param {DS.Snapshot} snapshot
   @param {Object} json
   @param {Object} relationship
  */
  serializeBelongsTo: function(snapshot, json, relationship) {
    var key = relationship.key;

    if (this._canSerialize(key)) {
      var belongsToId = snapshot.belongsTo(key, { id: true });

      // if provided, use the mapping provided by `attrs` in
      // the serializer
      var payloadKey = this._getMappedKey(key);
      if (payloadKey === key && this.keyForRelationship) {
        payloadKey = this.keyForRelationship(key, "belongsTo", "serialize");
      }

      //Need to check whether the id is there for new&async records
      if (isNone(belongsToId)) {
        json[payloadKey] = null;
      } else {
        json[payloadKey] = belongsToId;
      }

      if (relationship.options.polymorphic) {
        this.serializePolymorphicType(snapshot, json, relationship);
      }
    }
  },

  /**
   `serializeHasMany` can be used to customize how `DS.hasMany`
   properties are serialized.

   Example

   ```app/serializers/post.js
   import DS from 'ember-data';

   export default DS.JSONSerializer.extend({
     serializeHasMany: function(snapshot, json, relationship) {
       var key = relationship.key;
       if (key === 'comments') {
         return;
       } else {
         this._super.apply(this, arguments);
       }
     }
   });
   ```

   @method serializeHasMany
   @param {DS.Snapshot} snapshot
   @param {Object} json
   @param {Object} relationship
  */
  serializeHasMany: function(snapshot, json, relationship) {
    var key = relationship.key;

    if (this._shouldSerializeHasMany(snapshot, key, relationship)) {
      var payloadKey;

      // if provided, use the mapping provided by `attrs` in
      // the serializer
      payloadKey = this._getMappedKey(key);
      if (payloadKey === key && this.keyForRelationship) {
        payloadKey = this.keyForRelationship(key, "hasMany", "serialize");
      }
      json[payloadKey] = snapshot.hasMany(key, { ids: true });
      // TODO support for polymorphic manyToNone and manyToMany relationships
    }
  },

  /**
    You can use this method to customize how polymorphic objects are
    serialized. Objects are considered to be polymorphic if
    `{ polymorphic: true }` is pass as the second argument to the
    `DS.belongsTo` function.

    Example

    ```app/serializers/comment.js
    import DS from 'ember-data';

    export default DS.JSONSerializer.extend({
      serializePolymorphicType: function(snapshot, json, relationship) {
        var key = relationship.key,
            belongsTo = snapshot.belongsTo(key);
        key = this.keyForAttribute ? this.keyForAttribute(key, "serialize") : key;

        if (Ember.isNone(belongsTo)) {
          json[key + "_type"] = null;
        } else {
          json[key + "_type"] = belongsTo.modelName;
        }
      }
    });
    ```

    @method serializePolymorphicType
    @param {DS.Snapshot} snapshot
    @param {Object} json
    @param {Object} relationship
  */
  serializePolymorphicType: Ember.K,

  // EXTRACT

  /**
    The `extract` method is used to deserialize payload data from the
    server. By default the `JSONSerializer` does not push the records
    into the store. However records that subclass `JSONSerializer`
    such as the `RESTSerializer` may push records into the store as
    part of the extract call.

    This method delegates to a more specific extract method based on
    the `requestType`.

    To override this method with a custom one, make sure to call
    `return this._super(store, type, payload, id, requestType)` with your
    pre-processed data.

    Here's an example of using `extract` manually:

    ```javascript
    socket.on('message', function(message) {
      var data = message.data;
      var typeClass = store.modelFor(message.modelName);
      var serializer = store.serializerFor(typeClass.modelName);
      var record = serializer.extract(store, typeClass, data, data.id, 'single');

      store.push(message.modelName, record);
    });
    ```

    @method extract
    @param {DS.Store} store
    @param {DS.Model} typeClass
    @param {Object} payload
    @param {(String|Number)} id
    @param {String} requestType
    @return {Object} json The deserialized payload
  */
  extract: function(store, typeClass, payload, id, requestType) {
    this.extractMeta(store, typeClass.modelName, payload);

    var specificExtract = "extract" + requestType.charAt(0).toUpperCase() + requestType.substr(1);
    return this[specificExtract](store, typeClass, payload, id, requestType);
  },

  /**
    `extractFindAll` is a hook into the extract method used when a
    call is made to `DS.Store#findAll`. By default this method is an
    alias for [extractArray](#method_extractArray).

    @method extractFindAll
    @param {DS.Store} store
    @param {DS.Model} typeClass
    @param {Object} payload
    @param {(String|Number)} id
    @param {String} requestType
    @return {Array} array An array of deserialized objects
  */
  extractFindAll: function(store, typeClass, payload, id, requestType) {
    return this.extractArray(store, typeClass, payload, id, requestType);
  },
  /**
    `extractFindQuery` is a hook into the extract method used when a
    call is made to `DS.Store#findQuery`. By default this method is an
    alias for [extractArray](#method_extractArray).

    @method extractFindQuery
    @param {DS.Store} store
    @param {DS.Model} typeClass
    @param {Object} payload
    @param {(String|Number)} id
    @param {String} requestType
    @return {Array} array An array of deserialized objects
  */
  extractFindQuery: function(store, typeClass, payload, id, requestType) {
    return this.extractArray(store, typeClass, payload, id, requestType);
  },
  /**
    `extractFindMany` is a hook into the extract method used when a
    call is made to `DS.Store#findMany`. By default this method is
    alias for [extractArray](#method_extractArray).

    @method extractFindMany
    @param {DS.Store} store
    @param {DS.Model} typeClass
    @param {Object} payload
    @param {(String|Number)} id
    @param {String} requestType
    @return {Array} array An array of deserialized objects
  */
  extractFindMany: function(store, typeClass, payload, id, requestType) {
    return this.extractArray(store, typeClass, payload, id, requestType);
  },
  /**
    `extractFindHasMany` is a hook into the extract method used when a
    call is made to `DS.Store#findHasMany`. By default this method is
    alias for [extractArray](#method_extractArray).

    @method extractFindHasMany
    @param {DS.Store} store
    @param {DS.Model} typeClass
    @param {Object} payload
    @param {(String|Number)} id
    @param {String} requestType
    @return {Array} array An array of deserialized objects
  */
  extractFindHasMany: function(store, typeClass, payload, id, requestType) {
    return this.extractArray(store, typeClass, payload, id, requestType);
  },

  /**
    `extractCreateRecord` is a hook into the extract method used when a
    call is made to `DS.Model#save` and the record is new. By default
    this method is alias for [extractSave](#method_extractSave).

    @method extractCreateRecord
    @param {DS.Store} store
    @param {DS.Model} typeClass
    @param {Object} payload
    @param {(String|Number)} id
    @param {String} requestType
    @return {Object} json The deserialized payload
  */
  extractCreateRecord: function(store, typeClass, payload, id, requestType) {
    return this.extractSave(store, typeClass, payload, id, requestType);
  },
  /**
    `extractUpdateRecord` is a hook into the extract method used when
    a call is made to `DS.Model#save` and the record has been updated.
    By default this method is alias for [extractSave](#method_extractSave).

    @method extractUpdateRecord
    @param {DS.Store} store
    @param {DS.Model} typeClass
    @param {Object} payload
    @param {(String|Number)} id
    @param {String} requestType
    @return {Object} json The deserialized payload
  */
  extractUpdateRecord: function(store, typeClass, payload, id, requestType) {
    return this.extractSave(store, typeClass, payload, id, requestType);
  },
  /**
    `extractDeleteRecord` is a hook into the extract method used when
    a call is made to `DS.Model#save` and the record has been deleted.
    By default this method is alias for [extractSave](#method_extractSave).

    @method extractDeleteRecord
    @param {DS.Store} store
    @param {DS.Model} typeClass
    @param {Object} payload
    @param {(String|Number)} id
    @param {String} requestType
    @return {Object} json The deserialized payload
  */
  extractDeleteRecord: function(store, typeClass, payload, id, requestType) {
    return this.extractSave(store, typeClass, payload, id, requestType);
  },

  /**
    `extractFind` is a hook into the extract method used when
    a call is made to `DS.Store#find`. By default this method is
    alias for [extractSingle](#method_extractSingle).

    @method extractFind
    @param {DS.Store} store
    @param {DS.Model} typeClass
    @param {Object} payload
    @param {(String|Number)} id
    @param {String} requestType
    @return {Object} json The deserialized payload
  */
  extractFind: function(store, typeClass, payload, id, requestType) {
    return this.extractSingle(store, typeClass, payload, id, requestType);
  },
  /**
    `extractFindBelongsTo` is a hook into the extract method used when
    a call is made to `DS.Store#findBelongsTo`. By default this method is
    alias for [extractSingle](#method_extractSingle).

    @method extractFindBelongsTo
    @param {DS.Store} store
    @param {DS.Model} typeClass
    @param {Object} payload
    @param {(String|Number)} id
    @param {String} requestType
    @return {Object} json The deserialized payload
  */
  extractFindBelongsTo: function(store, typeClass, payload, id, requestType) {
    return this.extractSingle(store, typeClass, payload, id, requestType);
  },
  /**
    `extractSave` is a hook into the extract method used when a call
    is made to `DS.Model#save`. By default this method is alias
    for [extractSingle](#method_extractSingle).

    @method extractSave
    @param {DS.Store} store
    @param {DS.Model} typeClass
    @param {Object} payload
    @param {(String|Number)} id
    @param {String} requestType
    @return {Object} json The deserialized payload
  */
  extractSave: function(store, typeClass, payload, id, requestType) {
    return this.extractSingle(store, typeClass, payload, id, requestType);
  },

  /**
    `extractSingle` is used to deserialize a single record returned
    from the adapter.

    Example

    ```app/serializers/post.js
    import DS from 'ember-data';

    export default DS.JSONSerializer.extend({
      extractSingle: function(store, typeClass, payload) {
        payload.comments = payload._embedded.comment;
        delete payload._embedded;

        return this._super(store, typeClass, payload);
      },
    });
    ```

    @method extractSingle
    @param {DS.Store} store
    @param {DS.Model} typeClass
    @param {Object} payload
    @param {(String|Number)} id
    @param {String} requestType
    @return {Object} json The deserialized payload
  */
  extractSingle: function(store, typeClass, payload, id, requestType) {
    var normalizedPayload = this.normalizePayload(payload);
    return this.normalize(typeClass, normalizedPayload);
  },

  /**
    `extractArray` is used to deserialize an array of records
    returned from the adapter.

    Example

    ```app/serializers/post.js
    import DS from 'ember-data';

    export default DS.JSONSerializer.extend({
      extractArray: function(store, typeClass, payload) {
        return payload.map(function(json) {
          return this.extractSingle(store, typeClass, json);
        }, this);
      }
    });
    ```

    @method extractArray
    @param {DS.Store} store
    @param {DS.Model} typeClass
    @param {Object} arrayPayload
    @param {(String|Number)} id
    @param {String} requestType
    @return {Array} array An array of deserialized objects
  */
  extractArray: function(store, typeClass, arrayPayload, id, requestType) {
    var normalizedPayload = this.normalizePayload(arrayPayload);
    var serializer = this;

    return map.call(normalizedPayload, function(singlePayload) {
      return serializer.normalize(typeClass, singlePayload);
    });
  },

  /**
    `extractMeta` is used to deserialize any meta information in the
    adapter payload. By default Ember Data expects meta information to
    be located on the `meta` property of the payload object.

    Example

    ```app/serializers/post.js
    import DS from 'ember-data';

    export default DS.JSONSerializer.extend({
      extractMeta: function(store, typeClass, payload) {
        if (payload && payload._pagination) {
          store.setMetadataFor(typeClass, payload._pagination);
          delete payload._pagination;
        }
      }
    });
    ```

    @method extractMeta
    @param {DS.Store} store
    @param {DS.Model} typeClass
    @param {Object} payload
  */
  extractMeta: function(store, typeClass, payload) {
    if (Ember.FEATURES.isEnabled('ds-new-serializer-api') && this.get('isNewSerializerAPI')) {
      return _newExtractMeta.apply(this, arguments);
    }

    if (payload && payload.meta) {
      store.setMetadataFor(typeClass, payload.meta);
      delete payload.meta;
    }
  },

  /**
    `extractErrors` is used to extract model errors when a call is made
    to `DS.Model#save` which fails with an `InvalidError`. By default
    Ember Data expects error information to be located on the `errors`
    property of the payload object.

    Example

    ```app/serializers/post.js
    import DS from 'ember-data';

    export default DS.JSONSerializer.extend({
      extractErrors: function(store, typeClass, payload, id) {
        if (payload && typeof payload === 'object' && payload._problems) {
          payload = payload._problems;
          this.normalizeErrors(typeClass, payload);
        }
        return payload;
      }
    });
    ```

    @method extractErrors
    @param {DS.Store} store
    @param {DS.Model} typeClass
    @param {Object} payload
    @param {(String|Number)} id
    @return {Object} json The deserialized errors
  */
  extractErrors: function(store, typeClass, payload, id) {
    if (payload && typeof payload === 'object' && payload.errors) {
      payload = payload.errors;
      this.normalizeErrors(typeClass, payload);
    }
    return payload;
  },

  /**
   `keyForAttribute` can be used to define rules for how to convert an
   attribute name in your model to a key in your JSON.

   Example

   ```app/serializers/application.js
   import DS from 'ember-data';

   export default DS.RESTSerializer.extend({
     keyForAttribute: function(attr, method) {
       return Ember.String.underscore(attr).toUpperCase();
     }
   });
   ```

   @method keyForAttribute
   @param {String} key
   @param {String} method
   @return {String} normalized key
  */
  keyForAttribute: function(key, method) {
    return key;
  },

  /**
   `keyForRelationship` can be used to define a custom key when
   serializing and deserializing relationship properties. By default
   `JSONSerializer` does not provide an implementation of this method.

   Example

    ```app/serializers/post.js
    import DS from 'ember-data';

    export default DS.JSONSerializer.extend({
      keyForRelationship: function(key, relationship, method) {
        return 'rel_' + Ember.String.underscore(key);
      }
    });
    ```

   @method keyForRelationship
   @param {String} key
   @param {String} typeClass
   @param {String} method
   @return {String} normalized key
  */
  keyForRelationship: function(key, typeClass, method) {
    return key;
  },

  /**
   `keyForLink` can be used to define a custom key when deserializing link
   properties.

   @method keyForLink
   @param {String} key
   @param {String} kind `belongsTo` or `hasMany`
   @return {String} normalized key
  */
  keyForLink: function(key, kind) {
    return key;
  },

  // HELPERS

  /**
   @method transformFor
   @private
   @param {String} attributeType
   @param {Boolean} skipAssertion
   @return {DS.Transform} transform
  */
  transformFor: function(attributeType, skipAssertion) {
    var transform = this.container.lookup('transform:' + attributeType);
    Ember.assert("Unable to find transform for '" + attributeType + "'", skipAssertion || !!transform);
    return transform;
  }
});

/*
  @method _newNormalize
  @param {DS.Model} modelClass
  @param {Object} resourceHash
  @return {Object}
  @private
*/
function _newNormalize(modelClass, resourceHash) {
  let data = null;

  if (resourceHash) {
    this.normalizeUsingDeclaredMapping(modelClass, resourceHash);

    data = {
      id:            this.extractId(resourceHash),
      type:          modelClass.modelName,
      attributes:    this.extractAttributes(modelClass, resourceHash),
      relationships: this.extractRelationships(modelClass, resourceHash)
    };

    this.applyTransforms(modelClass, data.attributes);
  }

  return { data };
}

/*
  @method _newExtractMeta
  @param {DS.Store} store
  @param {DS.Model} modelClass
  @param {Object} payload
  @return {Object}
  @private
*/
function _newExtractMeta(store, modelClass, payload) {
  if (payload && payload.hasOwnProperty('meta')) {
    let meta = payload.meta;
    delete payload.meta;
    return meta;
  }
}
