var get = Ember.get;
var forEach = Ember.EnumerableUtils.forEach;
var camelize = Ember.String.camelize;

import {pluralize} from "ember-inflector";

/**
  ## Using Embedded Records

  `DS.EmbeddedRecordsMixin` supports serializing embedded records.

  To set up embedded records, include the mixin when extending a serializer
  then define and configure embedded (model) relationships.

  Below is an example of a per-type serializer ('post' type).

  ```js
  App.PostSerializer = DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      author: {embedded: 'always'},
      comments: {serialize: 'ids'}
    }
  })
  ```

  The `attrs` option for a resource `{embedded: 'always'}` is shorthand for:

  ```js
  {serialize: 'records', deserialize: 'records'}
  ```

  ### Configuring Attrs

  A resource's `attrs` option may be set to use `ids`, `records` or `no` for the
  `serialize`  and `deserialize` settings.

  The `attrs` property can be set on the ApplicationSerializer or a per-type
  serializer.

  In the case where embedded JSON is expected while extracting a payload (reading)
  the setting is `deserialize: 'records'`, there is no need to use `ids` when
  extracting as that is the default behavior without this mixin if you are using
  the vanilla EmbeddedRecordsMixin. Likewise, to embed JSON in the payload while
  serializing `serialize: 'records'` is the setting to use. There is an option of
  not embedding JSON in the serialized payload by using `serialize: 'ids'`. If you
  do not want the relationship sent at all, you can use `serialize: 'no'`.


  ### EmbeddedRecordsMixin defaults
  If you do not overwrite `attrs` for a specific relationship, the `EmbeddedRecordsMixin`
  will behave in the following way:

  BelongsTo: `{serialize:'id', deserialize:'id'}`
  HasMany:   `{serialize:'no',  deserialize:'ids'}`

  ### Model Relationships

  Embedded records must have a model defined to be extracted and serialized.

  To successfully extract and serialize embedded records the model relationships
  must be setup correcty See the
  [defining relationships](/guides/models/defining-models/#toc_defining-relationships)
  section of the **Defining Models** guide page.

  Records without an `id` property are not considered embedded records, model
  instances must have an `id` property to be used with Ember Data.

  ### Example JSON payloads, Models and Serializers

  **When customizing a serializer it is imporant to grok what the cusomizations
  are, please read the docs for the methods this mixin provides, in case you need
  to modify to fit your specific needs.**

  For example review the docs for each method of this mixin:
  * [normalize](/api/data/classes/DS.EmbeddedRecordsMixin.html#method_normalize)
  * [serializeBelongsTo](/api/data/classes/DS.EmbeddedRecordsMixin.html#method_serializeBelongsTo)
  * [serializeHasMany](/api/data/classes/DS.EmbeddedRecordsMixin.html#method_serializeHasMany)

  @class EmbeddedRecordsMixin
  @namespace DS
*/
var EmbeddedRecordsMixin = Ember.Mixin.create({

  /**
    Normalize the record and recursively normalize/extract all the embedded records
    while pushing them into the store as they are encountered

    A payload with an attr configured for embedded records needs to be extracted:

    ```js
    {
      "post": {
        "id": "1"
        "title": "Rails is omakase",
        "comments": [{
          "id": "1",
          "body": "Rails is unagi"
        }, {
          "id": "2",
          "body": "Omakase O_o"
        }]
      }
    }
    ```
   @method normalize
   @param {subclass of DS.Model} type
   @param {Object} hash to be normalized
   @param {String} key the hash has been referenced by
   @return {Object} the normalized hash
  **/
  normalize: function(type, hash, prop) {
    var normalizedHash = this._super(type, hash, prop);
    return extractEmbeddedRecords(this, this.store, type, normalizedHash);
  },

  keyForRelationship: function(key, type){
    if (hasDeserializeRecordsOption(this.attrs, key)) {
      return this.keyForAttribute(key);
    } else {
      return this._super(key, type) || key;
    }
  },

  /**
    Serialize `belongsTo` relationship when it is configured as an embedded object.

    This example of an author model belongs to a post model:

    ```js
    Post = DS.Model.extend({
      title:    DS.attr('string'),
      body:     DS.attr('string'),
      author:   DS.belongsTo('author')
    });

    Author = DS.Model.extend({
      name:     DS.attr('string'),
      post:     DS.belongsTo('post')
    });
    ```

    Use a custom (type) serializer for the post model to configure embedded author

    ```js
    App.PostSerializer = DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
      attrs: {
        author: {embedded: 'always'}
      }
    })
    ```

    A payload with an attribute configured for embedded records can serialize
    the records together under the root attribute's payload:

    ```js
    {
      "post": {
        "id": "1"
        "title": "Rails is omakase",
        "author": {
          "id": "2"
          "name": "dhh"
        }
      }
    }
    ```

    @method serializeBelongsTo
    @param {DS.Model} record
    @param {Object} json
    @param {Object} relationship
  */
  serializeBelongsTo: function(record, json, relationship) {
    var attr = relationship.key;
    var attrs = this.get('attrs');
    if (noSerializeOptionSpecified(attrs, attr)) {
      this._super(record, json, relationship);
      return;
    }
    var includeIds = hasSerializeIdsOption(attrs, attr);
    var includeRecords = hasSerializeRecordsOption(attrs, attr);
    var embeddedRecord = record.get(attr);
    var key;
    if (includeIds) {
      key = this.keyForRelationship(attr, relationship.kind);
      if (!embeddedRecord) {
        json[key] = null;
      } else {
        json[key] = get(embeddedRecord, 'id');
      }
    } else if (includeRecords) {
      key = this.keyForAttribute(attr);
      if (!embeddedRecord) {
        json[key] = null;
      } else {
        json[key] = embeddedRecord.serialize({includeId: true});
        this.removeEmbeddedForeignKey(record, embeddedRecord, relationship, json[key]);
      }
    }
  },

  /**
    Serialize `hasMany` relationship when it is configured as embedded objects.

    This example of a post model has many comments:

    ```js
    Post = DS.Model.extend({
      title:    DS.attr('string'),
      body:     DS.attr('string'),
      comments: DS.hasMany('comment')
    });

    Comment = DS.Model.extend({
      body:     DS.attr('string'),
      post:     DS.belongsTo('post')
    });
    ```

    Use a custom (type) serializer for the post model to configure embedded comments

    ```js
    App.PostSerializer = DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
      attrs: {
        comments: {embedded: 'always'}
      }
    })
    ```

    A payload with an attribute configured for embedded records can serialize
    the records together under the root attribute's payload:

    ```js
    {
      "post": {
        "id": "1"
        "title": "Rails is omakase",
        "body": "I want this for my ORM, I want that for my template language..."
        "comments": [{
          "id": "1",
          "body": "Rails is unagi"
        }, {
          "id": "2",
          "body": "Omakase O_o"
        }]
      }
    }
    ```

    The attrs options object can use more specific instruction for extracting and
    serializing. When serializing, an option to embed `ids` or `records` can be set.
    When extracting the only option is `records`.

    So `{embedded: 'always'}` is shorthand for:
    `{serialize: 'records', deserialize: 'records'}`

    To embed the `ids` for a related object (using a hasMany relationship):

    ```js
    App.PostSerializer = DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
      attrs: {
        comments: {serialize: 'ids', deserialize: 'records'}
      }
    })
    ```

    ```js
    {
      "post": {
        "id": "1"
        "title": "Rails is omakase",
        "body": "I want this for my ORM, I want that for my template language..."
        "comments": ["1", "2"]
      }
    }
    ```

    @method serializeHasMany
    @param {DS.Model} record
    @param {Object} json
    @param {Object} relationship
  */
  serializeHasMany: function(record, json, relationship) {
    var attr = relationship.key;
    var attrs = this.get('attrs');
    if (noSerializeOptionSpecified(attrs, attr)) {
      this._super(record, json, relationship);
      return;
    }
    var includeIds = hasSerializeIdsOption(attrs, attr);
    var includeRecords = hasSerializeRecordsOption(attrs, attr);
    var key;
    if (includeIds) {
      key = this.keyForRelationship(attr, relationship.kind);
      json[key] = get(record, attr).mapBy('id');
    } else if (includeRecords) {
      key = this.keyForAttribute(attr);
      json[key] = get(record, attr).map(function(embeddedRecord) {
        var serializedEmbeddedRecord = embeddedRecord.serialize({includeId: true});
        this.removeEmbeddedForeignKey(record, embeddedRecord, relationship, serializedEmbeddedRecord);
        return serializedEmbeddedRecord;
      }, this);
    }
  },

  /**
    When serializing an embedded record, modify the property (in the json payload)
    that refers to the parent record (foreign key for relationship).

    Serializing a `belongsTo` relationship removes the property that refers to the
    parent record

    Serializing a `hasMany` relationship does not remove the property that refers to
    the parent record.

    @method removeEmbeddedForeignKey
    @param {DS.Model} record
    @param {DS.Model} embeddedRecord
    @param {Object} relationship
    @param {Object} json
  */
  removeEmbeddedForeignKey: function (record, embeddedRecord, relationship, json) {
    if (relationship.kind === 'hasMany') {
      return;
    } else if (relationship.kind === 'belongsTo') {
      var parentRecord = record.constructor.inverseFor(relationship.key);
      if (parentRecord) {
        var name = parentRecord.name;
        var embeddedSerializer = this.store.serializerFor(embeddedRecord.constructor);
        var parentKey = embeddedSerializer.keyForRelationship(name, parentRecord.kind);
        if (parentKey) {
          delete json[parentKey];
        }
      }
    }
  }
});

