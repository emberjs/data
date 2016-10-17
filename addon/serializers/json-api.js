/**
  @module ember-data
*/

import Ember from 'ember';
import { assert, deprecate, runInDebug, warn } from 'ember-data/-private/debug';
import JSONSerializer from 'ember-data/serializers/json';
import normalizeModelName from 'ember-data/-private/system/normalize-model-name';
import { pluralize, singularize } from 'ember-inflector';
import isEnabled from 'ember-data/-private/features';

var dasherize = Ember.String.dasherize;

/**
  Ember Data 2.0 Serializer:

  In Ember Data a Serializer is used to serialize and deserialize
  records when they are transferred in and out of an external source.
  This process involves normalizing property names, transforming
  attribute values and serializing relationships.

  `JSONAPISerializer` supports the http://jsonapi.org/ spec and is the
  serializer recommended by Ember Data.

  This serializer normalizes a JSON API payload that looks like:

  ```js

    // models/player.js
    import DS from "ember-data";

    export default DS.Model.extend({
      name: DS.attr(),
      skill: DS.attr(),
      gamesPlayed: DS.attr(),
      club: DS.belongsTo('club')
    });

    // models/club.js
    import DS from "ember-data";

    export default DS.Model.extend({
      name: DS.attr(),
      location: DS.attr(),
      players: DS.hasMany('player')
    });
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

  @since 1.13.0
  @class JSONAPISerializer
  @namespace DS
  @extends DS.JSONSerializer
*/
const JSONAPISerializer = JSONSerializer.extend({

  /**
    @method _normalizeDocumentHelper
    @param {Object} documentHash
    @return {Object}
    @private
  */
  _normalizeDocumentHelper(documentHash) {

    if (Ember.typeOf(documentHash.data) === 'object') {
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
      let ret = new Array(documentHash.included.length);

      for (let i = 0; i < documentHash.included.length; i++) {
        let included = documentHash.included[i];
        ret[i] = this._normalizeResourceHelper(included);
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
    if (isEnabled("ds-payload-type-hooks")) {
      let modelName = this.modelNameFromPayloadType(relationshipDataHash.type);
      let deprecatedModelNameLookup = this.modelNameFromPayloadKey(relationshipDataHash.type);

      if (modelName !== deprecatedModelNameLookup && this._hasCustomModelNameFromPayloadKey()) {
        deprecate("You are using modelNameFromPayloadKey to normalize the type for a relationship. This has been deprecated in favor of modelNameFromPayloadType", false, {
          id: 'ds.json-api-serializer.deprecated-model-name-for-relationship',
          until: '3.0.0'
        });

        modelName = deprecatedModelNameLookup;
      }

      relationshipDataHash.type = modelName;
    } else {
      let type = this.modelNameFromPayloadKey(relationshipDataHash.type);
      relationshipDataHash.type = type;
    }

    return relationshipDataHash;
  },

  /**
    @method _normalizeResourceHelper
    @param {Object} resourceHash
    @return {Object}
    @private
  */
  _normalizeResourceHelper(resourceHash) {
    assert(this.warnMessageForUndefinedType(), !Ember.isNone(resourceHash.type), {
      id: 'ds.serializer.type-is-undefined'
    });

    let modelName, usedLookup;

    if (isEnabled("ds-payload-type-hooks")) {
      modelName = this.modelNameFromPayloadType(resourceHash.type);
      let deprecatedModelNameLookup = this.modelNameFromPayloadKey(resourceHash.type);

      usedLookup = 'modelNameFromPayloadType';

      if (modelName !== deprecatedModelNameLookup && this._hasCustomModelNameFromPayloadKey()) {
        deprecate("You are using modelNameFromPayloadKey to normalize the type for a resource. This has been deprecated in favor of modelNameFromPayloadType", false, {
          id: 'ds.json-api-serializer.deprecated-model-name-for-resource',
          until: '3.0.0'
        });

        modelName = deprecatedModelNameLookup;
        usedLookup = 'modelNameFromPayloadKey';
      }
    } else {
      modelName = this.modelNameFromPayloadKey(resourceHash.type);
      usedLookup = 'modelNameFromPayloadKey';
    }

    if (!this.store._hasModelFor(modelName)) {
      warn(this.warnMessageNoModelForType(modelName, resourceHash.type, usedLookup), false, {
        id: 'ds.serializer.model-for-type-missing'
      });
      return null;
    }

    let modelClass = this.store.modelFor(modelName);
    let serializer = this.store.serializerFor(modelName);
    let { data } = serializer.normalize(modelClass, resourceHash);
    return data;
  },

  /**
    @method pushPayload
    @param {DS.Store} store
    @param {Object} payload
  */
  pushPayload(store, payload) {
    let normalizedPayload = this._normalizeDocumentHelper(payload);
    if (isEnabled('ds-pushpayload-return')) {
      return store.push(normalizedPayload);
    } else {
      store.push(normalizedPayload);
    }
  },

  /**
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
    let normalizedPayload = this._normalizeDocumentHelper(payload);
    return normalizedPayload;
  },

  normalizeQueryRecordResponse() {
    let normalized = this._super(...arguments);

    assert('Expected the primary data returned by the serializer for a `queryRecord` response to be a single object but instead it was an array.', !Array.isArray(normalized.data), {
      id: 'ds.serializer.json-api.queryRecord-array-response'
    });

    return normalized;
  },

  /**
    @method extractAttributes
    @param {DS.Model} modelClass
    @param {Object} resourceHash
    @return {Object}
  */
  extractAttributes(modelClass, resourceHash) {
    var attributes = {};

    if (resourceHash.attributes) {
      modelClass.eachAttribute((key) => {
        let attributeKey = this.keyForAttribute(key, 'deserialize');
        if (resourceHash.attributes[attributeKey] !== undefined) {
          attributes[key] = resourceHash.attributes[attributeKey];
        }
      });
    }

    return attributes;
  },

  /**
    @method extractRelationship
    @param {Object} relationshipHash
    @return {Object}
  */
  extractRelationship(relationshipHash) {

    if (Ember.typeOf(relationshipHash.data) === 'object') {
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
    @method extractRelationships
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
      });
    }

    return relationships;
  },

  /**
    @method _extractType
    @param {DS.Model} modelClass
    @param {Object} resourceHash
    @return {String}
    @private
  */
  _extractType(modelClass, resourceHash) {
    if (isEnabled("ds-payload-type-hooks")) {
      let modelName = this.modelNameFromPayloadType(resourceHash.type);
      let deprecatedModelNameLookup = this.modelNameFromPayloadKey(resourceHash.type);

      if (modelName !== deprecatedModelNameLookup && this._hasCustomModelNameFromPayloadKey()) {
        deprecate("You are using modelNameFromPayloadKey to normalize the type for a polymorphic relationship. This has been deprecated in favor of modelNameFromPayloadType", false, {
          id: 'ds.json-api-serializer.deprecated-model-name-for-polymorphic-type',
          until: '3.0.0'
        });

        modelName = deprecatedModelNameLookup;
      }

      return modelName;
    } else {
      return this.modelNameFromPayloadKey(resourceHash.type);
    }
  },

  /**
    @method modelNameFromPayloadKey
    @param {String} key
    @return {String} the model's modelName
  */
  // TODO @deprecated Use modelNameFromPayloadType instead
  modelNameFromPayloadKey(key) {
    return singularize(normalizeModelName(key));
  },

  /**
    @method payloadKeyFromModelName
    @param {String} modelName
    @return {String}
  */
  // TODO @deprecated Use payloadTypeFromModelName instead
  payloadKeyFromModelName(modelName) {
    return pluralize(modelName);
  },

  /**
    @method normalize
    @param {DS.Model} modelClass
    @param {Object} resourceHash the resource hash from the adapter
    @return {Object} the normalized resource hash
  */
  normalize(modelClass, resourceHash) {
    if (resourceHash.attributes) {
      this.normalizeUsingDeclaredMapping(modelClass, resourceHash.attributes);
    }

    if (resourceHash.relationships) {
      this.normalizeUsingDeclaredMapping(modelClass, resourceHash.relationships);
    }

    let data = {
      id:            this.extractId(modelClass, resourceHash),
      type:          this._extractType(modelClass, resourceHash),
      attributes:    this.extractAttributes(modelClass, resourceHash),
      relationships: this.extractRelationships(modelClass, resourceHash)
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
   import DS from 'ember-data';

   export default DS.JSONAPISerializer.extend({
     keyForAttribute: function(attr, method) {
       return Ember.String.dasherize(attr).toUpperCase();
     }
   });
   ```

   @method keyForAttribute
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
    import DS from 'ember-data';

    export default DS.JSONAPISerializer.extend({
      keyForRelationship: function(key, relationship, method) {
        return Ember.String.underscore(key);
      }
    });
    ```
   @method keyForRelationship
   @param {String} key
   @param {String} typeClass
   @param {String} method
   @return {String} normalized key
  */
  keyForRelationship(key, typeClass, method) {
    return dasherize(key);
  },

  /**
    @method serialize
    @param {DS.Snapshot} snapshot
    @param {Object} options
    @return {Object} json
  */
  serialize(snapshot, options) {
    let data = this._super(...arguments);

    let payloadType;
    if (isEnabled("ds-payload-type-hooks")) {
      payloadType = this.payloadTypeFromModelName(snapshot.modelName);
      let deprecatedPayloadTypeLookup = this.payloadKeyFromModelName(snapshot.modelName);

      if (payloadType !== deprecatedPayloadTypeLookup && this._hasCustomPayloadKeyFromModelName()) {
        deprecate("You used payloadKeyFromModelName to customize how a type is serialized. Use payloadTypeFromModelName instead.", false, {
          id: 'ds.json-api-serializer.deprecated-payload-type-for-model',
          until: '3.0.0'
        });

        payloadType = deprecatedPayloadTypeLookup;
      }
    } else {
      payloadType = this.payloadKeyFromModelName(snapshot.modelName);
    }

    data.type = payloadType;
    return { data };
  },

  /**
   @method serializeAttribute
   @param {DS.Snapshot} snapshot
   @param {Object} json
   @param {String} key
   @param {Object} attribute
  */
  serializeAttribute(snapshot, json, key, attribute) {
    const type = attribute.type;

    if (this._canSerialize(key)) {
      json.attributes = json.attributes || {};

      let value = snapshot.attr(key);
      if (type) {
        const transform = this.transformFor(type);
        value = transform.serialize(value, attribute.options);
      }

      let payloadKey = this._getMappedKey(key, snapshot.type);

      if (payloadKey === key) {
        payloadKey = this.keyForAttribute(key, 'serialize');
      }

      json.attributes[payloadKey] = value;
    }
  },

  /**
   @method serializeBelongsTo
   @param {DS.Snapshot} snapshot
   @param {Object} json
   @param {Object} relationship
  */
  serializeBelongsTo(snapshot, json, relationship) {
    var key = relationship.key;

    if (this._canSerialize(key)) {
      var belongsTo = snapshot.belongsTo(key);
      if (belongsTo !== undefined) {

        json.relationships = json.relationships || {};

        var payloadKey = this._getMappedKey(key, snapshot.type);
        if (payloadKey === key) {
          payloadKey = this.keyForRelationship(key, 'belongsTo', 'serialize');
        }

        let data = null;
        if (belongsTo) {
          let payloadType;

          if (isEnabled("ds-payload-type-hooks")) {
            payloadType = this.payloadTypeFromModelName(belongsTo.modelName);
            let deprecatedPayloadTypeLookup = this.payloadKeyFromModelName(belongsTo.modelName);

            if (payloadType !== deprecatedPayloadTypeLookup && this._hasCustomPayloadKeyFromModelName()) {
              deprecate("You used payloadKeyFromModelName to serialize type for belongs-to relationship. Use payloadTypeFromModelName instead.", false, {
                id: 'ds.json-api-serializer.deprecated-payload-type-for-belongs-to',
                until: '3.0.0'
              });

              payloadType = deprecatedPayloadTypeLookup;
            }
          } else {
            payloadType = this.payloadKeyFromModelName(belongsTo.modelName);
          }

          data = {
            type: payloadType,
            id: belongsTo.id
          };
        }

        json.relationships[payloadKey] = { data };
      }
    }
  },

  /**
   @method serializeHasMany
   @param {DS.Snapshot} snapshot
   @param {Object} json
   @param {Object} relationship
  */
  serializeHasMany(snapshot, json, relationship) {
    var key = relationship.key;
    var shouldSerializeHasMany = '_shouldSerializeHasMany';
    if (isEnabled("ds-check-should-serialize-relationships")) {
      shouldSerializeHasMany = 'shouldSerializeHasMany';
    }

    if (this[shouldSerializeHasMany](snapshot, key, relationship)) {
      var hasMany = snapshot.hasMany(key);
      if (hasMany !== undefined) {

        json.relationships = json.relationships || {};

        var payloadKey = this._getMappedKey(key, snapshot.type);
        if (payloadKey === key && this.keyForRelationship) {
          payloadKey = this.keyForRelationship(key, 'hasMany', 'serialize');
        }

        let data = new Array(hasMany.length);

        for (let i = 0; i < hasMany.length; i++) {
          let item = hasMany[i];

          let payloadType;

          if (isEnabled("ds-payload-type-hooks")) {
            payloadType = this.payloadTypeFromModelName(item.modelName);
            let deprecatedPayloadTypeLookup = this.payloadKeyFromModelName(item.modelName);

            if (payloadType !== deprecatedPayloadTypeLookup && this._hasCustomPayloadKeyFromModelName()) {
              deprecate("You used payloadKeyFromModelName to serialize type for belongs-to relationship. Use payloadTypeFromModelName instead.", false, {
                id: 'ds.json-api-serializer.deprecated-payload-type-for-has-many',
                until: '3.0.0'
              });

              payloadType = deprecatedPayloadTypeLookup;
            }
          } else {
            payloadType = this.payloadKeyFromModelName(item.modelName);
          }

          data[i] = {
            type: payloadType,
            id: item.id
          };
        }

        json.relationships[payloadKey] = { data };
      }
    }
  }
});

if (isEnabled("ds-payload-type-hooks")) {

  JSONAPISerializer.reopen({

    /**
      `modelNameFromPayloadType` can be used to change the mapping for a DS model
      name, taken from the value in the payload.

      Say your API namespaces the type of a model and returns the following
      payload for the `post` model:

      ```javascript
      // GET /api/posts/1
      {
        "data": {
          "id": 1,
          "type: "api::v1::post"
        }
      }
      ```

      By overwriting `modelNameFromPayloadType` you can specify that the
      `post` model should be used:

      ```app/serializers/application.js
      import DS from "ember-data";

      export default DS.JSONAPISerializer.extend({
        modelNameFromPayloadType(payloadType) {
          return payloadType.replace('api::v1::', '');
        }
      });
      ```

      By default the modelName for a model is its singularized name in dasherized
      form.  Usually, Ember Data can use the correct inflection to do this for
      you. Most of the time, you won't need to override
      `modelNameFromPayloadType` for this purpose.

      Also take a look at
      [payloadTypeFromModelName](#method_payloadTypeFromModelName) to customize
      how the type of a record should be serialized.

      @method modelNameFromPayloadType
      @public
      @param {String} payloadType type from payload
      @return {String} modelName
    */
    modelNameFromPayloadType(type) {
      return singularize(normalizeModelName(type));
    },

    /**
      `payloadTypeFromModelName` can be used to change the mapping for the type in
      the payload, taken from the model name.

      Say your API namespaces the type of a model and expects the following
      payload when you update the `post` model:

      ```javascript
      // POST /api/posts/1
      {
        "data": {
          "id": 1,
          "type": "api::v1::post"
        }
      }
      ```

      By overwriting `payloadTypeFromModelName` you can specify that the
      namespaces model name for the `post` should be used:

      ```app/serializers/application.js
      import DS from "ember-data";

      export default JSONAPISerializer.extend({
        payloadTypeFromModelName(modelName) {
          return "api::v1::" + modelName;
        }
      });
      ```

      By default the payload type is the pluralized model name. Usually, Ember
      Data can use the correct inflection to do this for you. Most of the time,
      you won't need to override `payloadTypeFromModelName` for this purpose.

      Also take a look at
      [modelNameFromPayloadType](#method_modelNameFromPayloadType) to customize
      how the model name from should be mapped from the payload.

      @method payloadTypeFromModelName
      @public
      @param {String} modelname modelName from the record
      @return {String} payloadType
    */
    payloadTypeFromModelName(modelName) {
      return pluralize(modelName);
    },

    _hasCustomModelNameFromPayloadKey() {
      return this.modelNameFromPayloadKey !== JSONAPISerializer.prototype.modelNameFromPayloadKey;
    },

    _hasCustomPayloadKeyFromModelName() {
      return this.payloadKeyFromModelName !== JSONAPISerializer.prototype.payloadKeyFromModelName;
    }

  });

}

runInDebug(function() {
  JSONAPISerializer.reopen({
    willMergeMixin(props) {
      warn('The JSONAPISerializer does not work with the EmbeddedRecordsMixin because the JSON API spec does not describe how to format embedded resources.', !props.isEmbeddedRecordsMixin, {
        id: 'ds.serializer.embedded-records-mixin-not-supported'
      });
    },
    warnMessageForUndefinedType() {
      return 'Encountered a resource object with an undefined type (resolved resource using ' + this.constructor.toString() + ')';
    },
    warnMessageNoModelForType(modelName, originalType, usedLookup) {
      return `Encountered a resource object with type "${originalType}", but no model was found for model name "${modelName}" (resolved model name using '${this.constructor.toString()}.${usedLookup}("${originalType}")).`;
    }
  });
});

export default JSONAPISerializer;
