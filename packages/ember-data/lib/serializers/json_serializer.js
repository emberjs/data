var get = Ember.get, set = Ember.set, isNone = Ember.isNone;

// Simple dispatcher to support overriding the aliased
// method in subclasses.
function aliasMethod(methodName) {
  return function() {
    return this[methodName].apply(this, arguments);
  };
}

DS.JSONSerializer = Ember.Object.extend({
  primaryKey: 'id',

  deserialize: function(type, data) {
    var store = get(this, 'store');

    type.eachTransformedAttribute(function(key, type) {
      var transform = this.transformFor(type);
      data[key] = transform.deserialize(data[key]);
    }, this);

    type.eachRelationship(function(key, relationship) {
      // A link (usually a URL) was already provided in
      // normalized form
      if (data.links && data.links[key]) {
        return;
      }

      var type = relationship.type,
          value = data[key];

      if (value == null) { return; }

      if (relationship.kind === 'belongsTo') {
        this.deserializeRecordId(data, key, relationship, value);
      } else if (relationship.kind === 'hasMany') {
        this.deserializeRecordIds(data, key, relationship, value);
      }
    }, this);

    return data;
  },

  deserializeRecordId: function(data, key, relationship, id) {
    if (isNone(id) || id instanceof DS.Model) {
      return;
    }

    var type;

    if (typeof id === 'number' || typeof id === 'string') {
      type = this.typeFor(relationship, key, data);
      data[key] = get(this, 'store').recordForId(type, id);
    } else if (typeof id === 'object') {
      // polymorphic
      data[key] = get(this, 'store').recordForId(id.type, id.id);
    }
  },

  deserializeRecordIds: function(data, key, relationship, ids) {
    for (var i=0, l=ids.length; i<l; i++) {
      this.deserializeRecordId(ids, i, relationship, ids[i]);
    }
  },

  // SERIALIZE

  serialize: function(record, options) {
    var store = get(this, 'store');

    var json = {};

    if (options && options.includeId) {
      var id = get(record, 'id');

      if (id) {
        json[get(this, 'primaryKey')] = get(record, 'id');
      }
    }

    record.eachAttribute(function(key, attribute) {
      this.serializeAttribute(record, json, key, attribute);
    }, this);

    record.eachRelationship(function(key, relationship) {
      if (relationship.kind === 'belongsTo') {
        this.serializeBelongsTo(record, json, relationship);
      } else if (relationship.kind === 'hasMany') {
        this.serializeHasMany(record, json, relationship);
      }
    }, this);

    return json;
  },

  serializeAttribute: function(record, json, key, attribute) {
    var attrs = get(this, 'attrs');
    var value = get(record, key), type = attribute.type;

    if (type) {
      var transform = this.transformFor(type);
      value = transform.serialize(value);
    }

    // if provided, use the mapping provided by `attrs` in
    // the serializer
    key = attrs && attrs[key] || key;

    json[key] = value;
  },

  serializeBelongsTo: function(record, json, relationship) {
    var key = relationship.key;

    var belongsTo = get(record, key);

    if (isNone(belongsTo)) { return; }

    json[key] = get(belongsTo, 'id');

    if (relationship.options.polymorphic) {
      json[key + "_type"] = belongsTo.constructor.typeKey;
    }
  },

  serializeHasMany: function(record, json, relationship) {
    var key = relationship.key;

    var relationshipType = DS.RelationshipChange.determineRelationshipType(record.constructor, relationship);

    if (relationshipType === 'manyToNone' || relationshipType === 'manyToMany') {
      json[key] = get(record, key).mapBy('id');
      // TODO support for polymorphic manyToNone and manyToMany relationships
    }
  },

  // EXTRACT

  extract: function(store, type, payload, id, requestType) {
    this.extractMeta(store, type, payload);

    var specificExtract = "extract" + requestType.charAt(0).toUpperCase() + requestType.substr(1);
    return this[specificExtract](store, type, payload, id, requestType);
  },

  extractFindAll: aliasMethod('extractArray'),
  extractFindQuery: aliasMethod('extractArray'),
  extractFindMany: aliasMethod('extractArray'),
  extractFindHasMany: aliasMethod('extractArray'),

  extractCreateRecord: aliasMethod('extractSave'),
  extractUpdateRecord: aliasMethod('extractSave'),
  extractDeleteRecord: aliasMethod('extractSave'),

  extractFind: aliasMethod('extractSingle'),
  extractSave: aliasMethod('extractSingle'),

  extractSingle: function(store, type, payload) {
    return payload;
  },

  extractArray: function(store, type, payload) {
    return payload;
  },

  extractMeta: function(store, type, payload) {
    if (payload && payload.meta) {
      store.metaForType(type, payload.meta);
      delete payload.meta;
    }
  },

  // HELPERS

  typeFor: function(relationship, key, data) {
    if (relationship.options.polymorphic) {
      return data[key + "_type"];
    } else {
      return relationship.type;
    }
  },

  transformFor: function(attributeType) {
    return this.container.lookup('transform:' + attributeType);
  }
});
