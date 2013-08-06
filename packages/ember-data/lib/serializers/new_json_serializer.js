var get = Ember.get, set = Ember.set, isNone = Ember.isNone;

DS.NewJSONSerializer = Ember.Object.extend({
  deserialize: function(type, data) {
    var store = get(this, 'store');

    type.eachRelationship(function(key, relationship) {
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
    if (typeof id === 'number' || typeof id === 'string') {
      var type = this.typeFor(relationship, key, data);
      data[key] = get(this, 'store').recordFor(type, id);
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

    if (options.includeId) {
      json.id = get(record, 'id');
    }

    record.eachAttribute(function(key, attribute) {
      json[key] = get(record, key);
    });

    record.eachRelationship(function(key, relationship) {
      if (relationship.kind === 'belongsTo') {
        this.serializeBelongsTo(record, json, relationship);
      } else if (relationship.kind === 'hasMany') {
        throw new Error("Unimplemented");
        //this.serializeHasMany(data, key, relationship, value);
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

  // HELPERS

  typeFor: function(relationship, key, data) {
    if (relationship.options.polymorphic) {
      return data[key + "_type"];
    } else {
      return relationship.type;
    }
  }
});
