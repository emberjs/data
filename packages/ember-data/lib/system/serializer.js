var get = Ember.get, set = Ember.set, map = Ember.ArrayPolyfills.map, isNone = Ember.isNone;

function mustImplement(name) {
  return function() {
    throw new Ember.Error("Your serializer " + this.toString() + " does not implement the required method " + name);
  };
}

/**
  A serializer is responsible for serializing and deserializing a group of
  records.

  `DS.Serializer` is an abstract base class designed to help you build a
  serializer that can read to and write from any serialized form.  While most
  applications will use `DS.JSONSerializer`, which reads and writes JSON, the
  serializer architecture allows your adapter to transmit things like XML,
  strings, or custom binary data.

  Typically, your application's `DS.Adapter` is responsible for both creating a
  serializer as well as calling the appropriate methods when it needs to
  materialize data or serialize a record.

  The serializer API is designed as a series of layered hooks that you can
  override to customize any of the individual steps of serialization and
  deserialization.

  The hooks are organized by the three responsibilities of the serializer:

  1. Determining naming conventions
  2. Serializing records into a serialized form
  3. Deserializing records from a serialized form

  Because Ember Data lazily materializes records, the deserialization
  step, and therefore the hooks you implement, are split into two phases:

  1. Extraction, where the serialized forms for multiple records are
     extracted from a single payload. The IDs of each record are also
     extracted for indexing.
  2. Materialization, where a newly-created record has its attributes
     and relationships initialized based on the serialized form loaded
     by the adapter.

  Additionally, a serializer can convert values from their JavaScript
  versions into their serialized versions via a declarative API.

  ## Naming Conventions

  One of the most common uses of the serializer is to map attribute names
  from the serialized form to your `DS.Model`. For example, in your model,
  you may have an attribute called `firstName`:

  ```javascript
  App.Person = DS.Model.extend({
    firstName: DS.attr('string')
  });
  ```

  However, because the web API your adapter is communicating with is
  legacy, it calls this attribute `FIRST_NAME`.

  You can determine the attribute name used in the serialized form
  by implementing `keyForAttributeName`:

  ```javascript
  keyForAttributeName: function(type, name) {
    return name.underscore.toUpperCase();
  }
  ```

  If your attribute names are not predictable, you can re-map them
  one-by-one using the adapter's `map` API:

  ```javascript
  App.Adapter.map('App.Person', {
    firstName: { key: '*API_USER_FIRST_NAME*' }
  });
  ```

  This API will also work for relationships and primary keys. For
  example:

  ```javascript
  App.Adapter.map('App.Person', {
    primaryKey: '_id'
  });
  ```

  ## Serialization

  During the serialization process, a record or records are converted
  from Ember.js objects into their serialized form.

  These methods are designed in layers, like a delicious 7-layer
  cake (but with fewer layers).

  The main entry point for serialization is the `serialize`
  method, which takes the record and options.

  The `serialize` method is responsible for:

  * turning the record's attributes (`DS.attr`) into
    attributes on the JSON object.
  * optionally adding the record's ID onto the hash
  * adding relationships (`DS.hasMany` and `DS.belongsTo`)
    to the JSON object.

  Depending on the backend, the serializer can choose
  whether to include the `hasMany` or `belongsTo`
  relationships on the JSON hash.

  For very custom serialization, you can implement your
  own `serialize` method. In general, however, you will want
  to override the hooks described below.

  ### Adding the ID

  The default `serialize` will optionally call your serializer's
  `addId` method with the JSON hash it is creating, the
  record's type, and the record's ID. The `serialize` method
  will not call `addId` if the record's ID is undefined.

  Your adapter must specifically request ID inclusion by
  passing `{ includeId: true }` as an option to `serialize`.

  NOTE: You may not want to include the ID when updating an
  existing record, because your server will likely disallow
  changing an ID after it is created, and the PUT request
  itself will include the record's identification.

  By default, `addId` will:

  1. Get the primary key name for the record by calling
     the serializer's `primaryKey` with the record's type.
     Unless you override the `primaryKey` method, this
     will be `'id'`.
  2. Assign the record's ID to the primary key in the
     JSON hash being built.

  If your backend expects a JSON object with the primary
  key at the root, you can just override the `primaryKey`
  method on your serializer subclass.

  Otherwise, you can override the `addId` method for
  more specialized handling.

  ### Adding Attributes

  By default, the serializer's `serialize` method will call
  `addAttributes` with the JSON object it is creating
  and the record to serialize.

  The `addAttributes` method will then call `addAttribute`
  in turn, with the JSON object, the record to serialize,
  the attribute's name and its type.

  Finally, the `addAttribute` method will serialize the
  attribute:

  1. It will call `keyForAttributeName` to determine
     the key to use in the JSON hash.
  2. It will get the value from the record.
  3. It will call `serializeValue` with the attribute's
     value and attribute type to convert it into a
     JSON-compatible value. For example, it will convert a
     Date into a String.

  If your backend expects a JSON object with attributes as
  keys at the root, you can just override the `serializeValue`
  and `keyForAttributeName` methods in your serializer
  subclass and let the base class do the heavy lifting.

  If you need something more specialized, you can probably
  override `addAttribute` and let the default `addAttributes`
  handle the nitty gritty.

  ### Adding Relationships

  By default, `serialize` will call your serializer's
  `addRelationships` method with the JSON object that is
  being built and the record being serialized. The default
  implementation of this method is to loop over all of the
  relationships defined on your record type and:

  * If the relationship is a `DS.hasMany` relationship,
    call `addHasMany` with the JSON object, the record
    and a description of the relationship.
  * If the relationship is a `DS.belongsTo` relationship,
    call `addBelongsTo` with the JSON object, the record
    and a description of the relationship.

  The relationship description has the following keys:

  * `type`: the class of the associated information (the
    first parameter to `DS.hasMany` or `DS.belongsTo`)
  * `kind`: either `hasMany` or `belongsTo`

  The relationship description may get additional
  information in the future if more capabilities or
  relationship types are added. However, it will
  remain backwards-compatible, so the mere existence
  of new features should not break existing adapters.
*/
DS.Serializer = Ember.Object.extend({
  init: function() {
    this.mappings = Ember.Map.create();
    this.configurations = Ember.Map.create();
    this.globalConfigurations = {};
  },

  extract: mustImplement('extract'),
  extractMany: mustImplement('extractMany'),

  extractRecordRepresentation: function(loader, type, json, shouldSideload) {
    var mapping = this.mappingForType(type);
    var embeddedData, prematerialized = {}, reference;

    if (shouldSideload) {
      reference = loader.sideload(type, json);
    } else {
      reference = loader.load(type, json);
    }

    this.eachEmbeddedHasMany(type, function(name, relationship) {
      var embeddedData = json[this.keyFor(relationship)];
      if (!isNone(embeddedData)) {
        this.extractEmbeddedHasMany(loader, relationship, embeddedData, reference, prematerialized);
      }
    }, this);

    this.eachEmbeddedBelongsTo(type, function(name, relationship) {
      var embeddedData = json[this.keyFor(relationship)];
      if (!isNone(embeddedData)) {
        this.extractEmbeddedBelongsTo(loader, relationship, embeddedData, reference, prematerialized);
      }
    }, this);

    loader.prematerialize(reference, prematerialized);

    return reference;
  },

  extractEmbeddedHasMany: function(loader, relationship, array, parent, prematerialized) {
    var references = map.call(array, function(item) {
      if (!item) { return; }

      var reference = this.extractRecordRepresentation(loader, relationship.type, item, true);

      // If the embedded record should also be saved back when serializing the parent,
      // make sure we set its parent since it will not have an ID.
      var embeddedType = this.embeddedType(parent.type, relationship.key);
      if (embeddedType === 'always') {
        reference.parent = parent;
      }

      return reference;
    }, this);

    prematerialized[relationship.key] = references;
  },

  extractEmbeddedBelongsTo: function(loader, relationship, data, parent, prematerialized) {
    var reference = this.extractRecordRepresentation(loader, relationship.type, data, true);
    prematerialized[relationship.key] = reference;

    // If the embedded record should also be saved back when serializing the parent,
    // make sure we set its parent since it will not have an ID.
    var embeddedType = this.embeddedType(parent.type, relationship.key);
    if (embeddedType === 'always') {
      reference.parent = parent;
    }
  },

  //.......................
  //. SERIALIZATION HOOKS
  //.......................

  /**
    The main entry point for serializing a record. While you can consider this
    a hook that can be overridden in your serializer, you will have to manually
    handle serialization. For most cases, there are more granular hooks that you
    can override.

    If overriding this method, these are the responsibilities that you will need
    to implement yourself:

    * If the option hash contains `includeId`, add the record's ID to the serialized form.
      By default, `serialize` calls `addId` if appropriate.
    * Add the record's attributes to the serialized form. By default, `serialize` calls
      `addAttributes`.
    * Add the record's relationships to the serialized form. By default, `serialize` calls
      `addRelationships`.

    @param {DS.Model} record the record to serialize
    @param {Object} [options] a hash of options
    @returns {any} the serialized form of the record
  */
  serialize: function(record, options) {
    options = options || {};

    var serialized = this.createSerializedForm(), id;

    if (options.includeId) {
      if (id = get(record, 'id')) {
        this._addId(serialized, record.constructor, id);
      }
    }

    this.addAttributes(serialized, record);
    this.addRelationships(serialized, record);

    return serialized;
  },

  /**
    @private

    Given an attribute type and value, convert the value into the
    serialized form using the transform registered for that type.

    @param {any} value the value to convert to the serialized form
    @param {String} attributeType the registered type (e.g. `string`
      or `boolean`)
    @returns {any} the serialized form of the value
  */
  serializeValue: function(value, attributeType) {
    var transform = this.transforms ? this.transforms[attributeType] : null;

    Ember.assert("You tried to use an attribute type (" + attributeType + ") that has not been registered", transform);
    return transform.serialize(value);
  },

  /**
    A hook you can use to normalize IDs before adding them to the
    serialized representation.

    Because the store coerces all IDs to strings for consistency,
    this is the opportunity for the serializer to, for example,
    convert numerical IDs back into number form.

    @param {String} id the id from the record
    @returns {any} the serialized representation of the id
  */
  serializeId: function(id) {
    if (isNaN(id)) { return id; }
    return +id;
  },

  /**
    A hook you can use to change how attributes are added to the serialized
    representation of a record.

    By default, `addAttributes` simply loops over all of the attributes of the
    passed record, maps the attribute name to the key for the serialized form,
    and invokes any registered transforms on the value. It then invokes the
    more granular `addAttribute` with the key and transformed value.

    Since you can override `keyForAttributeName`, `addAttribute`, and register
    custom tranforms, you should rarely need to override this hook.

    @param {any} data the serialized representation that is being built
    @param {DS.Model} record the record to serialize
  */
  addAttributes: function(data, record) {
    record.eachAttribute(function(name, attribute) {
      this._addAttribute(data, record, name, attribute.type);
    }, this);
  },

  /**
    A hook you can use to customize how the key/value pair is added to
    the serialized data.

    @param {any} serialized the serialized form being built
    @param {String} key the key to add to the serialized data
    @param {any} value the value to add to the serialized data
  */
  addAttribute: Ember.K,

  /**
    A hook you can use to customize how the record's id is added to
    the serialized data.

    The `addId` hook is called with:

    * the serialized representation being built
    * the resolved primary key (taking configurations and the
      `primaryKey` hook into consideration)
    * the serialized id (after calling the `serializeId` hook)

    @param {any} data the serialized representation that is being built
    @param {String} key the resolved primary key
    @param {id} id the serialized id
  */
  addId: Ember.K,

  /**
    A hook you can use to change how relationships are added to the serialized
    representation of a record.

    By default, `addAttributes` loops over all of the relationships of the
    passed record, maps the relationship names to the key for the serialized form,
    and then invokes the public `addBelongsTo` and `addHasMany` hooks.

    Since you can override `keyForBelongsTo`, `keyForHasMany`, `addBelongsTo`,
    `addHasMany`, and register mappings, you should rarely need to override this
    hook.

    @param {any} data the serialized representation that is being built
    @param {DS.Model} record the record to serialize
  */
  addRelationships: function(data, record) {
    record.eachRelationship(function(name, relationship) {
      if (relationship.kind === 'belongsTo') {
        this._addBelongsTo(data, record, name, relationship);
      } else if (relationship.kind === 'hasMany') {
        this._addHasMany(data, record, name, relationship);
      }
    }, this);
  },

  /**
    A hook you can use to add a `belongsTo` relationship to the
    serialized representation.

    The specifics of this hook are very adapter-specific, so there
    is no default implementation. You can see `DS.JSONSerializer`
    for an example of an implementation of the `addBelongsTo` hook.

    The `belongsTo` relationship object has the following properties:

    * **type** a subclass of DS.Model that is the type of the
      relationship. This is the first parameter to DS.belongsTo
    * **options** the options passed to the call to DS.belongsTo
    * **kind** always `belongsTo`

    Additional properties may be added in the future.

    @param {any} data the serialized representation that is being built
    @param {DS.Model} record the record to serialize
    @param {String} key the key for the serialized object
    @param {Object} relationship an object representing the relationship
  */
  addBelongsTo: Ember.K,

  /**
    A hook you can use to add a `hasMany` relationship to the
    serialized representation.

    The specifics of this hook are very adapter-specific, so there
    is no default implementation. You may not need to implement this,
    for example, if your backend only expects relationships on the
    child of a one to many relationship.

    The `hasMany` relationship object has the following properties:

    * **type** a subclass of DS.Model that is the type of the
      relationship. This is the first parameter to DS.hasMany
    * **options** the options passed to the call to DS.hasMany
    * **kind** always `hasMany`

    Additional properties may be added in the future.

    @param {any} data the serialized representation that is being built
    @param {DS.Model} record the record to serialize
    @param {String} key the key for the serialized object
    @param {Object} relationship an object representing the relationship
  */
  addHasMany: Ember.K,

  /**
    NAMING CONVENTIONS

    The most commonly overridden APIs of the serializer are
    the naming convention methods:

    * `keyForAttributeName`: converts a camelized attribute name
      into a key in the adapter-provided data hash. For example,
      if the model's attribute name was `firstName`, and the
      server used underscored names, you would return `first_name`.
    * `primaryKey`: returns the key that should be used to
      extract the id from the adapter-provided data hash. It is
      also used when serializing a record.
  */

  /**
    A hook you can use in your serializer subclass to customize
    how an unmapped attribute name is converted into a key.

    By default, this method returns the `name` parameter.

    For example, if the attribute names in your JSON are underscored,
    you will want to convert them into JavaScript conventional
    camelcase:

    ```javascript
    App.MySerializer = DS.Serializer.extend({
      // ...

      keyForAttributeName: function(type, name) {
        return name.camelize();
      }
    });
    ```

    @param {DS.Model subclass} type the type of the record with
      the attribute name `name`
    @param {String} name the attribute name to convert into a key

    @returns {String} the key
  */
  keyForAttributeName: function(type, name) {
    return name;
  },

  /**
    A hook you can use in your serializer to specify a conventional
    primary key.

    By default, this method will return the string `id`.

    In general, you should not override this hook to specify a special
    primary key for an individual type; use `configure` instead.

    For example, if your primary key is always `__id__`:

    ```javascript
    App.MySerializer = DS.Serializer.extend({
      // ...
      primaryKey: function(type) {
        return '__id__';
      }
    });
    ```

    In another example, if the primary key always includes the
    underscored version of the type before the string `id`:

    ```javascript
    App.MySerializer = DS.Serializer.extend({
      // ...
      primaryKey: function(type) {
        // If the type is `BlogPost`, this will return
        // `blog_post_id`.
        var typeString = type.toString().split(".")[1].underscore();
        return typeString + "_id";
      }
    });
    ```

    @param {DS.Model subclass} type
    @returns {String} the primary key for the type
  */
  primaryKey: function(type) {
    return "id";
  },

  /**
    A hook you can use in your serializer subclass to customize
    how an unmapped `belongsTo` relationship is converted into
    a key.

    By default, this method calls `keyForAttributeName`, so if
    your naming convention is uniform across attributes and
    relationships, you can use the default here and override
    just `keyForAttributeName` as needed.

    For example, if the `belongsTo` names in your JSON always
    begin with `BT_` (e.g. `BT_posts`), you can strip out the
    `BT_` prefix:"

    ```javascript
    App.MySerializer = DS.Serializer.extend({
      // ...
      keyForBelongsTo: function(type, name) {
        return name.match(/^BT_(.*)$/)[1].camelize();
      }
    });
    ```

    @param {DS.Model subclass} type the type of the record with
      the `belongsTo` relationship.
    @param {String} name the relationship name to convert into a key

    @returns {String} the key
  */
  keyForBelongsTo: function(type, name) {
    return this.keyForAttributeName(type, name);
  },

  /**
    A hook you can use in your serializer subclass to customize
    how an unmapped `hasMany` relationship is converted into
    a key.

    By default, this method calls `keyForAttributeName`, so if
    your naming convention is uniform across attributes and
    relationships, you can use the default here and override
    just `keyForAttributeName` as needed.

    For example, if the `hasMany` names in your JSON always
    begin with the "table name" for the current type (e.g.
    `post_comments`), you can strip out the prefix:"

    ```javascript
    App.MySerializer = DS.Serializer.extend({
      // ...
      keyForHasMany: function(type, name) {
        // if your App.BlogPost has many App.BlogComment, the key from
        // the server would look like: `blog_post_blog_comments`
        //
        // 1. Convert the type into a string and underscore the
        //    second part (App.BlogPost -> blog_post)
        // 2. Extract the part after `blog_post_` (`blog_comments`)
        // 3. Underscore it, to become `blogComments`
        var typeString = type.toString().split(".")[1].underscore();
        return name.match(new RegExp("^" + typeString + "_(.*)$"))[1].camelize();
      }
    });
    ```

    @param {DS.Model subclass} type the type of the record with
      the `belongsTo` relationship.
    @param {String} name the relationship name to convert into a key

    @returns {String} the key
  */
  keyForHasMany: function(type, name) {
    return this.keyForAttributeName(type, name);
  },

  //.........................
  //. MATERIALIZATION HOOKS
  //.........................

  materialize: function(record, serialized, prematerialized) {
    var id;
    if (Ember.isNone(get(record, 'id'))) {
      if (prematerialized && prematerialized.hasOwnProperty('id')) {
        id = prematerialized.id;
      } else {
        id = this.extractId(record.constructor, serialized);
      }
      record.materializeId(id);
    }

    this.materializeAttributes(record, serialized, prematerialized);
    this.materializeRelationships(record, serialized, prematerialized);
  },

  deserializeValue: function(value, attributeType) {
    var transform = this.transforms ? this.transforms[attributeType] : null;

    Ember.assert("You tried to use a attribute type (" + attributeType + ") that has not been registered", transform);
    return transform.deserialize(value);
  },

  materializeAttributes: function(record, serialized, prematerialized) {
    record.eachAttribute(function(name, attribute) {
      if (prematerialized && prematerialized.hasOwnProperty(name)) {
        record.materializeAttribute(name, prematerialized[name]);
      } else {
        this.materializeAttribute(record, serialized, name, attribute.type);
      }
    }, this);
  },

  materializeAttribute: function(record, serialized, attributeName, attributeType) {
    var value = this.extractAttribute(record.constructor, serialized, attributeName);
    value = this.deserializeValue(value, attributeType);

    record.materializeAttribute(attributeName, value);
  },

  materializeRelationships: function(record, hash, prematerialized) {
    record.eachRelationship(function(name, relationship) {
      if (relationship.kind === 'hasMany') {
        if (prematerialized && prematerialized.hasOwnProperty(name)) {
          record.materializeHasMany(name, prematerialized[name]);
        } else {
          this.materializeHasMany(name, record, hash, relationship, prematerialized);
        }
      } else if (relationship.kind === 'belongsTo') {
        if (prematerialized && prematerialized.hasOwnProperty(name)) {
          record.materializeBelongsTo(name, prematerialized[name]);
        } else {
          this.materializeBelongsTo(name, record, hash, relationship, prematerialized);
        }
      }
    }, this);
  },

  materializeHasMany: function(name, record, hash, relationship) {
    var key = this._keyForHasMany(record.constructor, relationship.key);
    record.materializeHasMany(name, this.extractHasMany(record.constructor, hash, key));
  },

  materializeBelongsTo: function(name, record, hash, relationship) {
    var key = this._keyForBelongsTo(record.constructor, relationship.key);
    record.materializeBelongsTo(name, this.extractBelongsTo(record.constructor, hash, key));
  },

  _extractEmbeddedRelationship: function(type, hash, name, relationshipType) {
    var key = this['_keyFor' + relationshipType](type, name);

    if (this.embeddedType(type, name)) {
      return this['extractEmbedded' + relationshipType](type, hash, key);
    }
  },

  _extractEmbeddedBelongsTo: function(type, hash, name) {
    return this._extractEmbeddedRelationship(type, hash, name, 'BelongsTo');
  },

  _extractEmbeddedHasMany: function(type, hash, name) {
    return this._extractEmbeddedRelationship(type, hash, name, 'HasMany');
  },

  /**
    @private

    This method is called to get the primary key for a given
    type.

    If a primary key configuration exists for this type, this
    method will return the configured value. Otherwise, it will
    call the public `primaryKey` hook.

    @param {DS.Model subclass} type
    @returns {String} the primary key for the type
  */
  _primaryKey: function(type) {
    var config = this.configurationForType(type),
        primaryKey = config && config.primaryKey;

    if (primaryKey) {
      return primaryKey;
    } else {
      return this.primaryKey(type);
    }
  },

  /**
    @private

    This method looks up the key for the attribute name and transforms the
    attribute's value using registered transforms.

    Specifically:

    1. Look up the key for the attribute name. If available, this will use
       any registered mappings. Otherwise, it will invoke the public
       `keyForAttributeName` hook.
    2. Get the value from the record using the `attributeName`.
    3. Transform the value using registered transforms for the `attributeType`.
    4. Invoke the public `addAttribute` hook with the hash, key, and
       transformed value.

    @param {any} data the serialized representation being built
    @param {DS.Model} record the record to serialize
    @param {String} attributeName the name of the attribute on the record
    @param {String} attributeType the type of the attribute (e.g. `string`
      or `boolean`)
  */
  _addAttribute: function(data, record, attributeName, attributeType) {
    var key = this._keyForAttributeName(record.constructor, attributeName);
    var value = get(record, attributeName);

    this.addAttribute(data, key, this.serializeValue(value, attributeType));
  },

  /**
    @private

    This method looks up the primary key for the `type` and invokes
    `serializeId` on the `id`.

    It then invokes the public `addId` hook with the primary key and
    the serialized id.

    @param {any} data the serialized representation that is being built
    @param {Ember.Model subclass} type
    @param {any} id the materialized id from the record
  */
  _addId: function(hash, type, id) {
    var primaryKey = this._primaryKey(type);

    this.addId(hash, primaryKey, this.serializeId(id));
  },

  /**
    @private

    This method is called to get a key used in the data from
    an attribute name. It first checks for any mappings before
    calling the public hook `keyForAttributeName`.

    @param {DS.Model subclass} type the type of the record with
      the attribute name `name`
    @param {String} name the attribute name to convert into a key

    @returns {String} the key
  */
  _keyForAttributeName: function(type, name) {
    return this._keyFromMappingOrHook('keyForAttributeName', type, name);
  },

  /**
    @private

    This method is called to get a key used in the data from
    a belongsTo relationship. It first checks for any mappings before
    calling the public hook `keyForBelongsTo`.

    @param {DS.Model subclass} type the type of the record with
      the `belongsTo` relationship.
    @param {String} name the relationship name to convert into a key

    @returns {String} the key
  */
  _keyForBelongsTo: function(type, name) {
    return this._keyFromMappingOrHook('keyForBelongsTo', type, name);
  },

  keyFor: function(description) {
    var type = description.parentType,
        name = description.key;

    switch (description.kind) {
      case 'belongsTo':
        return this._keyForBelongsTo(type, name);
      case 'hasMany':
        return this._keyForHasMany(type, name);
    }
  },

  /**
    @private

    This method is called to get a key used in the data from
    a hasMany relationship. It first checks for any mappings before
    calling the public hook `keyForHasMany`.

    @param {DS.Model subclass} type the type of the record with
      the `hasMany` relationship.
    @param {String} name the relationship name to convert into a key

    @returns {String} the key
  */
  _keyForHasMany: function(type, name) {
    return this._keyFromMappingOrHook('keyForHasMany', type, name);
  },
  /**
    @private

    This method converts the relationship name to a key for serialization,
    and then invokes the public `addBelongsTo` hook.

    @param {any} data the serialized representation that is being built
    @param {DS.Model} record the record to serialize
    @param {String} name the relationship name
    @param {Object} relationship an object representing the relationship
  */
  _addBelongsTo: function(data, record, name, relationship) {
    var key = this._keyForBelongsTo(record.constructor, name);
    this.addBelongsTo(data, record, key, relationship);
  },

  /**
    @private

    This method converts the relationship name to a key for serialization,
    and then invokes the public `addHasMany` hook.

    @param {any} data the serialized representation that is being built
    @param {DS.Model} record the record to serialize
    @param {String} name the relationship name
    @param {Object} relationship an object representing the relationship
  */
  _addHasMany: function(data, record, name, relationship) {
    var key = this._keyForHasMany(record.constructor, name);
    this.addHasMany(data, record, key, relationship);
  },

  /**
    @private

    An internal method that handles checking whether a mapping
    exists for a particular attribute or relationship name before
    calling the public hooks.

    If a mapping is found, and the mapping has a key defined,
    use that instead of invoking the hook.

    @param {String} publicMethod the public hook to invoke if
      a mapping is not found (e.g. `keyForAttributeName`)
    @param {DS.Model subclass} type the type of the record with
      the attribute or relationship name.
    @param {String} name the attribute or relationship name to
      convert into a key
  */
  _keyFromMappingOrHook: function(publicMethod, type, name) {
    var key = this.mappingOption(type, name, 'key');

    if (key) {
      return key;
    } else {
      return this[publicMethod](type, name);
    }
  },

  /**
    TRANSFORMS
  */

  registerTransform: function(type, transform) {
    this.transforms[type] = transform;
  },

  registerEnumTransform: function(type, objects) {
    var transform = {
      deserialize: function(deserialized) {
        return Ember.A(objects).objectAt(deserialized);
      },
      serialize: function(serialized) {
        return Ember.EnumerableUtils.indexOf(objects, serialized);
      },
      values: objects
    };
    this.registerTransform(type, transform);
  },

  /**
    MAPPING CONVENIENCE
  */

  map: function(type, mappings) {
    this.mappings.set(type, mappings);
  },

  configure: function(type, configuration) {
    if (type && !configuration) {
      Ember.merge(this.globalConfigurations, type);
      return;
    }

    var config = Ember.create(this.globalConfigurations);
    Ember.merge(config, configuration);

    this.configurations.set(type, config);
  },

  mappingForType: function(type) {
    this._reifyMappings();
    return this.mappings.get(type) || {};
  },

  configurationForType: function(type) {
    this._reifyConfigurations();
    return this.configurations.get(type) || this.globalConfigurations;
  },

  _reifyMappings: function() {
    if (this._didReifyMappings) { return; }

    var mappings = this.mappings,
        reifiedMappings = Ember.Map.create();

    mappings.forEach(function(key, mapping) {
      if (typeof key === 'string') {
        var type = Ember.get(Ember.lookup, key);
        Ember.assert("Could not find model at path " + key, type);

        reifiedMappings.set(type, mapping);
      } else {
        reifiedMappings.set(key, mapping);
      }
    });

    this.mappings = reifiedMappings;

    this._didReifyMappings = true;
  },

  _reifyConfigurations: function() {
    if (this._didReifyConfigurations) { return; }

    var configurations = this.configurations,
        reifiedConfigurations = Ember.Map.create();

    configurations.forEach(function(key, mapping) {
      if (typeof key === 'string' && key !== 'plurals') {
        var type = Ember.get(Ember.lookup, key);
        Ember.assert("Could not find model at path " + key, type);

        reifiedConfigurations.set(type, mapping);
      } else {
        reifiedConfigurations.set(key, mapping);
      }
    });

    this.configurations = reifiedConfigurations;

    this._didReifyConfigurations = true;
  },

  mappingOption: function(type, name, option) {
    var mapping = this.mappingForType(type)[name];

    return mapping && mapping[option];
  },

  configOption: function(type, option) {
    var config = this.configurationForType(type);

    return config[option];
  },

  // EMBEDDED HELPERS

  embeddedType: function(type, name) {
    return this.mappingOption(type, name, 'embedded');
  },

  eachEmbeddedRecord: function(record, callback, binding) {
    this.eachEmbeddedBelongsToRecord(record, callback, binding);
    this.eachEmbeddedHasManyRecord(record, callback, binding);
  },

  eachEmbeddedBelongsToRecord: function(record, callback, binding) {
    var type = record.constructor;

    this.eachEmbeddedBelongsTo(record.constructor, function(name, relationship, embeddedType) {
      var embeddedRecord = get(record, name);
      if (embeddedRecord) { callback.call(binding, embeddedRecord, embeddedType); }
    });
  },

  eachEmbeddedHasManyRecord: function(record, callback, binding) {
    var type = record.constructor;

    this.eachEmbeddedHasMany(record.constructor, function(name, relationship, embeddedType) {
      var array = get(record, name);
      for (var i=0, l=get(array, 'length'); i<l; i++) {
        callback.call(binding, array.objectAt(i), embeddedType);
      }
    });
  },

  eachEmbeddedHasMany: function(type, callback, binding) {
    this.eachEmbeddedRelationship(type, 'hasMany', callback, binding);
  },

  eachEmbeddedBelongsTo: function(type, callback, binding) {
    this.eachEmbeddedRelationship(type, 'belongsTo', callback, binding);
  },

  eachEmbeddedRelationship: function(type, kind, callback, binding) {
    type.eachRelationship(function(name, relationship) {
      var embeddedType = this.embeddedType(type, name);

      if (embeddedType) {
        if (relationship.kind === kind) {
          callback.call(binding, name, relationship, embeddedType);
        }
      }
    }, this);
  }
});

