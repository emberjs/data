import Model from 'ember-data/system/model/model';
import ArrayPolyfills from 'ember-data/ext/ember/array';

var forEach = ArrayPolyfills.forEach;
var map = ArrayPolyfills.map;
var get = Ember.get;

/**
  This is a helper method that always returns a JSON-API Document.

  If the current serializer has `isNewSerializerAPI` set to `true`
  this helper calls `normalizeResponse` instead of `extract`.

  All the built-in serializers get `isNewSerializerAPI` set to `true` automatically
  if the feature flag is enabled.

  @method normalizeResponseHelper
  @param {DS.Serializer} serializer
  @param {DS.Store} store
  @param {subclass of DS.Model} modelClass
  @param {Object} payload
  @param {String|Number} id
  @param {String} requestType
  @return {Object} JSON-API Document
*/
export function normalizeResponseHelper(serializer, store, modelClass, payload, id, requestType) {
  if (serializer.get('isNewSerializerAPI')) {
    return serializer.normalizeResponse(store, modelClass, payload, id, requestType);
  } else {
    Ember.deprecate('Your custom serializer uses the old version of the Serializer API, with `extract` hooks. Please upgrade your serializers to the new Serializer API using `normalizeResponse` hooks instead.');
    let serializerPayload = serializer.extract(store, modelClass, payload, id, requestType);
    return _normalizeSerializerPayload(modelClass, serializerPayload);
  }
}

/**
  Convert the payload from `serializer.extract` to a JSON-API Document.

  @method _normalizeSerializerPayload
  @private
  @param {subclass of DS.Model} modelClass
  @param {Object} payload
  @return {Object} JSON-API Document
*/
export function _normalizeSerializerPayload(modelClass, payload) {
  let data = null;

  if (payload) {
    if (Ember.isArray(payload)) {
      data = map.call(payload, (payload) => {
        return _normalizeSerializerPayloadItem(modelClass, payload);
      });
    } else {
      data = _normalizeSerializerPayloadItem(modelClass, payload);
    }
  }

  return { data };
}

/**
  Convert the payload representing a single record from `serializer.extract` to
  a JSON-API Resource Object.

  @method _normalizeSerializerPayloadItem
  @private
  @param {subclass of DS.Model} modelClass
  @param {Object} payload
  @return {Object} JSON-API Resource Object
*/
export function _normalizeSerializerPayloadItem(modelClass, itemPayload) {
  var item = {};

  item.id = '' + itemPayload.id;
  item.type = modelClass.modelName;
  item.attributes = {};
  item.relationships = {};

  modelClass.eachAttribute(function(name) {
    if (itemPayload.hasOwnProperty(name)) {
      item.attributes[name] = itemPayload[name];
    }
  });

  modelClass.eachRelationship(function(key, relationshipMeta) {
    var relationship, value;

    if (itemPayload.hasOwnProperty(key)) {
      relationship = {};
      value = itemPayload[key];
      let normalizeRelationshipData = function(value, relationshipMeta) {
        if (Ember.isNone(value)) {
          return null;
        }
        //Temporary support for https://github.com/emberjs/data/issues/3271
        if (value instanceof Model) {
          value = { id: value.id, type: value.constructor.modelName };
        }
        if (Ember.typeOf(value) === 'object') {
          Ember.assert('Ember Data expected a number or string to represent the record(s) in the `' + key + '` relationship instead it found an object. If this is a polymorphic relationship please specify a `type` key. If this is an embedded relationship please include the `DS.EmbeddedRecordsMixin` and specify the `' + key +'` property in your serializer\'s attrs object.', value.type);
          if (value.id) {
            value.id = `${value.id}`;
          }
          return value;
        }

        Ember.assert("A " + relationshipMeta.parentType + " record was pushed into the store with the value of " + key + " being " + Ember.inspect(value) + ", but " + key + " is a belongsTo relationship so the value must not be an array. You should probably check your data payload or serializer.", !Ember.isArray(value));
        return { id: `${value}`, type: relationshipMeta.type };
      };

      if (relationshipMeta.kind === 'belongsTo') {
        relationship.data = normalizeRelationshipData(value, relationshipMeta);
        //handle the belongsTo polymorphic case, where { post:1, postType: 'video' }
        if (relationshipMeta.options && relationshipMeta.options.polymorphic && itemPayload[key + 'Type']) {
          relationship.data.type = itemPayload[key + 'Type'];
        }
      } else if (relationshipMeta.kind === 'hasMany') {
        //|| [] because the hasMany could be === null
        Ember.assert("A " + relationshipMeta.parentType + " record was pushed into the store with the value of " + key + " being '" + Ember.inspect(value) + "', but " + key + " is a hasMany relationship so the value must be an array. You should probably check your data payload or serializer.", Ember.isArray(value) || value === null);

        var relationshipData = Ember.A(value || []);
        relationship.data = map.call(relationshipData, function(item) {
          return normalizeRelationshipData(item, relationshipMeta);
        });
      }
    }

    if (itemPayload.links && itemPayload.links.hasOwnProperty(key)) {
      relationship = relationship || {};
      value = itemPayload.links[key];

      relationship.links = {
        related: value
      };
    }

    if (relationship) {
      relationship.meta = get(itemPayload, `meta.${key}`);
      item.relationships[key] = relationship;
    }
  });

  return item;
}

