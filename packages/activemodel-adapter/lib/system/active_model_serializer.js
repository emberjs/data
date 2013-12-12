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
    Does not serialize hasMany relationships by default.
  */
  serializeHasMany: Ember.K,

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
    Add extra step to `DS.RESTSerializer.normalize` so links are
    normalized.

    If your payload looks like this

    ```js
    {
      "post": {
        "id": 1,
        "title": "Rails is omakase",
        "links": { "flagged_comments": "api/comments/flagged" }
      }
    }
    ```
    The normalized version would look like this

    ```js
    {
      "post": {
        "id": 1,
        "title": "Rails is omakase",
        "links": { "flaggedComments": "api/comments/flagged" }
      }
    }
    ```

    @method normalize
    @param {subclass of DS.Model} type
    @param {Object} hash
    @param {String} prop
    @returns Object
  */

  normalize: function(type, hash, prop) {
    this.normalizeLinks(hash);

    return this._super(type, hash, prop);
  },

  /**
    Convert `snake_cased` links  to `camelCase`

    @method normalizeLinks
    @param {Object} hash
  */

  normalizeLinks: function(data){
    if (data.links) {
      var links = data.links;

      for (var link in links) {
        var camelizedLink = Ember.String.camelize(link);

        if (camelizedLink !== link) {
          links[camelizedLink] = links[link];
          delete links[link];
        }
      }
    }
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
          } else if (payload && relationship.kind === "hasMany") {
            var self = this;
            forEach(payload, function(single) {
              single.type = self.typeForRoot(single.type);
            });
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
  }
});
