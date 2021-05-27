/**
 * @module @ember-data/serializer/json-api
 */
import { assert, warn } from '@ember/debug';
import { dasherize } from '@ember/string';
import { isNone, typeOf } from '@ember/utils';
import { DEBUG } from '@glimmer/env';

import { pluralize, singularize } from 'ember-inflector';

import { CUSTOM_MODEL_CLASS } from '@ember-data/canary-features';
import JSONSerializer from '@ember-data/serializer/json';
import { normalizeModelName } from '@ember-data/store';

/**
  Ember Data 2.0 Serializer:

  In Ember Data a Serializer is used to serialize and deserialize
  records when they are transferred in and out of an external source.
  This process involves normalizing property names, transforming
  attribute values and serializing relationships.

  `JSONAPISerializer` supports the http://jsonapi.org/ spec and is the
  serializer recommended by Ember Data.

  This serializer normalizes a JSON API payload that looks like:

  ```app/models/player.js
  import Model, { attr, belongsTo } from '@ember-data/model';

  export default class Player extends Model {
    @attr('string') name;
    @attr('string') skill;
    @attr('number') gamesPlayed;
    @belongsTo('club') club;
  }
  ```

  ```app/models/club.js
  import Model, { attr, hasMany } from '@ember-data/model';

  export default class Club extends Model {
    @attr('string') name;
    @attr('string') location;
    @hasMany('player') players;
  }
  ```

  ```js
    {
      "data": [
        {
          "attributes": {
            "name": "Benfica",
            "location": "Portugal"
          },
          "id": "1",
          "relationships": {
            "players": {
              "data": [
                {
                  "id": "3",
                  "type": "players"
                }
              ]
            }
          },
          "type": "clubs"
        }
      ],
      "included": [
        {
          "attributes": {
            "name": "Eusebio Silva Ferreira",
            "skill": "Rocket shot",
            "games-played": 431
          },
          "id": "3",
          "relationships": {
            "club": {
              "data": {
                "id": "1",
                "type": "clubs"
              }
            }
          },
          "type": "players"
        }
      ]
    }
  ```

  to the format that the Ember Data store expects.

  ### Customizing meta

  Since a JSON API Document can have meta defined in multiple locations you can
  use the specific serializer hooks if you need to customize the meta.

  One scenario would be to camelCase the meta keys of your payload. The example
  below shows how this could be done using `normalizeArrayResponse` and
  `extractRelationship`.

  ```app/serializers/application.js
  import JSONAPISerializer from '@ember-data/serializer/json-api';

  export default class ApplicationSerializer extends JSONAPISerializer {
    normalizeArrayResponse(store, primaryModelClass, payload, id, requestType) {
      let normalizedDocument = super.normalizeArrayResponse(...arguments);

      // Customize document meta
      normalizedDocument.meta = camelCaseKeys(normalizedDocument.meta);

      return normalizedDocument;
    }

    extractRelationship(relationshipHash) {
      let normalizedRelationship = super.extractRelationship(...arguments);

      // Customize relationship meta
      normalizedRelationship.meta = camelCaseKeys(normalizedRelationship.meta);

      return normalizedRelationship;
    }
  }
  ```

  @main @ember-data/serializer/json-api
  @since 1.13.0
  @class JSONAPISerializer
  @public
  @extends JSONSerializer
*/
const JSONAPISerializer = JSONSerializer.extend({
  /**
    @method _normalizeDocumentHelper
    @param {Object} documentHash
    @return {Object}
    @private
  */
  _normalizeDocumentHelper(documentHash) {
    if (typeOf(documentHash.data) === 'object') {
      documentHash.data = this._normalizeResourceHelper(documentHash.data);
    } else if (Array.isArray(documentHash.data)) {
      let ret = new Array(documentHash.data.length);

      for (let i = 0; i < documentHash.data.length; i++) {
        let data = documentHash.data[i];
        ret[i] = this._normalizeResourceHelper(data);
      }

      documentHash.data = ret;
    }

    if (Array.isArray(documentHash.included)) {
      let ret = new Array();
      for (let i = 0; i < documentHash.included.length; i++) {
        let included = documentHash.included[i];
        let normalized = this._normalizeResourceHelper(included);
        if (normalized !== null) {
          // can be null when unknown type is encountered
          ret.push(normalized);
        }
      }

      documentHash.included = ret;
    }

    return documentHash;
  },

  /**
    @method _normalizeRelationshipDataHelper
    @param {Object} relationshipDataHash
    @return {Object}
    @private
  */
  _normalizeRelationshipDataHelper(relationshipDataHash) {
    relationshipDataHash.type = this.modelNameFromPayloadKey(relationshipDataHash.type);

    return relationshipDataHash;
  },

  /**
    @method _normalizeResourceHelper
    @param {Object} resourceHash
    @return {Object}
    @private
  */
  _normalizeResourceHelper(resourceHash) {
    assert(this.warnMessageForUndefinedType(), !isNone(resourceHash.type), {
      id: 'ds.serializer.type-is-undefined',
    });

    let modelName, usedLookup;

    modelName = this.modelNameFromPayloadKey(resourceHash.type);
    usedLookup = 'modelNameFromPayloadKey';

    if (!this.store._hasModelFor(modelName)) {
      warn(this.warnMessageNoModelForType(modelName, resourceHash.type, usedLookup), false, {
        id: 'ds.serializer.model-for-type-missing',
      });
      return null;
    }

    let modelClass = this.store.modelFor(modelName);
    let serializer = this.store.serializerFor(modelName);
    let { data } = serializer.normalize(modelClass, resourceHash);
    return data;
  },

  /**
    Normalize some data and push it into the store.

    @method pushPayload
    @public
    @param {Store} store
    @param {Object} payload
  */
  pushPayload(store, payload) {
    let normalizedPayload = this._normalizeDocumentHelper(payload);
    store.push(normalizedPayload);
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
    let normalizedPayload = this._normalizeDocumentHelper(payload);
    return normalizedPayload;
  },

  normalizeQueryRecordResponse() {
    let normalized = this._super(...arguments);

    assert(
      'Expected the primary data returned by the serializer for a `queryRecord` response to be a single object but instead it was an array.',
      !Array.isArray(normalized.data),
      {
        id: 'ds.serializer.json-api.queryRecord-array-response',
      }
    );

    return normalized;
  },

  extractAttributes(modelClass, resourceHash) {
    let attributes = {};

    if (resourceHash.attributes) {
      modelClass.eachAttribute((key) => {
        let attributeKey = this.keyForAttribute(key, 'deserialize');
        if (resourceHash.attributes[attributeKey] !== undefined) {
          attributes[key] = resourceHash.attributes[attributeKey];
        }
        if (DEBUG) {
          if (resourceHash.attributes[attributeKey] === undefined && resourceHash.attributes[key] !== undefined) {
            assert(
              `Your payload for '${modelClass.modelName}' contains '${key}', but your serializer is setup to look for '${attributeKey}'. This is most likely because Ember Data's JSON API serializer dasherizes attribute keys by default. You should subclass JSONAPISerializer and implement 'keyForAttribute(key) { return key; }' to prevent Ember Data from customizing your attribute keys.`,
              false
            );
          }
        }
      });
    }

    return attributes;
  },

  /**
     Returns a relationship formatted as a JSON-API "relationship object".

     http://jsonapi.org/format/#document-resource-object-relationships

     @method extractRelationship
    @public
     @param {Object} relationshipHash
     @return {Object}
  */
  extractRelationship(relationshipHash) {
    if (typeOf(relationshipHash.data) === 'object') {
      relationshipHash.data = this._normalizeRelationshipDataHelper(relationshipHash.data);
    }

    if (Array.isArray(relationshipHash.data)) {
      let ret = new Array(relationshipHash.data.length);

      for (let i = 0; i < relationshipHash.data.length; i++) {
        let data = relationshipHash.data[i];
        ret[i] = this._normalizeRelationshipDataHelper(data);
      }

      relationshipHash.data = ret;
    }

    return relationshipHash;
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

    if (resourceHash.relationships) {
      modelClass.eachRelationship((key, relationshipMeta) => {
        let relationshipKey = this.keyForRelationship(key, relationshipMeta.kind, 'deserialize');
        if (resourceHash.relationships[relationshipKey] !== undefined) {
          let relationshipHash = resourceHash.relationships[relationshipKey];
          relationships[key] = this.extractRelationship(relationshipHash);
        }
        if (DEBUG) {
          if (
            resourceHash.relationships[relationshipKey] === undefined &&
            resourceHash.relationships[key] !== undefined
          ) {
            assert(
              `Your payload for '${modelClass.modelName}' contains '${key}', but your serializer is setup to look for '${relationshipKey}'. This is most likely because Ember Data's JSON API serializer dasherizes relationship keys by default. You should subclass JSONAPISerializer and implement 'keyForRelationship(key) { return key; }' to prevent Ember Data from customizing your relationship keys.`,
              false
            );
          }
        }
      });
    }

    return relationships;
  },

  /**
    @method _extractType
    @param {Model} modelClass
    @param {Object} resourceHash
    @return {String}
    @private
  */
  _extractType(modelClass, resourceHash) {
    return this.modelNameFromPayloadKey(resourceHash.type);
  },

  /**
    Dasherizes and singularizes the model name in the payload to match
    the format Ember Data uses internally for the model name.

    For example the key `posts` would be converted to `post` and the
    key `studentAssesments` would be converted to `student-assesment`.

    @method modelNameFromPayloadKey
    @public
    @param {String} key
    @return {String} the model's modelName
  */
  modelNameFromPayloadKey(key) {
    return singularize(normalizeModelName(key));
  },

  /**
    Converts the model name to a pluralized version of the model name.

    For example `post` would be converted to `posts` and
    `student-assesment` would be converted to `student-assesments`.

    @method payloadKeyFromModelName
    @public
    @param {String} modelName
    @return {String}
  */
  // TODO @deprecated Use payloadTypeFromModelName instead
  payloadKeyFromModelName(modelName) {
    return pluralize(modelName);
  },

  normalize(modelClass, resourceHash) {
    if (resourceHash.attributes) {
      this.normalizeUsingDeclaredMapping(modelClass, resourceHash.attributes);
    }

    if (resourceHash.relationships) {
      this.normalizeUsingDeclaredMapping(modelClass, resourceHash.relationships);
    }

    let data = {
      id: this.extractId(modelClass, resourceHash),
      type: this._extractType(modelClass, resourceHash),
      attributes: this.extractAttributes(modelClass, resourceHash),
      relationships: this.extractRelationships(modelClass, resourceHash),
    };

    this.applyTransforms(modelClass, data.attributes);

    return { data };
  },

  /**
    `keyForAttribute` can be used to define rules for how to convert an
    attribute name in your model to a key in your JSON.
    By default `JSONAPISerializer` follows the format used on the examples of
    http://jsonapi.org/format and uses dashes as the word separator in the JSON
    attribute keys.

    This behaviour can be easily customized by extending this method.

    Example

    ```app/serializers/application.js
    import JSONAPISerializer from '@ember-data/serializer/json-api';
    import { dasherize } from '@ember/string';

    export default class ApplicationSerializer extends JSONAPISerializer {
      keyForAttribute(attr, method) {
        return dasherize(attr).toUpperCase();
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
    return dasherize(key);
  },

  /**
   `keyForRelationship` can be used to define a custom key when
   serializing and deserializing relationship properties.
   By default `JSONAPISerializer` follows the format used on the examples of
   http://jsonapi.org/format and uses dashes as word separators in
   relationship properties.

   This behaviour can be easily customized by extending this method.

   Example

    ```app/serializers/post.js
    import JSONAPISerializer from '@ember-data/serializer/json-api';
    import { underscore } from '@ember/string';

    export default class ApplicationSerializer extends JSONAPISerializer {
      keyForRelationship(key, relationship, method) {
        return underscore(key);
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
    return dasherize(key);
  },

  /**
    Called when a record is saved in order to convert the
    record into JSON.

    For example, consider this model:

    ```app/models/comment.js
    import Model, { attr, belongsTo } from '@ember-data/model';

    export default class CommentModel extends Model {
      @attr title;
      @attr body;

      @belongsTo('user', { async: false, inverse: null })
      author;
    }
    ```

    The default serialization would create a JSON-API resource object like:

    ```javascript
    {
      "data": {
        "type": "comments",
        "attributes": {
          "title": "Rails is unagi",
          "body": "Rails? Omakase? O_O",
        },
        "relationships": {
          "author": {
            "data": {
              "id": "12",
              "type": "users"
            }
          }
        }
      }
    }
    ```

    By default, attributes are passed through as-is, unless
    you specified an attribute type (`attr('date')`). If
    you specify a transform, the JavaScript value will be
    serialized when inserted into the attributes hash.

    Belongs-to relationships are converted into JSON-API
    resource identifier objects.

    ## IDs

    `serialize` takes an options hash with a single option:
    `includeId`. If this option is `true`, `serialize` will,
    by default include the ID in the JSON object it builds.

    The JSONAPIAdapter passes in `includeId: true` when serializing a record
    for `createRecord` or `updateRecord`.

    ## Customization

    Your server may expect data in a different format than the
    built-in serialization format.

    In that case, you can implement `serialize` yourself and
    return data formatted to match your API's expectations, or override
    the invoked adapter method and do the serialization in the adapter directly
    by using the provided snapshot.
    
    If your API's format differs greatly from the JSON:API spec, you should
    consider authoring your own adapter and serializer instead of extending
    this class.

    ```app/serializers/post.js
    import JSONAPISerializer from '@ember-data/serializer/json-api';

    export default class PostSerializer extends JSONAPISerializer {
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
    import JSONAPISerializer from '@ember-data/serializer/json-api';
    import { singularize } from 'ember-inflector';
    import { underscore } from '@ember/string';

    export default class ApplicationSerializer extends JSONAPISerializer {
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
      return underscore(attribute).toUpperCase();
    }

    function serverHasManyName(name) {
      return serverAttributeName(singularize(name)) + '_IDS';
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

    ## Tweaking the Default Formatting

    If you just want to do some small tweaks on the default JSON:API formatted response,
    you can call `super.serialize` first and make the tweaks
    on the returned object.

    ```app/serializers/post.js
    import JSONAPISerializer from '@ember-data/serializer/json-api';

    export default class PostSerializer extends JSONAPISerializer {
      serialize(snapshot, options) {
        let json = super.serialize(...arguments);

        json.data.attributes.subject = json.data.attributes.title;
        delete json.data.attributes.title;

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
    let data = this._super(...arguments);
    data.type = this.payloadKeyFromModelName(snapshot.modelName);

    return { data };
  },

  serializeAttribute(snapshot, json, key, attribute) {
    let type = attribute.type;

    if (this._canSerialize(key)) {
      json.attributes = json.attributes || {};

      let value = snapshot.attr(key);
      if (type) {
        let transform = this.transformFor(type);
        value = transform.serialize(value, attribute.options);
      }

      let payloadKey = this._getMappedKey(key, snapshot.type);

      if (payloadKey === key) {
        payloadKey = this.keyForAttribute(key, 'serialize');
      }

      json.attributes[payloadKey] = value;
    }
  },

  serializeBelongsTo(snapshot, json, relationship) {
    let key = relationship.key;

    if (this._canSerialize(key)) {
      let belongsTo = snapshot.belongsTo(key);
      let belongsToIsNotNew;
      if (CUSTOM_MODEL_CLASS) {
        belongsToIsNotNew = belongsTo && !belongsTo.isNew;
      } else {
        belongsToIsNotNew = belongsTo && belongsTo.record && !belongsTo.record.get('isNew');
      }

      if (belongsTo === null || belongsToIsNotNew) {
        json.relationships = json.relationships || {};

        let payloadKey = this._getMappedKey(key, snapshot.type);
        if (payloadKey === key) {
          payloadKey = this.keyForRelationship(key, 'belongsTo', 'serialize');
        }

        let data = null;
        if (belongsTo) {
          let payloadType = this.payloadKeyFromModelName(belongsTo.modelName);

          data = {
            type: payloadType,
            id: belongsTo.id,
          };
        }

        json.relationships[payloadKey] = { data };
      }
    }
  },

  serializeHasMany(snapshot, json, relationship) {
    let key = relationship.key;

    if (this.shouldSerializeHasMany(snapshot, key, relationship)) {
      let hasMany = snapshot.hasMany(key);
      if (hasMany !== undefined) {
        json.relationships = json.relationships || {};

        let payloadKey = this._getMappedKey(key, snapshot.type);
        if (payloadKey === key && this.keyForRelationship) {
          payloadKey = this.keyForRelationship(key, 'hasMany', 'serialize');
        }

        // only serialize has many relationships that are not new
        let nonNewHasMany = hasMany.filter((item) => item.record && !item.record.get('isNew'));
        let data = new Array(nonNewHasMany.length);

        for (let i = 0; i < nonNewHasMany.length; i++) {
          let item = hasMany[i];
          let payloadType = this.payloadKeyFromModelName(item.modelName);

          data[i] = {
            type: payloadType,
            id: item.id,
          };
        }

        json.relationships[payloadKey] = { data };
      }
    }
  },
});

if (DEBUG) {
  JSONAPISerializer.reopen({
    init(...args) {
      this._super(...args);

      assert(
        `You've used the EmbeddedRecordsMixin in ${this.toString()} which is not fully compatible with the JSON:API specification. Please confirm that this works for your specific API and add \`this.isEmbeddedRecordsMixinCompatible = true\` to your serializer.`,
        !this.isEmbeddedRecordsMixin || this.isEmbeddedRecordsMixinCompatible === true,
        {
          id: 'ds.serializer.embedded-records-mixin-not-supported',
        }
      );

      let constructor = this.constructor;
      warn(
        `You've defined 'extractMeta' in ${constructor.toString()} which is not used for serializers extending JSONAPISerializer. Read more at https://api.emberjs.com/ember-data/release/classes/JSONAPISerializer on how to customize meta when using JSON API.`,
        this.extractMeta === JSONSerializer.prototype.extractMeta,
        {
          id: 'ds.serializer.json-api.extractMeta',
        }
      );
    },
    warnMessageForUndefinedType() {
      return (
        'Encountered a resource object with an undefined type (resolved resource using ' +
        this.constructor.toString() +
        ')'
      );
    },
    warnMessageNoModelForType(modelName, originalType, usedLookup) {
      return `Encountered a resource object with type "${originalType}", but no model was found for model name "${modelName}" (resolved model name using '${this.constructor.toString()}.${usedLookup}("${originalType}")').`;
    },
  });
}

export default JSONAPISerializer;