/**
  Push a JSON-API Document to the store.

  This will push both primary data located in `data` and secondary data located
  in `included` (if present).

  @method pushPayload
  @param {DS.Store} store
  @param {Object} payload
  @return {DS.Model|Array} one or multiple records from `data`
*/
export function pushPayload(store, payload) {
  var result = pushPayloadData(store, payload);
  pushPayloadIncluded(store, payload);
  return result;
}

/**
  Push the primary data of a JSON-API Document to the store.

  This method only pushes the primary data located in `data`.

  @method pushPayloadData
  @param {DS.Store} store
  @param {Object} payload
  @return {DS.Model|Array} one or multiple records from `data`
*/
export function pushPayloadData(store, payload) {
  var result;
  if (payload && payload.data) {
    if (Ember.isArray(payload.data)) {
      result = map.call(payload.data, (item) => {
        return _pushResourceObject(store, item);
      });
    } else {
      result = _pushResourceObject(store, payload.data);
    }
  }
  return result;
}

/**
  Push the secondary data of a JSON-API Document to the store.

  This method only pushes the secondary data located in `included`.

  @method pushPayloadIncluded
  @param {DS.Store} store
  @param {Object} payload
  @return {Array} an array containing zero or more records from `included`
*/
export function pushPayloadIncluded(store, payload) {
  var result;
  if (payload && payload.included && Ember.isArray(payload.included)) {
    result = map.call(payload.included, (item) => {
      return _pushResourceObject(store, item);
    });
  }
  return result;
}

/**
  Push a single JSON-API Resource Object to the store.

  @method _pushResourceObject
  @private
  @param {Object} resourceObject
  @return {DS.Model} a record
*/
export function _pushResourceObject(store, resourceObject) {
  return store.push({ data: resourceObject });
}

/**
  This method converts a JSON-API Resource Object to a format that DS.Store
  understands.

  TODO: This method works as an interim until DS.Store understands JSON-API.

  @method convertResourceObject
  @param {Object} payload
  @return {Object} an object formatted the way DS.Store understands
*/
export function convertResourceObject(payload) {
  if (!payload) {
    return payload;
  }

  var data = {
    id: payload.id,
    type: payload.type,
    links: {}
  };

  if (payload.attributes) {
    var attributeKeys = Ember.keys(payload.attributes);
    forEach.call(attributeKeys, function(key) {
      var attribute = payload.attributes[key];
      data[key] = attribute;
    });
  }
  if (payload.relationships) {
    var relationshipKeys = Ember.keys(payload.relationships);
    forEach.call(relationshipKeys, function(key) {
      var relationship = payload.relationships[key];
      if (relationship.hasOwnProperty('data')) {
        data[key] = relationship.data;
      } else if (relationship.links && relationship.links.related) {
        data.links[key] = relationship.links.related;
      }
    });
  }
  return data;
}
