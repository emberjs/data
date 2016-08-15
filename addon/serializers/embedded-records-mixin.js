import Ember from 'ember';
import { warn } from "ember-data/-private/debug";

var get = Ember.get;
var set = Ember.set;
var camelize = Ember.String.camelize;

/**
  ## Using Embedded Records

  `DS.EmbeddedRecordsMixin` supports serializing embedded records.

  To set up embedded records, include the mixin when extending a serializer,
  then define and configure embedded (model) relationships.

  Below is an example of a per-type serializer (`post` type).

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
  defining a model while working with the `ActiveModelSerializer`.  Nevertheless,
  using `{ embedded: 'always' }` as an option to `DS.attr` is not a valid way to setup
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

  The `attrs` property can be set on the `ApplicationSerializer` or a per-type
  serializer.

  In the case where embedded JSON is expected while extracting a payload (reading)
  the setting is `deserialize: 'records'`, there is no need to use `ids` when
  extracting as that is the default behavior without this mixin if you are using
  the vanilla `EmbeddedRecordsMixin`. Likewise, to embed JSON in the payload while
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
  should not both specify `async: true` and also indicate through the serializer's
  `attrs` attribute that the related model should be embedded for deserialization.
  If a model is declared embedded for deserialization (`embedded: 'always'` or `deserialize: 'records'`),
  then do not use `async: true`.

  To successfully extract and serialize embedded records the model relationships
  must be setup correcty. See the
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
export default Ember.Mixin.create({

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
  normalize(typeClass, hash, prop) {
    var normalizedHash = this._super(typeClass, hash, prop);
    return this._extractEmbeddedRecords(this, this.store, typeClass, normalizedHash);
  },

  keyForRelationship(key, typeClass, method) {
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
    import DS from 'ember-data';

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
    @param {DS.Snapshot} snapshot
    @param {Object} json
    @param {Object} relationship
  */
  serializeBelongsTo(snapshot, json, relationship) {
    var attr = relationship.key;
    if (this.noSerializeOptionSpecified(attr)) {
      this._super(snapshot, json, relationship);
      return;
    }
    var includeIds = this.hasSerializeIdsOption(attr);
    var includeRecords = this.hasSerializeRecordsOption(attr);
    var embeddedSnapshot = snapshot.belongsTo(attr);
    if (includeIds) {
      var serializedKey = this._getMappedKey(relationship.key, snapshot.type);
      if (serializedKey === relationship.key && this.keyForRelationship) {
        serializedKey = this.keyForRelationship(relationship.key, relationship.kind, "serialize");
      }

      if (!embeddedSnapshot) {
        json[serializedKey] = null;
      } else {
        json[serializedKey] = embeddedSnapshot.id;

        if (relationship.options.polymorphic) {
          this.serializePolymorphicType(snapshot, json, relationship);
        }
      }
    } else if (includeRecords) {
      this._serializeEmbeddedBelongsTo(snapshot, json, relationship);
    }
  },

  _serializeEmbeddedBelongsTo(snapshot, json, relationship) {
    let embeddedSnapshot = snapshot.belongsTo(relationship.key);
    var serializedKey = this._getMappedKey(relationship.key, snapshot.type);
    if (serializedKey === relationship.key && this.keyForRelationship) {
      serializedKey = this.keyForRelationship(relationship.key, relationship.kind, "serialize");
    }

    if (!embeddedSnapshot) {
      json[serializedKey] = null;
    } else {
      json[serializedKey] = embeddedSnapshot.serialize({ includeId: true });
      this.removeEmbeddedForeignKey(snapshot, embeddedSnapshot, relationship, json[serializedKey]);

      if (relationship.options.polymorphic) {
        this.serializePolymorphicType(snapshot, json, relationship);
      }
    }
  },

  /**
    Serializes `hasMany` relationships when it is configured as embedded objects.

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
        comments: { embedded: 'always' }
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
    serializing. When serializing, an option to embed `ids`, `ids-and-types` or `records` can be set.
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

    To embed the relationship as a collection of objects with `id` and `type` keys, set
    `ids-and-types` for the related object.

    This is particularly useful for polymorphic relationships where records don't share
    the same table and the `id` is not enough information.

    By example having a user that has many pets:

    ```js
    User = DS.Model.extend({
      name:    DS.attr('string'),
      pets: DS.hasMany('pet', { polymorphic: true })
    });

    Pet = DS.Model.extend({
      name: DS.attr('string'),
    });

    Cat = Pet.extend({
      // ...
    });

    Parrot = Pet.extend({
      // ...
    });
    ```

    ```app/serializers/user.js
    import DS from 'ember-data;

    export default DS.RESTSerializer.extend(DS.EmbeddedRecordsMixin, {
      attrs: {
        pets: { serialize: 'ids-and-types', deserialize: 'records' }
      }
    });
    ```

    ```js
    {
      "user": {
        "id": "1"
        "name": "Bertin Osborne",
        "pets": [
          { "id": "1", "type": "Cat" },
          { "id": "1", "type": "Parrot"}
        ]
      }
    }
    ```

    @method serializeHasMany
    @param {DS.Snapshot} snapshot
    @param {Object} json
    @param {Object} relationship
  */
  serializeHasMany(snapshot, json, relationship) {
    var attr = relationship.key;
    if (this.noSerializeOptionSpecified(attr)) {
      this._super(snapshot, json, relationship);
      return;
    }

    if (this.hasSerializeIdsOption(attr)) {
      let serializedKey = this._getMappedKey(relationship.key, snapshot.type);
      if (serializedKey === relationship.key && this.keyForRelationship) {
        serializedKey = this.keyForRelationship(relationship.key, relationship.kind, "serialize");
      }

      json[serializedKey] = snapshot.hasMany(attr, { ids: true });
    } else if (this.hasSerializeRecordsOption(attr)) {
      this._serializeEmbeddedHasMany(snapshot, json, relationship);
    } else {
      if (this.hasSerializeIdsAndTypesOption(attr)) {
        this._serializeHasManyAsIdsAndTypes(snapshot, json, relationship);
      }
    }
  },

  /**
    Serializes a hasMany relationship as an array of objects containing only `id` and `type`
    keys.
    This has its use case on polymorphic hasMany relationships where the server is not storing
    all records in the same table using STI, and therefore the `id` is not enough information

    TODO: Make the default in Ember-data 3.0??
  */
  _serializeHasManyAsIdsAndTypes(snapshot, json, relationship) {
    var serializedKey = this.keyForAttribute(relationship.key, 'serialize');
    var hasMany = snapshot.hasMany(relationship.key);

    json[serializedKey] = Ember.A(hasMany).map(function (recordSnapshot) {
      //
      // I'm sure I'm being utterly naive here. Propably id is a configurate property and
      // type too, and the modelName has to be normalized somehow.
      //
      return { id: recordSnapshot.id, type: recordSnapshot.modelName };
    });
  },

  _serializeEmbeddedHasMany(snapshot, json, relationship) {
    var serializedKey = this._getMappedKey(relationship.key, snapshot.type);
    if (serializedKey === relationship.key && this.keyForRelationship) {
      serializedKey = this.keyForRelationship(relationship.key, relationship.kind, "serialize");
    }


    warn(
      `The embedded relationship '${serializedKey}' is undefined for '${snapshot.modelName}' with id '${snapshot.id}'. Please include it in your original payload.`,
      Ember.typeOf(snapshot.hasMany(relationship.key)) !== 'undefined',
      { id: 'ds.serializer.embedded-relationship-undefined' }
    );

    json[serializedKey] = this._generateSerializedHasMany(snapshot, relationship);
  },

  /*
    Returns an array of embedded records serialized to JSON
  */
  _generateSerializedHasMany(snapshot, relationship) {
    let hasMany = snapshot.hasMany(relationship.key);
    let manyArray = Ember.A(hasMany);
    let ret = new Array(manyArray.length);

    for (let i = 0; i < manyArray.length; i++) {
      let embeddedSnapshot = manyArray[i];
      let embeddedJson = embeddedSnapshot.serialize({ includeId: true });
      this.removeEmbeddedForeignKey(snapshot, embeddedSnapshot, relationship, embeddedJson);
      ret[i] = embeddedJson;
    }

    return ret;
  },

  /**
    When serializing an embedded record, modify the property (in the json payload)
    that refers to the parent record (foreign key for relationship).

    Serializing a `belongsTo` relationship removes the property that refers to the
    parent record

    Serializing a `hasMany` relationship does not remove the property that refers to
    the parent record.

    @method removeEmbeddedForeignKey
    @param {DS.Snapshot} snapshot
    @param {DS.Snapshot} embeddedSnapshot
    @param {Object} relationship
    @param {Object} json
  */
  removeEmbeddedForeignKey(snapshot, embeddedSnapshot, relationship, json) {
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
  hasEmbeddedAlwaysOption(attr) {
    var option = this.attrsOption(attr);
    return option && option.embedded === 'always';
  },

  // checks config for attrs option to serialize ids
  hasSerializeRecordsOption(attr) {
    var alwaysEmbed = this.hasEmbeddedAlwaysOption(attr);
    var option = this.attrsOption(attr);
    return alwaysEmbed || (option && (option.serialize === 'records'));
  },

  // checks config for attrs option to serialize records
  hasSerializeIdsOption(attr) {
    var option = this.attrsOption(attr);
    return option && (option.serialize === 'ids' || option.serialize === 'id');
  },

  // checks config for attrs option to serialize records as objects containing id and types
  hasSerializeIdsAndTypesOption(attr) {
    var option = this.attrsOption(attr);
    return option && (option.serialize === 'ids-and-types' || option.serialize === 'id-and-type');
  },

  // checks config for attrs option to serialize records
  noSerializeOptionSpecified(attr) {
    var option = this.attrsOption(attr);
    return !(option && (option.serialize || option.embedded));
  },

  // checks config for attrs option to deserialize records
  // a defined option object for a resource is treated the same as
  // `deserialize: 'records'`
  hasDeserializeRecordsOption(attr) {
    var alwaysEmbed = this.hasEmbeddedAlwaysOption(attr);
    var option = this.attrsOption(attr);
    return alwaysEmbed || (option && option.deserialize === 'records');
  },

  attrsOption(attr) {
    var attrs = this.get('attrs');
    return attrs && (attrs[camelize(attr)] || attrs[attr]);
  },

  /**
   @method _extractEmbeddedRecords
   @private
  */
  _extractEmbeddedRecords(serializer, store, typeClass, partial) {
    typeClass.eachRelationship((key, relationship) => {
      if (serializer.hasDeserializeRecordsOption(key)) {
        if (relationship.kind === "hasMany") {
          this._extractEmbeddedHasMany(store, key, partial, relationship);
        }
        if (relationship.kind === "belongsTo") {
          this._extractEmbeddedBelongsTo(store, key, partial, relationship);
        }
      }
    });
    return partial;
  },

  /**
   @method _extractEmbeddedHasMany
   @private
  */
  _extractEmbeddedHasMany(store, key, hash, relationshipMeta) {
    let relationshipHash = get(hash, `data.relationships.${key}.data`);

    if (!relationshipHash) {
      return;
    }

    let hasMany = new Array(relationshipHash.length);

    for (let i = 0; i < relationshipHash.length; i++) {
      let item = relationshipHash[i];
      let { data, included } = this._normalizeEmbeddedRelationship(store, relationshipMeta, item);
      hash.included = hash.included || [];
      hash.included.push(data);
      if (included) {
        hash.included.push(...included);
      }

      hasMany[i] = { id: data.id, type: data.type };
    }

    let relationship = { data: hasMany };
    set(hash, `data.relationships.${key}`, relationship);
  },

  /**
   @method _extractEmbeddedBelongsTo
   @private
  */
  _extractEmbeddedBelongsTo(store, key, hash, relationshipMeta) {
    let relationshipHash = get(hash, `data.relationships.${key}.data`);
    if (!relationshipHash) {
      return;
    }

    let { data, included } = this._normalizeEmbeddedRelationship(store, relationshipMeta, relationshipHash);
    hash.included = hash.included || [];
    hash.included.push(data);
    if (included) {
      hash.included.push(...included);
    }

    let belongsTo = { id: data.id, type: data.type };
    let relationship = { data: belongsTo };

    set(hash, `data.relationships.${key}`, relationship);
  },

  /**
   @method _normalizeEmbeddedRelationship
   @private
  */
  _normalizeEmbeddedRelationship(store, relationshipMeta, relationshipHash) {
    let modelName = relationshipMeta.type;
    if (relationshipMeta.options.polymorphic) {
      modelName = relationshipHash.type;
    }
    let modelClass = store.modelFor(modelName);
    let serializer = store.serializerFor(modelName);

    return serializer.normalize(modelClass, relationshipHash, null);
  },
  isEmbeddedRecordsMixin: true
});
