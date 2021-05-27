/**
 * @module @ember-data/serializer/json
 */
import { getOwner } from '@ember/application';
import { assert, warn } from '@ember/debug';
import { get } from '@ember/object';
import { assign } from '@ember/polyfills';
import { isNone, typeOf } from '@ember/utils';

import Serializer from '@ember-data/serializer';
import { normalizeModelName } from '@ember-data/store';
import { coerceId, errorsArrayToHash } from '@ember-data/store/-private';

import { modelHasAttributeOrRelationshipNamedType } from './-private';

/**
  Ember Data 2.0 Serializer:

  In Ember Data a Serializer is used to serialize and deserialize
  records when they are transferred in and out of an external source.
  This process involves normalizing property names, transforming
  attribute values and serializing relationships.

  By default, Ember Data uses and recommends the `JSONAPISerializer`.

  `JSONSerializer` is useful for simpler or legacy backends that may
  not support the http://jsonapi.org/ spec.

  For example, given the following `User` model and JSON payload:

  ```app/models/user.js
  import Model, { attr, belongsTo, hasMany } from '@ember-data/model';

  export default class UserModel extends Model {
    @hasMany('user') friends;
    @belongsTo('location') house;

    @attr('string') name;
  }
  ```

  ```js
  {
    id: 1,
    name: 'Sebastian',
    friends: [3, 4],
    links: {
      house: '/houses/lefkada'
    }
  }
  ```

  `JSONSerializer` will normalize the JSON payload to the JSON API format that the
  Ember Data store expects.

  You can customize how JSONSerializer processes its payload by passing options in
  the `attrs` hash or by subclassing the `JSONSerializer` and overriding hooks:

    - To customize how a single record is normalized, use the `normalize` hook.
    - To customize how `JSONSerializer` normalizes the whole server response, use the
      `normalizeResponse` hook.
    - To customize how `JSONSerializer` normalizes a specific response from the server,
      use one of the many specific `normalizeResponse` hooks.
    - To customize how `JSONSerializer` normalizes your id, attributes or relationships,
      use the `extractId`, `extractAttributes` and `extractRelationships` hooks.

  The `JSONSerializer` normalization process follows these steps:

    1. `normalizeResponse`
        - entry method to the serializer.
    2. `normalizeCreateRecordResponse`
        - a `normalizeResponse` for a specific operation is called.
    3. `normalizeSingleResponse`|`normalizeArrayResponse`
        - for methods like `createRecord` we expect a single record back, while for methods like `findAll` we expect multiple records back.
    4. `normalize`
        - `normalizeArrayResponse` iterates and calls `normalize` for each of its records while `normalizeSingle`
          calls it once. This is the method you most likely want to subclass.
    5. `extractId` | `extractAttributes` | `extractRelationships`
        - `normalize` delegates to these methods to
          turn the record payload into the JSON API format.

  @main @ember-data/serializer/json
  @class JSONSerializer
  @public
  @extends Serializer
*/
const JSONSerializer = Serializer.extend({
  /**
    The `primaryKey` is used when serializing and deserializing
    data. Ember Data always uses the `id` property to store the id of
    the record. The external source may not always follow this
    convention. In these cases it is useful to override the
    `primaryKey` property to match the `primaryKey` of your external
    store.

    Example

    ```app/serializers/application.js
    import JSONSerializer from '@ember-data/serializer/json';

    export default class ApplicationSerializer extends JSONSerializer {
      primaryKey = '_id'
    }
    ```

    @property primaryKey
    @type {String}
    @public
    @default 'id'
  */
  primaryKey: 'id',

  /**
    The `attrs` object can be used to declare a simple mapping between
    property names on `Model` records and payload keys in the
    serialized JSON object representing the record. An object with the
    property `key` can also be used to designate the attribute's key on
    the response payload.

    Example

    ```app/models/person.js
    import Model, { attr } from '@ember-data/model';

    export default class PersonModel extends Model {
      @attr('string') firstName;
      @attr('string') lastName;
      @attr('string') occupation;
      @attr('boolean') admin;
    }
    ```

    ```app/serializers/person.js
    import JSONSerializer from '@ember-data/serializer/json';

    export default class PersonSerializer extends JSONSerializer {
      attrs = {
        admin: 'is_admin',
        occupation: { key: 'career' }
      }
    }
    ```

    You can also remove attributes and relationships by setting the `serialize`
    key to `false` in your mapping object.

    Example

    ```app/serializers/person.js
    import JSONSerializer from '@ember-data/serializer/json';

    export default class PostSerializer extends JSONSerializer {
      attrs = {
        admin: { serialize: false },
        occupation: { key: 'career' }
      }
    }
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

    Setting `serialize` to `true` enforces serialization for hasMany
    relationships even if it's neither a many-to-many nor many-to-none
    relationship.

    @property attrs
    @public
    @type {Object}
  */
  mergedProperties: ['attrs'],

  /**
   Given a subclass of `Model` and a JSON object this method will
   iterate through each attribute of the `Model` and invoke the
   `Transform#deserialize` method on the matching property of the
   JSON object.  This method is typically called after the
   serializer's `normalize` method.

   @method applyTransforms
   @private
   @param {Model} typeClass
   @param {Object} data The data to transform
   @return {Object} data The transformed data object
  */
  applyTransforms(typeClass, data) {
    let attributes = get(typeClass, 'attributes');

    typeClass.eachTransformedAttribute((key, typeClass) => {
      if (data[key] === undefined) {
        return;
      }

      let transform = this.transformFor(typeClass);
      let transformMeta = attributes.get(key);
      data[key] = transform.deserialize(data[key], transformMeta.options);
    });

    return data;
  },

  /**
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
      let data = message.data;
      let modelClass = store.modelFor(data.modelName);
      let serializer = store.serializerFor(data.modelName);
      let normalized = serializer.normalizeSingleResponse(store, modelClass, data, data.id);

      store.push(normalized);
    });
    ```

    @since 1.13.0
    @method normalizeResponse
    @public
    @param {Store} store
    @param {Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeResponse(store, primaryModelClass, payload, id, requestType) {
    switch (requestType) {
      case 'findRecord':
        return this.normalizeFindRecordResponse(...arguments);
      case 'queryRecord':
        return this.normalizeQueryRecordResponse(...arguments);
      case 'findAll':
        return this.normalizeFindAllResponse(...arguments);
      case 'findBelongsTo':
        return this.normalizeFindBelongsToResponse(...arguments);
      case 'findHasMany':
        return this.normalizeFindHasManyResponse(...arguments);
      case 'findMany':
        return this.normalizeFindManyResponse(...arguments);
      case 'query':
        return this.normalizeQueryResponse(...arguments);
      case 'createRecord':
        return this.normalizeCreateRecordResponse(...arguments);
      case 'deleteRecord':
        return this.normalizeDeleteRecordResponse(...arguments);
      case 'updateRecord':
        return this.normalizeUpdateRecordResponse(...arguments);
    }
  },

  /**
    Called by the default normalizeResponse implementation when the
    type of request is `findRecord`

    @since 1.13.0
    @method normalizeFindRecordResponse
    @public
    @param {Store} store
    @param {Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeFindRecordResponse(store, primaryModelClass, payload, id, requestType) {
    return this.normalizeSingleResponse(...arguments);
  },

  /**
    Called by the default normalizeResponse implementation when the
    type of request is `queryRecord`

    @since 1.13.0
    @method normalizeQueryRecordResponse
    @public
    @param {Store} store
    @param {Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeQueryRecordResponse(store, primaryModelClass, payload, id, requestType) {
    return this.normalizeSingleResponse(...arguments);
  },

  /**
    Called by the default normalizeResponse implementation when the
    type of request is `findAll`

    @since 1.13.0
    @method normalizeFindAllResponse
    @public
    @param {Store} store
    @param {Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeFindAllResponse(store, primaryModelClass, payload, id, requestType) {
    return this.normalizeArrayResponse(...arguments);
  },

  /**
    Called by the default normalizeResponse implementation when the
    type of request is `findBelongsTo`

    @since 1.13.0
    @method normalizeFindBelongsToResponse
    @public
    @param {Store} store
    @param {Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeFindBelongsToResponse(store, primaryModelClass, payload, id, requestType) {
    return this.normalizeSingleResponse(...arguments);
  },

  /**
    Called by the default normalizeResponse implementation when the
    type of request is `findHasMany`

    @since 1.13.0
    @method normalizeFindHasManyResponse
    @public
    @param {Store} store
    @param {Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeFindHasManyResponse(store, primaryModelClass, payload, id, requestType) {
    return this.normalizeArrayResponse(...arguments);
  },

  /**
    Called by the default normalizeResponse implementation when the
    type of request is `findMany`

    @since 1.13.0
    @method normalizeFindManyResponse
    @public
    @param {Store} store
    @param {Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeFindManyResponse(store, primaryModelClass, payload, id, requestType) {
    return this.normalizeArrayResponse(...arguments);
  },

  /**
    Called by the default normalizeResponse implementation when the
    type of request is `query`

    @since 1.13.0
    @method normalizeQueryResponse
    @public
    @param {Store} store
    @param {Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeQueryResponse(store, primaryModelClass, payload, id, requestType) {
    return this.normalizeArrayResponse(...arguments);
  },

  /**
    Called by the default normalizeResponse implementation when the
    type of request is `createRecord`

    @since 1.13.0
    @method normalizeCreateRecordResponse
    @public
    @param {Store} store
    @param {Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeCreateRecordResponse(store, primaryModelClass, payload, id, requestType) {
    return this.normalizeSaveResponse(...arguments);
  },

  /**
    Called by the default normalizeResponse implementation when the
    type of request is `deleteRecord`

    @since 1.13.0
    @method normalizeDeleteRecordResponse
    @public
    @param {Store} store
    @param {Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeDeleteRecordResponse(store, primaryModelClass, payload, id, requestType) {
    return this.normalizeSaveResponse(...arguments);
  },

  /**
    Called by the default normalizeResponse implementation when the
    type of request is `updateRecord`

    @since 1.13.0
    @method normalizeUpdateRecordResponse
    @public
    @param {Store} store
    @param {Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeUpdateRecordResponse(store, primaryModelClass, payload, id, requestType) {
    return this.normalizeSaveResponse(...arguments);
  },

  /**
    normalizeUpdateRecordResponse, normalizeCreateRecordResponse and
    normalizeDeleteRecordResponse delegate to this method by default.

    @since 1.13.0
    @method normalizeSaveResponse
    @public
    @param {Store} store
    @param {Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeSaveResponse(store, primaryModelClass, payload, id, requestType) {
    return this.normalizeSingleResponse(...arguments);
  },

  /**
    normalizeQueryResponse and normalizeFindRecordResponse delegate to this
    method by default.

    @since 1.13.0
    @method normalizeSingleResponse
    @public
    @param {Store} store
    @param {Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeSingleResponse(store, primaryModelClass, payload, id, requestType) {
    return this._normalizeResponse(store, primaryModelClass, payload, id, requestType, true);
  },

  /**
    normalizeQueryResponse, normalizeFindManyResponse, and normalizeFindHasManyResponse delegate
    to this method by default.

    @since 1.13.0
    @method normalizeArrayResponse
    @public
    @param {Store} store
    @param {Model} primaryModelClass
    @param {Object} payload
    @param {String|Number} id
    @param {String} requestType
    @return {Object} JSON-API Document
  */
  normalizeArrayResponse(store, primaryModelClass, payload, id, requestType) {
    return this._normalizeResponse(store, primaryModelClass, payload, id, requestType, false);
  },

  /**
    @method _normalizeResponse
    @param {Store} store
    @param {Model} primaryModelClass
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
      included: [],
    };

    let meta = this.extractMeta(store, primaryModelClass, payload);
    if (meta) {
      assert(
        'The `meta` returned from `extractMeta` has to be an object, not "' + typeOf(meta) + '".',
        typeOf(meta) === 'object'
      );
      documentHash.meta = meta;
    }

    if (isSingle) {
      let { data, included } = this.normalize(primaryModelClass, payload);
      documentHash.data = data;
      if (included) {
        documentHash.included = included;
      }
    } else {
      let ret = new Array(payload.length);
      for (let i = 0, l = payload.length; i < l; i++) {
        let item = payload[i];
        let { data, included } = this.normalize(primaryModelClass, item);
        if (included) {
          documentHash.included.push(...included);
        }
        ret[i] = data;
      }

      documentHash.data = ret;
    }

    return documentHash;
  },

  /**
    Normalizes a part of the JSON payload returned by
    the server. You should override this method, munge the hash
    and call super if you have generic normalization to do.

    It takes the type of the record that is being normalized
    (as a Model class), the property where the hash was
    originally found, and the hash to normalize.

    You can use this method, for example, to normalize underscored keys to camelized
    or other general-purpose normalizations.

    Example

    ```app/serializers/application.js
    import JSONSerializer from '@ember-data/serializer/json';
    import { underscore } from '@ember/string';
    import { get } from '@ember/object';

    export default class ApplicationSerializer extends JSONSerializer {
      normalize(typeClass, hash) {
        let fields = get(typeClass, 'fields');

        fields.forEach(function(type, field) {
          let payloadField = underscore(field);
          if (field === payloadField) { return; }

          hash[field] = hash[payloadField];
          delete hash[payloadField];
        });

        return this._super.apply(this, arguments);
      }
    }
    ```

    @method normalize
    @public
    @param {Model} typeClass
    @param {Object} hash
    @return {Object}
  */
  normalize(modelClass, resourceHash) {
    let data = null;

    if (resourceHash) {
      this.normalizeUsingDeclaredMapping(modelClass, resourceHash);
      if (typeOf(resourceHash.links) === 'object') {
        this.normalizeUsingDeclaredMapping(modelClass, resourceHash.links);
      }

      data = {
        id: this.extractId(modelClass, resourceHash),
        type: modelClass.modelName,
        attributes: this.extractAttributes(modelClass, resourceHash),
        relationships: this.extractRelationships(modelClass, resourceHash),
      };

      this.applyTransforms(modelClass, data.attributes);
    }

    return { data };
  },

  /**
    Returns the resource's ID.

    @method extractId
    @public
    @param {Object} modelClass
    @param {Object} resourceHash
    @return {String}
  */
  extractId(modelClass, resourceHash) {
    let primaryKey = get(this, 'primaryKey');
    let id = resourceHash[primaryKey];
    return coerceId(id);
  },

  /**
    Returns the resource's attributes formatted as a JSON-API "attributes object".

    http://jsonapi.org/format/#document-resource-object-attributes

    @method extractAttributes
    @public
    @param {Object} modelClass
    @param {Object} resourceHash
    @return {Object}
  */
  extractAttributes(modelClass, resourceHash) {
    let attributeKey;
    let attributes = {};

    modelClass.eachAttribute((key) => {
      attributeKey = this.keyForAttribute(key, 'deserialize');
      if (resourceHash[attributeKey] !== undefined) {
        attributes[key] = resourceHash[attributeKey];
      }
    });

    return attributes;
  },

  /**
    Returns a relationship formatted as a JSON-API "relationship object".

    http://jsonapi.org/format/#document-resource-object-relationships

    @method extractRelationship
    @public
    @param {Object} relationshipModelName
    @param {Object} relationshipHash
    @return {Object}
  */
  extractRelationship(relationshipModelName, relationshipHash) {
    if (isNone(relationshipHash)) {
      return null;
    }
    /*
      When `relationshipHash` is an object it usually means that the relationship
      is polymorphic. It could however also be embedded resources that the
      EmbeddedRecordsMixin has be able to process.
    */
    if (typeOf(relationshipHash) === 'object') {
      if (relationshipHash.id) {
        relationshipHash.id = coerceId(relationshipHash.id);
      }

      let modelClass = this.store.modelFor(relationshipModelName);
      if (relationshipHash.type && !modelHasAttributeOrRelationshipNamedType(modelClass)) {
        relationshipHash.type = this.modelNameFromPayloadKey(relationshipHash.type);
      }

      return relationshipHash;
    }
    return { id: coerceId(relationshipHash), type: relationshipModelName };
  },

  /**
    Returns a polymorphic relationship formatted as a JSON-API "relationship object".

    http://jsonapi.org/format/#document-resource-object-relationships

    `relationshipOptions` is a hash which contains more information about the
    polymorphic relationship which should be extracted:
      - `resourceHash` complete hash of the resource the relationship should be
        extracted from
      - `relationshipKey` key under which the value for the relationship is
        extracted from the resourceHash
      - `relationshipMeta` meta information about the relationship

    @method extractPolymorphicRelationship
    @public
    @param {Object} relationshipModelName
    @param {Object} relationshipHash
    @param {Object} relationshipOptions
    @return {Object}
  */
  extractPolymorphicRelationship(relationshipModelName, relationshipHash, relationshipOptions) {
    return this.extractRelationship(relationshipModelName, relationshipHash);
  },

  /**
    Returns the resource's relationships formatted as a JSON-API "relationships object".

    http://jsonapi.org/format/#document-resource-object-relationships

    @method extractRelationships
    @public
    @param {Object} modelClass
    @param {Object} resourceHash
    @return {Object}
  */
  extractRelationships(modelClass, resourceHash) {
    let relationships = {};

    modelClass.eachRelationship((key, relationshipMeta) => {
      let relationship = null;
      let relationshipKey = this.keyForRelationship(key, relationshipMeta.kind, 'deserialize');
      if (resourceHash[relationshipKey] !== undefined) {
        let data = null;
        let relationshipHash = resourceHash[relationshipKey];
        if (relationshipMeta.kind === 'belongsTo') {
          if (relationshipMeta.options.polymorphic) {
            // extracting a polymorphic belongsTo may need more information
            // than the type and the hash (which might only be an id) for the
            // relationship, hence we pass the key, resource and
            // relationshipMeta too
            data = this.extractPolymorphicRelationship(relationshipMeta.type, relationshipHash, {
              key,
              resourceHash,
              relationshipMeta,
            });
          } else {
            data = this.extractRelationship(relationshipMeta.type, relationshipHash);
          }
        } else if (relationshipMeta.kind === 'hasMany') {
          if (!isNone(relationshipHash)) {
            data = new Array(relationshipHash.length);
            if (relationshipMeta.options.polymorphic) {
              for (let i = 0, l = relationshipHash.length; i < l; i++) {
                let item = relationshipHash[i];
                data[i] = this.extractPolymorphicRelationship(relationshipMeta.type, item, {
                  key,
                  resourceHash,
                  relationshipMeta,
                });
              }
            } else {
              for (let i = 0, l = relationshipHash.length; i < l; i++) {
                let item = relationshipHash[i];
                data[i] = this.extractRelationship(relationshipMeta.type, item);
              }
            }
          }
        }
        relationship = { data };
      }

      let linkKey = this.keyForLink(key, relationshipMeta.kind);
      if (resourceHash.links && resourceHash.links[linkKey] !== undefined) {
        let related = resourceHash.links[linkKey];
        relationship = relationship || {};
        relationship.links = { related };
      }

      if (relationship) {
        relationships[key] = relationship;
      }
    });

    return relationships;
  },

  /**
    Dasherizes the model name in the payload

    @method modelNameFromPayloadKey
    @public
    @param {String} key
    @return {String} the model's modelName
  */
  modelNameFromPayloadKey(key) {
    return normalizeModelName(key);
  },

  /**
    @method normalizeRelationships
    @private
  */
  normalizeRelationships(typeClass, hash) {
    let payloadKey;

    if (this.keyForRelationship) {
      typeClass.eachRelationship((key, relationship) => {
        payloadKey = this.keyForRelationship(key, relationship.kind, 'deserialize');
        if (key === payloadKey) {
          return;
        }
        if (hash[payloadKey] === undefined) {
          return;
        }

        hash[key] = hash[payloadKey];
        delete hash[payloadKey];
      });
    }
  },

  /**
    @method normalizeUsingDeclaredMapping
    @private
  */
  normalizeUsingDeclaredMapping(modelClass, hash) {
    let attrs = get(this, 'attrs');
    let normalizedKey;
    let payloadKey;

    if (attrs) {
      for (let key in attrs) {
        normalizedKey = payloadKey = this._getMappedKey(key, modelClass);

        if (hash[payloadKey] === undefined) {
          continue;
        }

        if (get(modelClass, 'attributes').has(key)) {
          normalizedKey = this.keyForAttribute(key);
        }

        if (get(modelClass, 'relationshipsByName').has(key)) {
          normalizedKey = this.keyForRelationship(key);
        }

        if (payloadKey !== normalizedKey) {
          hash[normalizedKey] = hash[payloadKey];
          delete hash[payloadKey];
        }
      }
    }
  },

  /**
    Looks up the property key that was set by the custom `attr` mapping
    passed to the serializer.

    @method _getMappedKey
    @private
    @param {String} key
    @return {String} key
  */
  _getMappedKey(key, modelClass) {
    warn(
      'There is no attribute or relationship with the name `' +
        key +
        '` on `' +
        modelClass.modelName +
        '`. Check your serializers attrs hash.',
      get(modelClass, 'attributes').has(key) || get(modelClass, 'relationshipsByName').has(key),
      {
        id: 'ds.serializer.no-mapped-attrs-key',
      }
    );

    let attrs = get(this, 'attrs');
    let mappedKey;
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
  _canSerialize(key) {
    let attrs = get(this, 'attrs');

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
  _mustSerialize(key) {
    let attrs = get(this, 'attrs');

    return attrs && attrs[key] && attrs[key].serialize === true;
  },

  /**
    Check if the given hasMany relationship should be serialized

    By default only many-to-many and many-to-none relationships are serialized.
    This could be configured per relationship by Serializer's `attrs` object.

    @method shouldSerializeHasMany
    @public
    @param {Snapshot} snapshot
    @param {String} key
    @param {String} relationshipType
    @return {boolean} true if the hasMany relationship should be serialized
  */
  shouldSerializeHasMany(snapshot, key, relationship) {
    let relationshipType = snapshot.type.determineRelationshipType(relationship, this.store);
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
    import Model, { attr, belongsTo } from '@ember-data/model';

    export default class CommentModel extends Model {
      @attr title;
      @attr body;

      @belongsTo('user') author;
    }
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
    you specified an attribute type (`attr('date')`). If
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
    import JSONSerializer from '@ember-data/serializer/json';

    export default class PostSerializer extends JSONSerializer {
      serialize(snapshot, options) {
        let json = {
          POST_TTL: snapshot.attr('title'),
          POST_BDY: snapshot.attr('body'),
          POST_CMS: snapshot.hasMany('comments', { ids: true })
        };

        if (options.includeId) {
          json.POST_ID_ = snapshot.id;
        }

        return json;
      }
    }
    ```

    ## Customizing an App-Wide Serializer

    If you want to define a serializer for your entire
    application, you'll probably want to use `eachAttribute`
    and `eachRelationship` on the record.

    ```app/serializers/application.js
    import JSONSerializer from '@ember-data/serializer/json';
    import { singularize } from 'ember-inflector';

    export default class ApplicationSerializer extends JSONSerializer {
      serialize(snapshot, options) {
        let json = {};

        snapshot.eachAttribute((name) => {
          json[serverAttributeName(name)] = snapshot.attr(name);
        });

        snapshot.eachRelationship((name, relationship) => {
          if (relationship.kind === 'hasMany') {
            json[serverHasManyName(name)] = snapshot.hasMany(name, { ids: true });
          }
        });

        if (options.includeId) {
          json.ID_ = snapshot.id;
        }

        return json;
      }
    }

    function serverAttributeName(attribute) {
      return attribute.underscore().toUpperCase();
    }

    function serverHasManyName(name) {
      return serverAttributeName(singularize(name)) + "_IDS";
    }
    ```

    This serializer will generate JSON that looks like this:

    ```javascript
    {
      "TITLE": "Rails is omakase",
      "BODY": "Yep. Omakase.",
      "COMMENT_IDS": [ "1", "2", "3" ]
    }
    ```

    ## Tweaking the Default JSON

    If you just want to do some small tweaks on the default JSON,
    you can call `super.serialize` first and make the tweaks on
    the returned JSON.

    ```app/serializers/post.js
    import JSONSerializer from '@ember-data/serializer/json';

    export default class PostSerializer extends JSONSerializer {
      serialize(snapshot, options) {
        let json = super.serialize(...arguments);

        json.subject = json.title;
        delete json.title;

        return json;
      }
    }
    ```

    @method serialize
    @public
    @param {Snapshot} snapshot
    @param {Object} options
    @return {Object} json
  */
  serialize(snapshot, options) {
    let json = {};

    if (options && options.includeId) {
      const id = snapshot.id;
      if (id) {
        json[get(this, 'primaryKey')] = id;
      }
    }

    snapshot.eachAttribute((key, attribute) => {
      this.serializeAttribute(snapshot, json, key, attribute);
    });

    snapshot.eachRelationship((key, relationship) => {
      if (relationship.kind === 'belongsTo') {
        this.serializeBelongsTo(snapshot, json, relationship);
      } else if (relationship.kind === 'hasMany') {
        this.serializeHasMany(snapshot, json, relationship);
      }
    });

    return json;
  },

  /**
    You can use this method to customize how a serialized record is added to the complete
    JSON hash to be sent to the server. By default the JSON Serializer does not namespace
    the payload and just sends the raw serialized JSON object.
    If your server expects namespaced keys, you should consider using the RESTSerializer.
    Otherwise you can override this method to customize how the record is added to the hash.
    The hash property should be modified by reference.

    For example, your server may expect underscored root objects.

    ```app/serializers/application.js
    import RESTSerializer from '@ember-data/serializer/rest';
    import { decamelize } from '@ember/string';

    export default class ApplicationSerializer extends RESTSerializer {
      serializeIntoHash(data, type, snapshot, options) {
        let root = decamelize(type.modelName);
        data[root] = this.serialize(snapshot, options);
      }
    }
    ```

    @method serializeIntoHash
    @public
    @param {Object} hash
    @param {Model} typeClass
    @param {Snapshot} snapshot
    @param {Object} options
  */
  serializeIntoHash(hash, typeClass, snapshot, options) {
    assign(hash, this.serialize(snapshot, options));
  },

  /**
    `serializeAttribute` can be used to customize how `attr`
    properties are serialized

    For example if you wanted to ensure all your attributes were always
    serialized as properties on an `attributes` object you could
    write:

    ```app/serializers/application.js
    import JSONSerializer from '@ember-data/serializer/json';

    export default class ApplicationSerializer extends JSONSerializer {
      serializeAttribute(snapshot, json, key, attributes) {
        json.attributes = json.attributes || {};
        this._super(snapshot, json.attributes, key, attributes);
      }
    }
    ```

    @method serializeAttribute
    @public
    @param {Snapshot} snapshot
    @param {Object} json
    @param {String} key
    @param {Object} attribute
  */
  serializeAttribute(snapshot, json, key, attribute) {
    if (this._canSerialize(key)) {
      let type = attribute.type;
      let value = snapshot.attr(key);
      if (type) {
        let transform = this.transformFor(type);
        value = transform.serialize(value, attribute.options);
      }

      // if provided, use the mapping provided by `attrs` in
      // the serializer
      let payloadKey = this._getMappedKey(key, snapshot.type);

      if (payloadKey === key && this.keyForAttribute) {
        payloadKey = this.keyForAttribute(key, 'serialize');
      }

      json[payloadKey] = value;
    }
  },

  /**
    `serializeBelongsTo` can be used to customize how `belongsTo`
    properties are serialized.

    Example

    ```app/serializers/post.js
    import JSONSerializer from '@ember-data/serializer/json';
    import { isNone } from '@ember/utils';

    export default class PostSerializer extends JSONSerializer {
      serializeBelongsTo(snapshot, json, relationship) {
        let key = relationship.key;
        let belongsTo = snapshot.belongsTo(key);

        key = this.keyForRelationship ? this.keyForRelationship(key, "belongsTo", "serialize") : key;

        json[key] = isNone(belongsTo) ? belongsTo : belongsTo.record.toJSON();
      }
    }
    ```

    @method serializeBelongsTo
    @public
    @param {Snapshot} snapshot
    @param {Object} json
    @param {Object} relationship
  */
  serializeBelongsTo(snapshot, json, relationship) {
    let key = relationship.key;

    if (this._canSerialize(key)) {
      let belongsToId = snapshot.belongsTo(key, { id: true });

      // if provided, use the mapping provided by `attrs` in
      // the serializer
      let payloadKey = this._getMappedKey(key, snapshot.type);
      if (payloadKey === key && this.keyForRelationship) {
        payloadKey = this.keyForRelationship(key, 'belongsTo', 'serialize');
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
   `serializeHasMany` can be used to customize how `hasMany`
   properties are serialized.

   Example

   ```app/serializers/post.js
   import JSONSerializer from '@ember-data/serializer/json';

   export default class PostSerializer extends JSONSerializer {
     serializeHasMany(snapshot, json, relationship) {
       let key = relationship.key;
       if (key === 'comments') {
         return;
       } else {
         this._super(...arguments);
       }
     }
   }
   ```

   @method serializeHasMany
    @public
   @param {Snapshot} snapshot
   @param {Object} json
   @param {Object} relationship
  */
  serializeHasMany(snapshot, json, relationship) {
    let key = relationship.key;

    if (this.shouldSerializeHasMany(snapshot, key, relationship)) {
      let hasMany = snapshot.hasMany(key, { ids: true });
      if (hasMany !== undefined) {
        // if provided, use the mapping provided by `attrs` in
        // the serializer
        let payloadKey = this._getMappedKey(key, snapshot.type);
        if (payloadKey === key && this.keyForRelationship) {
          payloadKey = this.keyForRelationship(key, 'hasMany', 'serialize');
        }

        json[payloadKey] = hasMany;
        // TODO support for polymorphic manyToNone and manyToMany relationships
      }
    }
  },

  /**
    You can use this method to customize how polymorphic objects are
    serialized. Objects are considered to be polymorphic if
    `{ polymorphic: true }` is pass as the second argument to the
    `belongsTo` function.

    Example

    ```app/serializers/comment.js
    import JSONSerializer from '@ember-data/serializer/json';
    import { isNone } from '@ember/utils';

    export default class CommentSerializer extends JSONSerializer {
      serializePolymorphicType(snapshot, json, relationship) {
        let key = relationship.key;
        let belongsTo = snapshot.belongsTo(key);

        key = this.keyForAttribute ? this.keyForAttribute(key, 'serialize') : key;

        if (isNone(belongsTo)) {
          json[key + '_type'] = null;
        } else {
          json[key + '_type'] = belongsTo.modelName;
        }
      }
    }
    ```

    @method serializePolymorphicType
    @public
    @param {Snapshot} snapshot
    @param {Object} json
    @param {Object} relationship
  */
  serializePolymorphicType() {},

  /**
    `extractMeta` is used to deserialize any meta information in the
    adapter payload. By default Ember Data expects meta information to
    be located on the `meta` property of the payload object.

    Example

    ```app/serializers/post.js
    import JSONSerializer from '@ember-data/serializer/json';

    export default class PostSerializer extends JSONSerializer {
      extractMeta(store, typeClass, payload) {
        if (payload && payload.hasOwnProperty('_pagination')) {
          let meta = payload._pagination;
          delete payload._pagination;
          return meta;
        }
      }
    }
    ```

    @method extractMeta
    @public
    @param {Store} store
    @param {Model} modelClass
    @param {Object} payload
  */
  extractMeta(store, modelClass, payload) {
    if (payload && payload['meta'] !== undefined) {
      let meta = payload.meta;
      delete payload.meta;
      return meta;
    }
  },

  /**
    `extractErrors` is used to extract model errors when a call
    to `Model#save` fails with an `InvalidError`. By default
    Ember Data expects error information to be located on the `errors`
    property of the payload object.

    This serializer expects this `errors` object to be an Array similar
    to the following, compliant with the https://jsonapi.org/format/#errors specification:

    ```js
    {
      "errors": [
        {
          "detail": "This username is already taken!",
          "source": {
            "pointer": "data/attributes/username"
          }
        }, {
          "detail": "Doesn't look like a valid email.",
          "source": {
            "pointer": "data/attributes/email"
          }
        }
      ]
    }
    ```

    The key `detail` provides a textual description of the problem.
    Alternatively, the key `title` can be used for the same purpose.

    The nested keys `source.pointer` detail which specific element
    of the request data was invalid.

    Note that JSON-API also allows for object-level errors to be placed
    in an object with pointer `data`, signifying that the problem
    cannot be traced to a specific attribute:

    ```javascript
    {
      "errors": [
        {
          "detail": "Some generic non property error message",
          "source": {
            "pointer": "data"
          }
        }
      ]
    }
    ```

    When turn into a `Errors` object, you can read these errors
    through the property `base`:

    ```handlebars
    {{#each @model.errors.base as |error|}}
      <div class="error">
        {{error.message}}
      </div>
    {{/each}}
    ```

    Example of alternative implementation, overriding the default
    behavior to deal with a different format of errors:

    ```app/serializers/post.js
    import JSONSerializer from '@ember-data/serializer/json';

    export default class PostSerializer extends JSONSerializer {
      extractErrors(store, typeClass, payload, id) {
        if (payload && typeof payload === 'object' && payload._problems) {
          payload = payload._problems;
          this.normalizeErrors(typeClass, payload);
        }
        return payload;
      }
    }
    ```

    @method extractErrors
    @public
    @param {Store} store
    @param {Model} typeClass
    @param {Object} payload
    @param {(String|Number)} id
    @return {Object} json The deserialized errors
  */
  extractErrors(store, typeClass, payload, id) {
    if (payload && typeof payload === 'object' && payload.errors) {
      payload = errorsArrayToHash(payload.errors);

      this.normalizeUsingDeclaredMapping(typeClass, payload);

      typeClass.eachAttribute((name) => {
        let key = this.keyForAttribute(name, 'deserialize');
        if (key !== name && payload[key] !== undefined) {
          payload[name] = payload[key];
          delete payload[key];
        }
      });

      typeClass.eachRelationship((name) => {
        let key = this.keyForRelationship(name, 'deserialize');
        if (key !== name && payload[key] !== undefined) {
          payload[name] = payload[key];
          delete payload[key];
        }
      });
    }

    return payload;
  },

  /**
    `keyForAttribute` can be used to define rules for how to convert an
    attribute name in your model to a key in your JSON.

    Example

    ```app/serializers/application.js
    import JSONSerializer from '@ember-data/serializer/json';
    import { underscore } from '@ember/string';

    export default class ApplicationSerializer extends JSONSerializer {
      keyForAttribute(attr, method) {
        return underscore(attr).toUpperCase();
      }
    }
    ```

    @method keyForAttribute
    @public
    @param {String} key
    @param {String} method
    @return {String} normalized key
  */
  keyForAttribute(key, method) {
    return key;
  },

  /**
    `keyForRelationship` can be used to define a custom key when
    serializing and deserializing relationship properties. By default
    `JSONSerializer` does not provide an implementation of this method.

    Example

      ```app/serializers/post.js
      import JSONSerializer from '@ember-data/serializer/json';
      import { underscore } from '@ember/string';

      export default class PostSerializer extends JSONSerializer {
        keyForRelationship(key, relationship, method) {
          return `rel_${underscore(key)}`;
        }
      }
      ```

    @method keyForRelationship
    @public
    @param {String} key
    @param {String} typeClass
    @param {String} method
    @return {String} normalized key
  */
  keyForRelationship(key, typeClass, method) {
    return key;
  },

  /**
   `keyForLink` can be used to define a custom key when deserializing link
   properties.

   @method keyForLink
    @public
   @param {String} key
   @param {String} kind `belongsTo` or `hasMany`
   @return {String} normalized key
  */
  keyForLink(key, kind) {
    return key;
  },

  // HELPERS

  /**
   @method transformFor
   @private
   @param {String} attributeType
   @param {Boolean} skipAssertion
   @return {Transform} transform
  */
  transformFor(attributeType, skipAssertion) {
    let transform = getOwner(this).lookup('transform:' + attributeType);

    assert(`Unable to find the transform for \`attr('${attributeType}')\``, skipAssertion || !!transform);

    return transform;
  },
});

export default JSONSerializer;
