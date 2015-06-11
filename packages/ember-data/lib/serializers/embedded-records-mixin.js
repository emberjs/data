var get = Ember.get;
var set = Ember.set;
var forEach = Ember.EnumerableUtils.forEach;
var camelize = Ember.String.camelize;

/**
  ## Using Embedded Records

  `DS.EmbeddedRecordsMixin` supports serializing embedded records.

  To set up embedded records, include the mixin when extending a serializer
  then define and configure embedded (model) relationships.

  Below is an example of a per-type serializer ('post' type).

  ```app/serializers/post.js
  import DS from 'ember-data';

  export default DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
    attrs: {
      author: { embedded: 'always' },
      comments: { serialize: 'ids' }
    }
  });
  ```
  Note that this use of `{ embedded: 'always' }` is unrelated to
  the `{ embedded: 'always' }` that is defined as an option on `DS.attr` as part of
  defining a model while working with the ActiveModelSerializer.  Nevertheless,
  using `{ embedded: 'always' }` as an option to DS.attr is not a valid way to setup
  embedded records.

  The `attrs` option for a resource `{ embedded: 'always' }` is shorthand for:

  ```js
  {
    serialize: 'records',
    deserialize: 'records'
  }
  ```

  ### Configuring Attrs

  A resource's `attrs` option may be set to use `ids`, `records` or false for the
  `serialize`  and `deserialize` settings.

  The `attrs` property can be set on the ApplicationSerializer or a per-type
  serializer.

  In the case where embedded JSON is expected while extracting a payload (reading)
  the setting is `deserialize: 'records'`, there is no need to use `ids` when
  extracting as that is the default behavior without this mixin if you are using
  the vanilla EmbeddedRecordsMixin. Likewise, to embed JSON in the payload while
  serializing `serialize: 'records'` is the setting to use. There is an option of
  not embedding JSON in the serialized payload by using `serialize: 'ids'`. If you
  do not want the relationship sent at all, you can use `serialize: false`.


  ### EmbeddedRecordsMixin defaults
  If you do not overwrite `attrs` for a specific relationship, the `EmbeddedRecordsMixin`
  will behave in the following way:

  BelongsTo: `{ serialize: 'id', deserialize: 'id' }`
  HasMany:   `{ serialize: false, deserialize: 'ids' }`

  ### Model Relationships

  Embedded records must have a model defined to be extracted and serialized. Note that
  when defining any relationships on your model such as `belongsTo` and `hasMany`, you
  should not both specify `async:true` and also indicate through the serializer's
  `attrs` attribute that the related model should be embedded for deserialization.
  If a model is declared embedded for deserialization (`embedded: 'always'`,
  `deserialize: 'record'` or `deserialize: 'records'`), then do not use `async:true`.

  To successfully extract and serialize embedded records the model relationships
  must be setup correcty See the
  [defining relationships](/guides/models/defining-models/#toc_defining-relationships)
  section of the **Defining Models** guide page.

  Records without an `id` property are not considered embedded records, model
  instances must have an `id` property to be used with Ember Data.

  ### Example JSON payloads, Models and Serializers

  **When customizing a serializer it is important to grok what the customizations
  are. Please read the docs for the methods this mixin provides, in case you need
  to modify it to fit your specific needs.**

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
   @param {DS.Model} typeClass
   @param {Object} hash to be normalized
   @param {String} prop the hash has been referenced by
   @return {Object} the normalized hash
  **/
  normalize: function(typeClass, hash, prop) {
    var normalizedHash = this._super(typeClass, hash, prop);
    return this._extractEmbeddedRecords(this, this.store, typeClass, normalizedHash);
  },

  keyForRelationship: function(key, typeClass, method) {
    if ((method === 'serialize' && this.hasSerializeRecordsOption(key)) ||
        (method === 'deserialize' && this.hasDeserializeRecordsOption(key))) {
      return this.keyForAttribute(key, method);
    } else {
      return this._super(key, typeClass, method) || key;
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

    ```app/serializers/post.js
    import DS from 'ember-data;

    export default DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
      attrs: {
        author: { embedded: 'always' }
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
    @param {DS.AdapterSnapshot} snapshot
    @param {Object} json
    @param {Object} relationship
  */
  serializeBelongsTo: function(snapshot, json, relationship) {
    var attr = relationship.key;
    if (this.noSerializeOptionSpecified(attr)) {
      this._super(snapshot, json, relationship);
      return;
    }
    var includeIds = this.hasSerializeIdsOption(attr);
    var includeRecords = this.hasSerializeRecordsOption(attr);
    var embeddedSnapshot = snapshot.belongsTo(attr);
    var key;
    if (includeIds) {
      key = this.keyForRelationship(attr, relationship.kind, 'serialize');
      if (!embeddedSnapshot) {
        json[key] = null;
      } else {
        json[key] = embeddedSnapshot.id;
      }
    } else if (includeRecords) {
      key = this.keyForAttribute(attr, 'serialize');
      if (!embeddedSnapshot) {
        json[key] = null;
      } else {
        json[key] = embeddedSnapshot.record.serialize({ includeId: true });
        this.removeEmbeddedForeignKey(snapshot, embeddedSnapshot, relationship, json[key]);
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

    ```app/serializers/post.js
    import DS from 'ember-data;

    export default DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
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

    So `{ embedded: 'always' }` is shorthand for:
    `{ serialize: 'records', deserialize: 'records' }`

    To embed the `ids` for a related object (using a hasMany relationship):

    ```app/serializers/post.js
    import DS from 'ember-data;

    export default DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
      attrs: {
        comments: { serialize: 'ids', deserialize: 'records' }
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
    @param {DS.AdapterSnapshot} snapshot
    @param {Object} json
    @param {Object} relationship
  */
  serializeHasMany: function(snapshot, json, relationship) {
    var attr = relationship.key;
    if (this.noSerializeOptionSpecified(attr)) {
      this._super(snapshot, json, relationship);
      return;
    }
    var includeIds = this.hasSerializeIdsOption(attr);
    var includeRecords = this.hasSerializeRecordsOption(attr);
    var key, hasMany;
    if (includeIds) {
      key = this.keyForRelationship(attr, relationship.kind, 'serialize');
      json[key] = snapshot.hasMany(attr, { ids: true });
    } else if (includeRecords) {
      key = this.keyForAttribute(attr, 'serialize');
      hasMany = snapshot.hasMany(attr);

      Ember.warn("The embedded relationship '" + key + "' is undefined for '" + snapshot.modelName + "' with id '" + snapshot.id + "'. Please include it in your original payload.", Ember.typeOf(hasMany) !== 'undefined');

      json[key] = Ember.A(hasMany).map(function(embeddedSnapshot) {
        var embeddedJson = embeddedSnapshot.record.serialize({ includeId: true });
        this.removeEmbeddedForeignKey(snapshot, embeddedSnapshot, relationship, embeddedJson);
        return embeddedJson;
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
    @param {DS.AdapterSnapshot} snapshot
    @param {DS.AdapterSnapshot} embeddedSnapshot
    @param {Object} relationship
    @param {Object} json
  */
  removeEmbeddedForeignKey: function (snapshot, embeddedSnapshot, relationship, json) {
    if (relationship.kind === 'hasMany') {
      return;
    } else if (relationship.kind === 'belongsTo') {
      var parentRecord = snapshot.type.inverseFor(relationship.key, this.store);
      if (parentRecord) {
        var name = parentRecord.name;
        var embeddedSerializer = this.store.serializerFor(embeddedSnapshot.modelName);
        var parentKey = embeddedSerializer.keyForRelationship(name, parentRecord.kind, 'deserialize');
        if (parentKey) {
          delete json[parentKey];
        }
      }
    }
  },

  // checks config for attrs option to embedded (always) - serialize and deserialize
  hasEmbeddedAlwaysOption: function (attr) {
    var option = this.attrsOption(attr);
    return option && option.embedded === 'always';
  },

  // checks config for attrs option to serialize ids
  hasSerializeRecordsOption: function(attr) {
    var alwaysEmbed = this.hasEmbeddedAlwaysOption(attr);
    var option = this.attrsOption(attr);
    return alwaysEmbed || (option && (option.serialize === 'records'));
  },

  // checks config for attrs option to serialize records
  hasSerializeIdsOption: function(attr) {
    var option = this.attrsOption(attr);
    return option && (option.serialize === 'ids' || option.serialize === 'id');
  },

  // checks config for attrs option to serialize records
  noSerializeOptionSpecified: function(attr) {
    var option = this.attrsOption(attr);
    return !(option && (option.serialize || option.embedded));
  },

  // checks config for attrs option to deserialize records
  // a defined option object for a resource is treated the same as
  // `deserialize: 'records'`
  hasDeserializeRecordsOption: function(attr) {
    var alwaysEmbed = this.hasEmbeddedAlwaysOption(attr);
    var option = this.attrsOption(attr);
    return alwaysEmbed || (option && option.deserialize === 'records');
  },

  attrsOption: function(attr) {
    var attrs = this.get('attrs');
    return attrs && (attrs[camelize(attr)] || attrs[attr]);
  },

  /**
   @method _extractEmbeddedRecords
   @private
  */
  _extractEmbeddedRecords: function(serializer, store, typeClass, partial) {
    if (Ember.FEATURES.isEnabled('ds-new-serializer-api') && this.get('isNewSerializerAPI')) {
      return _newExtractEmbeddedRecords.apply(this, arguments);
    }

    typeClass.eachRelationship(function(key, relationship) {
      if (serializer.hasDeserializeRecordsOption(key)) {
        var embeddedTypeClass = store.modelFor(relationship.type);
        if (relationship.kind === "hasMany") {
          if (relationship.options.polymorphic) {
            this._extractEmbeddedHasManyPolymorphic(store, key, partial);
          } else {
            this._extractEmbeddedHasMany(store, key, embeddedTypeClass, partial);
          }
        }
        if (relationship.kind === "belongsTo") {
          if (relationship.options.polymorphic) {
            this._extractEmbeddedBelongsToPolymorphic(store, key, partial);
          } else {
            this._extractEmbeddedBelongsTo(store, key, embeddedTypeClass, partial);
          }
        }
      }
    }, this);

    return partial;
  },

  /**
   @method _extractEmbeddedHasMany
   @private
  */
  _extractEmbeddedHasMany: function(store, key, embeddedTypeClass, hash) {
    if (Ember.FEATURES.isEnabled('ds-new-serializer-api') && this.get('isNewSerializerAPI')) {
      return _newExtractEmbeddedHasMany.apply(this, arguments);
    }

    if (!hash[key]) {
      return hash;
    }

    var ids = [];

    var embeddedSerializer = store.serializerFor(embeddedTypeClass.modelName);
    forEach(hash[key], function(data) {
      var embeddedRecord = embeddedSerializer.normalize(embeddedTypeClass, data, null);
      store.push(embeddedTypeClass.modelName, embeddedRecord);
      ids.push(embeddedRecord.id);
    });

    hash[key] = ids;
    return hash;
  },

  /**
   @method _extractEmbeddedHasManyPolymorphic
   @private
  */
  _extractEmbeddedHasManyPolymorphic: function(store, key, hash) {
    if (!hash[key]) {
      return hash;
    }

    var ids = [];

    forEach(hash[key], function(data) {
      var modelName = data.type;
      var embeddedSerializer = store.serializerFor(modelName);
      var embeddedTypeClass = store.modelFor(modelName);
      // var primaryKey = embeddedSerializer.get('primaryKey');

      var embeddedRecord = embeddedSerializer.normalize(embeddedTypeClass, data, null);
      store.push(embeddedTypeClass.modelName, embeddedRecord);
      ids.push({ id: embeddedRecord.id, type: modelName });
    });

    hash[key] = ids;
    return hash;
  },

  /**
   @method _extractEmbeddedBelongsTo
   @private
  */
  _extractEmbeddedBelongsTo: function(store, key, embeddedTypeClass, hash) {
    if (Ember.FEATURES.isEnabled('ds-new-serializer-api') && this.get('isNewSerializerAPI')) {
      return _newExtractEmbeddedBelongsTo.apply(this, arguments);
    }

    if (!hash[key]) {
      return hash;
    }

    var embeddedSerializer = store.serializerFor(embeddedTypeClass.modelName);
    var embeddedRecord = embeddedSerializer.normalize(embeddedTypeClass, hash[key], null);
    store.push(embeddedTypeClass.modelName, embeddedRecord);

    hash[key] = embeddedRecord.id;
    return hash;
  },

  /**
   @method _extractEmbeddedBelongsToPolymorphic
   @private
  */
  _extractEmbeddedBelongsToPolymorphic: function(store, key, hash) {
    if (!hash[key]) {
      return hash;
    }

    var data = hash[key];
    var modelName = data.type;
    var embeddedSerializer = store.serializerFor(modelName);
    var embeddedTypeClass = store.modelFor(modelName);
    // var primaryKey = embeddedSerializer.get('primaryKey');

    var embeddedRecord = embeddedSerializer.normalize(embeddedTypeClass, data, null);
    store.push(embeddedTypeClass.modelName, embeddedRecord);

    hash[key] = embeddedRecord.id;
    hash[key + 'Type'] = modelName;
    return hash;
  },

  /**
   @method _normalizeEmbeddedRelationship
   @private
  */
  _normalizeEmbeddedRelationship: function(store, relationshipMeta, relationshipHash) {
    let modelName = relationshipMeta.type;
    if (relationshipMeta.options.polymorphic) {
      modelName = relationshipHash.type;
    }
    let modelClass = store.modelFor(modelName);
    let serializer = store.serializerFor(modelName);

    return serializer.normalize(modelClass, relationshipHash, null);
  }

});

export default EmbeddedRecordsMixin;

/*
 @method _newExtractEmbeddedRecords
 @private
*/
function _newExtractEmbeddedRecords(serializer, store, typeClass, partial) {
  typeClass.eachRelationship((key, relationship) => {
    if (serializer.hasDeserializeRecordsOption(key)) {
      if (relationship.kind === "hasMany") {
        this._extractEmbeddedHasMany(store, key, partial, relationship);
      }
      if (relationship.kind === "belongsTo") {
        this._extractEmbeddedBelongsTo(store, key, partial, relationship);
      }
    }
  }, this);
  return partial;
}

/*
 @method _newExtractEmbeddedHasMany
 @private
*/
function _newExtractEmbeddedHasMany(store, key, hash, relationshipMeta) {
  let relationshipHash = get(hash, `data.relationships.${key}.data`);
  if (!relationshipHash) {
    return;
  }

  let hasMany = relationshipHash.map(item => {
    let { data, included } = this._normalizeEmbeddedRelationship(store, relationshipMeta, item);
    hash.included = hash.included || [];
    hash.included.push(data);
    hash.included.push(...included);

    return { id: data.id, type: data.type };
  });

  let relationship = { data: hasMany };
  set(hash, `data.relationships.${key}`, relationship);
}

/*
 @method _newExtractEmbeddedBelongsTo
 @private
*/
function _newExtractEmbeddedBelongsTo(store, key, hash, relationshipMeta) {
  let relationshipHash = get(hash, `data.relationships.${key}.data`);
  if (!relationshipHash) {
    return;
  }

  let { data, included } = this._normalizeEmbeddedRelationship(store, relationshipMeta, relationshipHash);
  hash.included = hash.included || [];
  hash.included.push(data);
  hash.included.push(...included);

  let belongsTo = { id: data.id, type: data.type };
  let relationship = { data: belongsTo };

  set(hash, `data.relationships.${key}`, relationship);
}
