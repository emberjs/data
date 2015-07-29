import Model from 'ember-data/system/model/model';

const get = Ember.get;

/**
  This is a helper method that validates a JSON API top-level document

  The format of a document is described here:
  http://jsonapi.org/format/#document-top-level

  @method validateDocumentStructure
  @param {Object} doc JSON API document
  @return {array} An array of errors found in the document structure
*/
export function validateDocumentStructure(doc) {
  let errors = [];
  if (!doc || typeof doc !== 'object') {
    errors.push('Top level of a JSON API document must be an object');
  } else {
    if (!('data' in doc) &&
        !('errors' in doc) &&
        !('meta' in doc)) {
      errors.push('One or more of the following keys must be present: "data", "errors", "meta".');
    } else {
      if (('data' in doc) && ('errors' in doc)) {
        errors.push('Top level keys "errors" and "data" cannot both be present in a JSON API document');
      }
    }
    if ('data' in doc) {
      if (!(doc.data === null || Ember.isArray(doc.data) || typeof doc.data === 'object')) {
        errors.push('data must be null, an object, or an array');
      }
    }
    if ('meta' in doc) {
      if (typeof doc.meta !== 'object') {
        errors.push('meta must be an object');
      }
    }
    if ('errors' in doc) {
      if (!Ember.isArray(doc.errors)) {
        errors.push('errors must be an array');
      }
    }
    if ('links' in doc) {
      if (typeof doc.links !== 'object') {
        errors.push('links must be an object');
      }
    }
    if ('jsonapi' in doc) {
      if (typeof doc.jsonapi !== 'object') {
        errors.push('jsonapi must be an object');
      }
    }
    if ('included' in doc) {
      if (typeof doc.included !== 'object') {
        errors.push('included must be an array');
      }
    }
  }

  return errors;
}

/**
  This is a helper method that always returns a JSON-API Document.

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
  let normalizedResponse = serializer.normalizeResponse(store, modelClass, payload, id, requestType);
  let validationErrors = [];
  Ember.runInDebug(() => {
    validationErrors = validateDocumentStructure(normalizedResponse);
  });
  Ember.assert(`normalizeResponse must return a valid JSON API document:\n\t* ${validationErrors.join('\n\t* ')}`, Ember.isEmpty(validationErrors));
  // TODO: Remove after metadata refactor
  if (normalizedResponse.meta) {
    store._setMetadataFor(modelClass.modelName, normalizedResponse.meta);
  }

  return normalizedResponse;
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
    if (Array.isArray(payload)) {
      data = payload.map((payload) => _normalizeSerializerPayloadItem(modelClass, payload));
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

  modelClass.eachAttribute((name) => {
    if (itemPayload.hasOwnProperty(name)) {
      item.attributes[name] = itemPayload[name];
    }
  });

  modelClass.eachRelationship((key, relationshipMeta) => {
    var relationship, value;

    if (itemPayload.hasOwnProperty(key)) {
      relationship = {};
      value = itemPayload[key];

      if (relationshipMeta.kind === 'belongsTo') {
        relationship.data = normalizeRelationshipData(key, value, relationshipMeta);
        //handle the belongsTo polymorphic case, where { post:1, postType: 'video' }
        if (relationshipMeta.options && relationshipMeta.options.polymorphic && itemPayload[key + 'Type']) {
          relationship.data.type = itemPayload[key + 'Type'];
        }
      } else if (relationshipMeta.kind === 'hasMany') {
        //|| [] because the hasMany could be === null
        Ember.assert(`A  ${relationshipMeta.parentType} record was pushed into the store with the value of ${key} being ${Ember.inspect(value)}, but ${key} is a hasMany relationship so the value must be an array. You should probably check your data payload or serializer.`, Ember.isArray(value) || value === null);

        relationship.data = (value || []).map((item) => normalizeRelationshipData(key, item, relationshipMeta));
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

function normalizeRelationshipData(key, value, relationshipMeta) {
  if (Ember.isNone(value)) {
    return null;
  }
  //Temporary support for https://github.com/emberjs/data/issues/3271
  if (value instanceof Model) {
    value = { id: value.id, type: value.constructor.modelName };
  }
  if (Ember.typeOf(value) === 'object') {
    Ember.assert(`Ember Data expected a number or string to represent the record(s) in the '${key}' relationship instead it found an object. If this is a polymorphic relationship please specify a 'type' key. If this is an embedded relationship please include the 'DS.EmbeddedRecordsMixin' and specify the '${key}' property in your serializer's attrs object.`, value.type);
    if (value.id) {
      value.id = `${value.id}`;
    }
    return value;
  }

  Ember.assert(`A  ${relationshipMeta.parentType} record was pushed into the store with the value of ${key} being ${Ember.inspect(value)}, but  ${key} is a belongsTo relationship so the value must not be an array. You should probably check your data payload or serializer.`, !Ember.isArray(value));
  return { id: `${value}`, type: relationshipMeta.type };
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
    var attributeKeys = Object.keys(payload.attributes);
    attributeKeys.forEach((key) => data[key] = payload.attributes[key]);
  }
  if (payload.relationships) {
    var relationshipKeys = Object.keys(payload.relationships);
    relationshipKeys.forEach((key) => {
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
