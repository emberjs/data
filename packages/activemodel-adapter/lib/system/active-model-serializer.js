import { singularize } from "ember-inflector";
import RESTSerializer from "ember-data/serializers/rest-serializer";
/**
  @module ember-data
*/

var forEach = Ember.EnumerableUtils.forEach;
var camelize =   Ember.String.camelize;
var capitalize = Ember.String.capitalize;
var decamelize = Ember.String.decamelize;
var underscore = Ember.String.underscore;

/**
  The ActiveModelSerializer is a subclass of the RESTSerializer designed to integrate
  with a JSON API that uses an underscored naming convention instead of camelCasing.
  It has been designed to work out of the box with the
  [active\_model\_serializers](http://github.com/rails-api/active_model_serializers)
  Ruby gem. This Serializer expects specific settings using ActiveModel::Serializers,
  `embed :ids, embed_in_root: true` which sideloads the records.

  This serializer extends the DS.RESTSerializer by making consistent
  use of the camelization, decamelization and pluralization methods to
  normalize the serialized JSON into a format that is compatible with
  a conventional Rails backend and Ember Data.

  ## JSON Structure

  The ActiveModelSerializer expects the JSON returned from your server
  to follow the REST adapter conventions substituting underscored keys
  for camelcased ones.

  ### Conventional Names

  Attribute names in your JSON payload should be the underscored versions of
  the attributes in your Ember.js models.

  For example, if you have a `Person` model:

  ```js
  App.FamousPerson = DS.Model.extend({
    firstName: DS.attr('string'),
    lastName: DS.attr('string'),
    occupation: DS.attr('string')
  });
  ```

  The JSON returned should look like this:

  ```js
  {
    "famous_person": {
      "id": 1,
      "first_name": "Barack",
      "last_name": "Obama",
      "occupation": "President"
    }
  }
  ```

  Let's imagine that `Occupation` is just another model:

  ```js
  App.Person = DS.Model.extend({
    firstName: DS.attr('string'),
    lastName: DS.attr('string'),
    occupation: DS.belongsTo('occupation')
  });

  App.Occupation = DS.Model.extend({
    name: DS.attr('string'),
    salary: DS.attr('number'),
    people: DS.hasMany('person')
  });
  ```

  The JSON needed to avoid extra server calls, should look like this:

  ```js
  {
    "people": [{
      "id": 1,
      "first_name": "Barack",
      "last_name": "Obama",
      "occupation_id": 1
    }],

    "occupations": [{
      "id": 1,
      "name": "President",
      "salary": 100000,
      "person_ids": [1]
    }]
  }
  ```

  @class ActiveModelSerializer
  @namespace DS
  @extends DS.RESTSerializer
*/
var ActiveModelSerializer = RESTSerializer.extend({
  // SERIALIZE

  /**
    Converts camelCased attributes to underscored when serializing.

    @method keyForAttribute
    @param {String} attribute
    @return String
  */
  keyForAttribute: function(attr) {
    return decamelize(attr);
  },

  /**
    Underscores relationship names and appends "_id" or "_ids" when serializing
    relationship keys.

    @method keyForRelationship
    @param {String} key
    @param {String} kind
    @return String
  */
  keyForRelationship: function(rawKey, kind) {
    var key = decamelize(rawKey);
    if (kind === "belongsTo") {
      return key + "_id";
    } else if (kind === "hasMany") {
      return singularize(key) + "_ids";
    } else {
      return key;
    }
  },

  /*
    Does not serialize hasMany relationships by default.
  */
  serializeHasMany: Ember.K,

  /**
    Underscores the JSON root keys when serializing.

    @method serializeIntoHash
    @param {Object} hash
    @param {subclass of DS.Model} type
    @param {DS.Snapshot} snapshot
    @param {Object} options
  */
  serializeIntoHash: function(data, type, snapshot, options) {
    var root = underscore(decamelize(type.typeKey));
    data[root] = this.serialize(snapshot, options);
  },

  /**
    Serializes a polymorphic type as a fully capitalized model name.

    @method serializePolymorphicType
    @param {DS.Snapshot} snapshot
    @param {Object} json
    @param {Object} relationship
  */
  serializePolymorphicType: function(snapshot, json, relationship) {
    var key = relationship.key;
    var belongsTo = snapshot.belongsTo(key);
    var jsonKey = underscore(key + "_type");

    if (Ember.isNone(belongsTo)) {
      json[jsonKey] = null;
    } else {
      json[jsonKey] = capitalize(camelize(belongsTo.typeKey));
    }
  },

  // EXTRACT

  /**
    Add extra step to `DS.RESTSerializer.normalize` so links are normalized.

    If your payload looks like:

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
    @param {String} type
    @param {Object} hash
    @param {String} prop
    @return Object
  */

  normalize: function(type, hash, prop) {
    this.normalizeLinks(hash);

    return this._super(type, hash, prop);
  },

  /**
    Convert `snake_cased` links  to `camelCase`

    @method normalizeLinks
    @param {Object} data
  */

  normalizeLinks: function(data) {
    if (data.links) {
      var links = data.links;

      for (var link in links) {
        var camelizedLink = camelize(link);

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

    if (this.keyForRelationship) {
      type.eachRelationship(function(key, relationship) {
        var payloadKey, payload;
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
          if (!hash.hasOwnProperty(payloadKey)) { return; }
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

export default ActiveModelSerializer;
