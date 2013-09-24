require('ember-data/serializers/rest_serializer');

/**
  @module ember-data
*/

var get = Ember.get;
var forEach = Ember.EnumerableUtils.forEach;

DS.ActiveModelSerializer = DS.RESTSerializer.extend({
  // SERIALIZE

  /**
    Converts camelcased attributes to underscored when serializing.

    @method keyForAttribute
    @param {String} attribute
    @returns String
  */
  keyForAttribute: function(attr) {
    return Ember.String.decamelize(attr);
  },

  /**
    Underscores relationship names and appends "_id" or "_ids" when serializing
    relationship keys.

    @method keyForRelationship
    @param {String} key
    @param {String} kind
    @returns String
  */
  keyForRelationship: function(key, kind) {
    key = Ember.String.decamelize(key);
    if (kind === "belongsTo") {
      return key + "_id";
    } else if (kind === "hasMany") {
      return Ember.String.singularize(key) + "_ids";
    } else {
      return key;
    }
  },

  /**
    Serialize has-may relationship when it is configured as embedded objects.

    @method serializeHasMany
  */
  serializeHasMany: function(record, json, relationship) {
    var key   = relationship.key,
        attrs = get(this, 'attrs'),
        embed = attrs && attrs[key] && attrs[key].embedded === 'always';

    if (embed) {
      json[this.keyForAttribute(key)] = get(record, key).map(function(relation) {
        var data = relation.serialize(),
            primaryKey = get(this, 'primaryKey');

        data[primaryKey] = get(relation, primaryKey);

        return data;
      }, this);
    }
  },

  /**
    Underscores the JSON root keys when serializing.

    @method serializeIntoHash
    @param {Object} hash
    @param {subclass of DS.Model} type
    @param {DS.Model} record
    @param {Object} options
  */
  serializeIntoHash: function(data, type, record, options) {
    var root = Ember.String.decamelize(type.typeKey);
    data[root] = this.serialize(record, options);
  },

  /**
    Serializes a polymorphic type as a fully capitalized model name.

    @method serializePolymorphicType
    @param {DS.Model} record
    @param {Object} json
    @param relationship
  */
  serializePolymorphicType: function(record, json, relationship) {
    var key = relationship.key,
        belongsTo = get(record, key);
    key = this.keyForAttribute(key);
    json[key + "_type"] = Ember.String.capitalize(belongsTo.constructor.typeKey);
  },

  // EXTRACT

  /**
    Extracts the model typeKey from underscored root objects.

    @method typeForRoot
    @param {String} root
    @returns String the model's typeKey
  */
  typeForRoot: function(root) {
    var camelized = Ember.String.camelize(root);
    return Ember.String.singularize(camelized);
  },

  /**
    Normalize the polymorphic type from the JSON.

    Normalize:
    ```js
      {
        id: "1"
        minion: { type: "evil_minion", id: "12"}
      }
    ```

    To:
    ```js
      {
        id: "1"
        minion: { type: "evilMinion", id: "12"}
      }
    ```

    @method normalizeRelationships
    @private
  */
  normalizeRelationships: function(type, hash) {
    var payloadKey, payload;

    if (this.keyForRelationship) {
      type.eachRelationship(function(key, relationship) {
        if (relationship.options.polymorphic) {
          payloadKey = this.keyForAttribute(key);
          payload = hash[payloadKey];
          if (payload && payload.type) {
            payload.type = this.typeForRoot(payload.type);
          }
        } else {
          payloadKey = this.keyForRelationship(key, relationship.kind);
          payload = hash[payloadKey];
        }

        hash[key] = payload;

        if (key !== payloadKey) {
          delete hash[payloadKey];
        }
      }, this);
    }
  },

  extractSingle: function(store, primaryType, payload, recordId, requestType) {
    var root = this.keyForAttribute(primaryType.typeKey),
        partial = payload[root];

    updatePayloadWithEmbedded(store, this, primaryType, partial, payload);

    return this._super(store, primaryType, payload, recordId, requestType);
  },

  extractArray: function(store, type, payload) {
    var root = this.keyForAttribute(type.typeKey),
        partials = payload[Ember.String.pluralize(root)];

    forEach(partials, function(partial) {
      updatePayloadWithEmbedded(store, this, type, partial, payload);
    }, this);

    return this._super(store, type, payload);
  }
});

function updatePayloadWithEmbedded(store, serializer, type, partial, payload) {
  var attrs = get(serializer, 'attrs');

  if (!attrs) {
    return;
  }

  type.eachRelationship(function(key, relationship) {
    var expandedKey, embeddedTypeKey, attribute, ids,
        config = attrs[key],
        serializer = store.serializerFor(relationship.type.typeKey),
        primaryKey = get(serializer, "primaryKey");

    if (relationship.kind !== "hasMany") {
      return;
    }

    if (config && (config.embedded === 'always' || config.embedded === 'load')) {
      // underscore forces the embedded records to be side loaded.
      // it is needed when main type === relationship.type
      embeddedTypeKey = '_' + Ember.String.pluralize(relationship.type.typeKey);
      expandedKey = this.keyForRelationship(key, relationship.kind);
      attribute  = this.keyForAttribute(key);
      ids = [];

      if (!partial[attribute]) {
        return;
      }

      payload[embeddedTypeKey] = payload[embeddedTypeKey] || [];

      forEach(partial[attribute], function(data) {
        ids.push(data[primaryKey]);
        payload[embeddedTypeKey].push(data);
      });

      partial[expandedKey] = ids;
      delete partial[attribute];
    }
  }, serializer);
}
