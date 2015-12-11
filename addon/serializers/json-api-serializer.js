/**
  @module ember-data
*/

import Ember from 'ember';
import { assert, runInDebug, warn } from 'ember-data/debug';
import JSONSerializer from 'ember-data/serializers/json-serializer';
import normalizeModelName from 'ember-data/system/normalize-model-name';
import { pluralize, singularize } from 'ember-inflector';

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
    } else if (Ember.typeOf(documentHash.data) === 'array') {
      documentHash.data = documentHash.data.map(this._normalizeResourceHelper, this);
    }

    if (Ember.typeOf(documentHash.included) === 'array') {
      documentHash.included = documentHash.included.map(this._normalizeResourceHelper, this);
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
    let type = this.modelNameFromPayloadKey(relationshipDataHash.type);
    relationshipDataHash.type = type;
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

    let modelName = this.modelNameFromPayloadKey(resourceHash.type);

    if (!this.store._hasModelFor(modelName)) {
      warn(this.warnMessageNoModelForType(modelName, resourceHash.type), false, {
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
    store.push(normalizedPayload);
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

  normalizeQueryRecordResponse(store, primaryModelClass, payload, id, requestType) {
    let normalizedPayload = this._normalizeResponse(store, primaryModelClass, payload, id, requestType, false);

    if (Array.isArray(normalizedPayload.data)) {
      // If the store is expecting a single response normalize the
      // payload and move the extra records into the included array.
      let arrayData = normalizedPayload.data;
      let included = normalizedPayload.included || [];
      normalizedPayload.data = arrayData[0];
      normalizedPayload.included = included.concat(arrayData.slice(1));
      return normalizedPayload;
    }

    return normalizedPayload;
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
        if (resourceHash.attributes.hasOwnProperty(attributeKey)) {
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

    if (Ember.typeOf(relationshipHash.data) === 'array') {
      relationshipHash.data = relationshipHash.data.map(this._normalizeRelationshipDataHelper, this);
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
        if (resourceHash.relationships.hasOwnProperty(relationshipKey)) {

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
    return this.modelNameFromPayloadKey(resourceHash.type);
  },

  /**
    @method modelNameFromPayloadKey
    @param {String} key
    @return {String} the model's modelName
  */
  modelNameFromPayloadKey(key) {
    return singularize(normalizeModelName(key));
  },

  /**
    @method payloadKeyFromModelName
    @param {String} modelName
    @return {String}
  */
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
    data.type = this.payloadKeyFromModelName(snapshot.modelName);
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
        value = transform.serialize(value);
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
          data = {
            type: this.payloadKeyFromModelName(belongsTo.modelName),
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

    if (this._shouldSerializeHasMany(snapshot, key, relationship)) {
      var hasMany = snapshot.hasMany(key);
      if (hasMany !== undefined) {

        json.relationships = json.relationships || {};

        var payloadKey = this._getMappedKey(key, snapshot.type);
        if (payloadKey === key && this.keyForRelationship) {
          payloadKey = this.keyForRelationship(key, 'hasMany', 'serialize');
        }

        let data = hasMany.map((item) => {
          return {
            type: this.payloadKeyFromModelName(item.modelName),
            id: item.id
          };
        });

        json.relationships[payloadKey] = { data };
      }
    }
  }
});

runInDebug(function() {
  JSONAPISerializer.reopen({
    warnMessageForUndefinedType() {
      return 'Encountered a resource object with an undefined type (resolved resource using ' + this.constructor.toString() + ')';
    },
    warnMessageNoModelForType(modelName, originalType) {
      return 'Encountered a resource object with type "' + originalType + '", but no model was found for model name "' + modelName + '" (resolved model name using ' + this.constructor.toString() + '.modelNameFromPayloadKey("' + originalType + '"))';
    }
  });
});

export default JSONAPISerializer;
