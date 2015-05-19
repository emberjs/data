/**
  @module ember-data
*/

var get = Ember.get;

/**
  @class Snapshot
  @namespace DS
  @private
  @constructor
  @param {DS.Model} record The record to create a snapshot from
*/
function Snapshot(record) {
  this._attributes = Ember.create(null);
  this._belongsToRelationships = Ember.create(null);
  this._belongsToIds = Ember.create(null);
  this._hasManyRelationships = Ember.create(null);
  this._hasManyIds = Ember.create(null);

  record.eachAttribute(function(keyName) {
    this._attributes[keyName] = get(record, keyName);
  }, this);

  this.id = get(record, 'id');
  this.record = record;
  this.type = record.constructor;
  this.modelName = record.constructor.modelName;

  // The following code is here to keep backwards compatibility when accessing
  // `constructor` directly.
  //
  // With snapshots you should use `type` instead of `constructor`.
  //
  // Remove for Ember Data 1.0.
  if (Ember.platform.hasPropertyAccessors) {
    var callDeprecate = true;

    Ember.defineProperty(this, 'constructor', {
      get: function() {
        // Ugly hack since accessing error.stack (done in `Ember.deprecate()`)
        // causes the internals of Chrome to access the constructor, which then
        // causes an infinite loop if accessed and calls `Ember.deprecate()`
        // again.
        if (callDeprecate) {
          callDeprecate = false;
          Ember.deprecate('Usage of `snapshot.constructor` is deprecated, use `snapshot.type` instead.');
          callDeprecate = true;
        }

        return this.type;
      }
    });
  } else {
    this.constructor = this.type;
  }
}