// checks config for attrs option to embedded (always) - serialize and deserialize
function hasEmbeddedAlwaysOption(attrs, attr) {
  var option = attrsOption(attrs, attr);
  return option && option.embedded === 'always';
}

// checks config for attrs option to serialize ids
function hasSerializeRecordsOption(attrs, attr) {
  var alwaysEmbed = hasEmbeddedAlwaysOption(attrs, attr);
  var option = attrsOption(attrs, attr);
  return alwaysEmbed || (option && (option.serialize === 'records'));
}

// checks config for attrs option to serialize records
function hasSerializeIdsOption(attrs, attr) {
  var option = attrsOption(attrs, attr);
  return option && (option.serialize === 'ids' || option.serialize === 'id');
}

// checks config for attrs option to serialize records
function noSerializeOptionSpecified(attrs, attr) {
  var option = attrsOption(attrs, attr);
  var serializeRecords = hasSerializeRecordsOption(attrs, attr);
  var serializeIds = hasSerializeIdsOption(attrs, attr);
  return !(option && (option.serialize || option.embedded));
}

// checks config for attrs option to deserialize records
// a defined option object for a resource is treated the same as
// `deserialize: 'records'`
function hasDeserializeRecordsOption(attrs, attr) {
  var alwaysEmbed = hasEmbeddedAlwaysOption(attrs, attr);
  var option = attrsOption(attrs, attr);
  return alwaysEmbed || (option && option.deserialize === 'records');
}

