require("ember-data/transforms/json_transforms");

var get = Ember.get, set = Ember.set, isNone = Ember.isNone;

var transforms = DS.JSONTransforms;

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
      data[key] = transforms[type].deserialize(data[key]);
    });

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

    var attrs = get(this, 'attrs');

    record.eachAttribute(function(key, attribute) {
      var value = get(record, key), type = attribute.type;

      if (type) {
        value = transforms[type].serialize(value);
      }

      // if provided, use the mapping provided by `attrs` in
      // the serializer
      key = attrs && attrs[key] || key;

      json[key] = value;
    }, this);

    record.eachRelationship(function(key, relationship) {
      if (relationship.kind === 'belongsTo') {
        this.serializeBelongsTo(record, json, relationship);
      } else if (relationship.kind === 'hasMany') {
        // TODO: Support KVS and relational styles
        //throw new Error("Unimplemented");
      }
    }, this);

    return json;
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

  // EXTRACT

  extract: function(store, type, payload, id, requestType) {
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
  // HELPERS

  typeFor: function(relationship, key, data) {
    if (relationship.options.polymorphic) {
      return data[key + "_type"];
    } else {
      return relationship.type;
    }
  },

  eachEmbeddedRecord: function() {
    // this is used by transaction.add
  }
});