Snapshot.prototype = {
  constructor: Snapshot,

  /**
    The id of the snapshot's underlying record

    Example

    ```javascript
    // store.push('post', { id: 1, author: 'Tomster', title: 'Ember.js rocks' });
    postSnapshot.id; // => '1'
    ```

    @property id
    @type {String}
  */
  id: null,

  /**
    The underlying record for this snapshot. Can be used to access methods and
    properties defined on the record.

    Example

    ```javascript
    var json = snapshot.record.toJSON();
    ```

    @property record
    @type {DS.Model}
  */
  record: null,

  /**
    The type of the underlying record for this snapshot, as a subclass of DS.Model.

    @property type
    @type {subclass of DS.Model}
  */
  type: null,

  /**
    The name of the type of the underlying record for this snapshot, as a string.

    @property modelName
    @type {String}
  */
  modelName: null,

  /**
    Returns the value of an attribute.

    Example

    ```javascript
    // store.push('post', { id: 1, author: 'Tomster', title: 'Ember.js rocks' });
    postSnapshot.attr('author'); // => 'Tomster'
    postSnapshot.attr('title'); // => 'Ember.js rocks'
    ```

    Note: Values are loaded eagerly and cached when the snapshot is created.

    @method attr
    @param {String} keyName
    @return {Object} The attribute value or undefined
  */
  attr: function(keyName) {
    if (keyName in this._attributes) {
      return this._attributes[keyName];
    }
    throw new Ember.Error("Model '" + Ember.inspect(this.record) + "' has no attribute named '" + keyName + "' defined.");
  },

  /**
    Returns all attributes and their corresponding values.

    Example

    ```javascript
    // store.push('post', { id: 1, author: 'Tomster', title: 'Hello World' });
    postSnapshot.attributes(); // => { author: 'Tomster', title: 'Ember.js rocks' }
    ```

    @method attributes
    @return {Object} All attributes of the current snapshot
  */
  attributes: function() {
    return Ember.copy(this._attributes);
  },

  /**
    Returns the current value of a belongsTo relationship.

    `belongsTo` takes an optional hash of options as a second parameter,
    currently supported options are:

   - `id`: set to `true` if you only want the ID of the related record to be
      returned.

    Example

    ```javascript
    // store.push('post', { id: 1, title: 'Hello World' });
    // store.createRecord('comment', { body: 'Lorem ipsum', post: post });
    commentSnapshot.belongsTo('post'); // => DS.Snapshot
    commentSnapshot.belongsTo('post', { id: true }); // => '1'

    // store.push('comment', { id: 1, body: 'Lorem ipsum' });
    commentSnapshot.belongsTo('post'); // => undefined
    ```

    Calling `belongsTo` will return a new Snapshot as long as there's any known
    data for the relationship available, such as an ID. If the relationship is
    known but unset, `belongsTo` will return `null`. If the contents of the
    relationship is unknown `belongsTo` will return `undefined`.

    Note: Relationships are loaded lazily and cached upon first access.

    @method belongsTo
    @param {String} keyName
    @param {Object} [options]
    @return {DS.Snapshot|String|null|undefined} A snapshot or ID of a known
      relationship or null if the relationship is known but unset. undefined
      will be returned if the contents of the relationship is unknown.
  */
  belongsTo: function(keyName, options) {
    var id = options && options.id;
    var relationship, inverseRecord, hasData;
    var result;

    if (id && keyName in this._belongsToIds) {
      return this._belongsToIds[keyName];
    }

    if (!id && keyName in this._belongsToRelationships) {
      return this._belongsToRelationships[keyName];
    }

    relationship = this.record._relationships[keyName];
    if (!(relationship && relationship.relationshipMeta.kind === 'belongsTo')) {
      throw new Ember.Error("Model '" + Ember.inspect(this.record) + "' has no belongsTo relationship named '" + keyName + "' defined.");
    }

    hasData = get(relationship, 'hasData');
    inverseRecord = get(relationship, 'inverseRecord');

    if (hasData) {
      if (inverseRecord) {
        if (id) {
          result = get(inverseRecord, 'id');
        } else {
          result = inverseRecord._createSnapshot();
        }
      } else {
        result = null;
      }
    }

    if (id) {
      this._belongsToIds[keyName] = result;
    } else {
      this._belongsToRelationships[keyName] = result;
    }

    return result;
  },

  /**
    Returns the current value of a hasMany relationship.

    `hasMany` takes an optional hash of options as a second parameter,
    currently supported options are:

   - `ids`: set to `true` if you only want the IDs of the related records to be
      returned.

    Example

    ```javascript
    // store.push('post', { id: 1, title: 'Hello World', comments: [2, 3] });
    postSnapshot.hasMany('comments'); // => [DS.Snapshot, DS.Snapshot]
    postSnapshot.hasMany('comments', { ids: true }); // => ['2', '3']

    // store.push('post', { id: 1, title: 'Hello World' });
    postSnapshot.hasMany('comments'); // => undefined
    ```

    Note: Relationships are loaded lazily and cached upon first access.

    @method hasMany
    @param {String} keyName
    @param {Object} [options]
    @return {Array|undefined} An array of snapshots or IDs of a known
      relationship or an empty array if the relationship is known but unset.
      undefined will be returned if the contents of the relationship is unknown.
  */
  hasMany: function(keyName, options) {
    var ids = options && options.ids;
    var relationship, members, hasData;
    var results;

    if (ids && keyName in this._hasManyIds) {
      return this._hasManyIds[keyName];
    }

    if (!ids && keyName in this._hasManyRelationships) {
      return this._hasManyRelationships[keyName];
    }

    relationship = this.record._relationships[keyName];
    if (!(relationship && relationship.relationshipMeta.kind === 'hasMany')) {
      throw new Ember.Error("Model '" + Ember.inspect(this.record) + "' has no hasMany relationship named '" + keyName + "' defined.");
    }

    hasData = get(relationship, 'hasData');
    members = get(relationship, 'members');

    if (hasData) {
      results = [];
      members.forEach(function(member) {
        if (ids) {
          results.push(get(member, 'id'));
        } else {
          results.push(member._createSnapshot());
        }
      });
    }

    if (ids) {
      this._hasManyIds[keyName] = results;
    } else {
      this._hasManyRelationships[keyName] = results;
    }

    return results;
  },

  /**
    Iterates through all the attributes of the model, calling the passed
    function on each attribute.

    Example

    ```javascript
    snapshot.eachAttribute(function(name, meta) {
      // ...
    });
    ```

    @method eachAttribute
    @param {Function} callback the callback to execute
    @param {Object} [binding] the value to which the callback's `this` should be bound
  */
  eachAttribute: function(callback, binding) {
    this.record.eachAttribute(callback, binding);
  },

  /**
    Iterates through all the relationships of the model, calling the passed
    function on each relationship.

    Example

    ```javascript
    snapshot.eachRelationship(function(name, relationship) {
      // ...
    });
    ```

    @method eachRelationship
    @param {Function} callback the callback to execute
    @param {Object} [binding] the value to which the callback's `this` should be bound
  */
  eachRelationship: function(callback, binding) {
    this.record.eachRelationship(callback, binding);
  },

  /**
    @method get
    @param {String} keyName
    @return {Object} The property value
    @deprecated Use [attr](#method_attr), [belongsTo](#method_belongsTo) or [hasMany](#method_hasMany) instead
  */
  get: function(keyName) {
    Ember.deprecate('Using DS.Snapshot.get() is deprecated. Use .attr(), .belongsTo() or .hasMany() instead.');

    if (keyName === 'id') {
      return this.id;
    }

    if (keyName in this._attributes) {
      return this.attr(keyName);
    }

    var relationship = this.record._relationships[keyName];

    if (relationship && relationship.relationshipMeta.kind === 'belongsTo') {
      return this.belongsTo(keyName);
    }
    if (relationship && relationship.relationshipMeta.kind === 'hasMany') {
      return this.hasMany(keyName);
    }

    return get(this.record, keyName);
  },

  /**
    @method unknownProperty
    @param {String} keyName
    @return {Object} The property value
    @deprecated Use [attr](#method_attr), [belongsTo](#method_belongsTo) or [hasMany](#method_hasMany) instead
  */
  unknownProperty: function(keyName) {
    return this.get(keyName);
  },

  /**
    @method _createSnapshot
    @private
  */
  _createSnapshot: function() {
    Ember.deprecate("You called _createSnapshot on what's already a DS.Snapshot. You shouldn't manually create snapshots in your adapter since the store passes snapshots to adapters by default.");
    return this;
  }
};

Ember.defineProperty(Snapshot.prototype, 'typeKey', {
  enumerable: false,
  get: function() {
    Ember.deprecate('Snapshot.typeKey is deprecated. Use snapshot.modelName instead.');
    return this.modelName;
  },
  set: function() {
    Ember.assert('Setting snapshot.typeKey is not supported. In addition, Snapshot.typeKey has been deprecated for Snapshot.modelName.');
  }
});

export default Snapshot;