function attrsOption(attrs, attr) {
  return attrs && (attrs[camelize(attr)] || attrs[attr]);
}

// chooses a relationship kind to branch which function is used to update payload
// does not change payload if attr is not embedded
function extractEmbeddedRecords(serializer, store, type, partial) {
  var attrs = get(serializer, 'attrs');

  if (!attrs) {
    return partial;
  }

  type.eachRelationship(function(key, relationship) {
    if (hasDeserializeRecordsOption(attrs, key)) {
      var embeddedType = store.modelFor(relationship.type.typeKey);
      if (relationship.kind === "hasMany") {
        extractEmbeddedHasMany(store, key, embeddedType, partial);
      }
      if (relationship.kind === "belongsTo") {
        extractEmbeddedBelongsTo(store, key, embeddedType, partial);
      }
    }
  });

  return partial;
}

// handles embedding for `hasMany` relationship
function extractEmbeddedHasMany(store, key, embeddedType, hash) {
  if (!hash[key]) {
    return hash;
  }

  var ids = [];

  var embeddedSerializer = store.serializerFor(embeddedType.typeKey);
  forEach(hash[key], function(data) {
    var embeddedRecord = embeddedSerializer.normalize(embeddedType, data, null);
    store.push(embeddedType, embeddedRecord);
    ids.push(embeddedRecord.id);
  });

  hash[key] = ids;
  return hash;
}

function extractEmbeddedBelongsTo(store, key, embeddedType, hash) {
  if (!hash[key]) {
    return hash;
  }

  var embeddedSerializer = store.serializerFor(embeddedType.typeKey);
  var embeddedRecord = embeddedSerializer.normalize(embeddedType, hash[key], null);
  store.push(embeddedType, embeddedRecord);

  hash[key] = embeddedRecord.id;
  //TODO Need to add a reference to the parent later so relationship works between both `belongsTo` records
  return hash;
}

export default EmbeddedRecordsMixin;
