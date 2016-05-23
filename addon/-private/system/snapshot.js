/**
  @module ember-data
*/

import Ember from 'ember';
import EmptyObject from "ember-data/-private/system/empty-object";

var get = Ember.get;

/**
  @class Snapshot
  @namespace DS
  @private
  @constructor
  @param {DS.Model} internalModel The model to create a snapshot from
*/
export default function Snapshot(internalModel, options = {}) {
  this._attributes = new EmptyObject();
  this._belongsToRelationships = new EmptyObject();
  this._belongsToIds = new EmptyObject();
  this._hasManyRelationships = new EmptyObject();
  this._hasManyIds = new EmptyObject();

  var record = internalModel.getRecord();
  this.record = record;
  record.eachAttribute((keyName) => this._attributes[keyName] = get(record, keyName));

  this.id = internalModel.id;
  this._internalModel = internalModel;
  this.type = internalModel.type;
  this.modelName = internalModel.type.modelName;

  /**
    A hash of adapter options
    @property adapterOptions
    @type {Object}
  */
  this.adapterOptions = options.adapterOptions;

  this.include = options.include;

  this._changedAttributes = record.changedAttributes();
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
    The type of the underlying record for this snapshot, as a DS.Model.

    @property type
    @type {DS.Model}
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
  attr(keyName) {
    if (keyName in this._attributes) {
      return this._attributes[keyName];
    }
    throw new Ember.Error("Model '" + Ember.inspect(this.record) + "' has no attribute named '" + keyName + "' defined.");
  },

  /**
    Returns all attributes and their corresponding values.

    Example

    ```javascript
    // store.push('post', { id: 1, author: 'Tomster', title: 'Ember.js rocks' });
    postSnapshot.attributes(); // => { author: 'Tomster', title: 'Ember.js rocks' }
    ```

    @method attributes
    @return {Object} All attributes of the current snapshot
  */
  attributes() {
    return Ember.copy(this._attributes);
  },

  /**
    Returns all changed attributes and their old and new values.

    Example

    ```javascript
    // store.push('post', { id: 1, author: 'Tomster', title: 'Ember.js rocks' });
    postModel.set('title', 'Ember.js rocks!');
    postSnapshot.changedAttributes(); // => { title: ['Ember.js rocks', 'Ember.js rocks!'] }
    ```

    @method changedAttributes
    @return {Object} All changed attributes of the current snapshot
  */
  changedAttributes() {
    let changedAttributes = new EmptyObject();
    let changedAttributeKeys = Object.keys(this._changedAttributes);

    for (let i=0, length = changedAttributeKeys.length; i < length; i++) {
      let key = changedAttributeKeys[i];
      changedAttributes[key] = Ember.copy(this._changedAttributes[key]);
    }

    return changedAttributes;
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
    @return {(DS.Snapshot|String|null|undefined)} A snapshot or ID of a known
      relationship or null if the relationship is known but unset. undefined
      will be returned if the contents of the relationship is unknown.
  */
  belongsTo(keyName, options) {
    var id = options && options.id;
    var relationship, inverseRecord, hasData;
    var result;

    if (id && keyName in this._belongsToIds) {
      return this._belongsToIds[keyName];
    }

    if (!id && keyName in this._belongsToRelationships) {
      return this._belongsToRelationships[keyName];
    }

    relationship = this._internalModel._relationships.get(keyName);
    if (!(relationship && relationship.relationshipMeta.kind === 'belongsTo')) {
      throw new Ember.Error("Model '" + Ember.inspect(this.record) + "' has no belongsTo relationship named '" + keyName + "' defined.");
    }

    hasData = get(relationship, 'hasData');
    inverseRecord = get(relationship, 'inverseRecord');

    if (hasData) {
      if (inverseRecord && !inverseRecord.isDeleted()) {
        if (id) {
          result = get(inverseRecord, 'id');
        } else {
          result = inverseRecord.createSnapshot();
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
    @return {(Array|undefined)} An array of snapshots or IDs of a known
      relationship or an empty array if the relationship is known but unset.
      undefined will be returned if the contents of the relationship is unknown.
  */
  hasMany(keyName, options) {
    var ids = options && options.ids;
    var relationship, members, hasData;
    var results;

    if (ids && keyName in this._hasManyIds) {
      return this._hasManyIds[keyName];
    }

    if (!ids && keyName in this._hasManyRelationships) {
      return this._hasManyRelationships[keyName];
    }

    relationship = this._internalModel._relationships.get(keyName);
    if (!(relationship && relationship.relationshipMeta.kind === 'hasMany')) {
      throw new Ember.Error("Model '" + Ember.inspect(this.record) + "' has no hasMany relationship named '" + keyName + "' defined.");
    }

    hasData = get(relationship, 'hasData');
    members = get(relationship, 'members');

    if (hasData) {
      results = [];
      members.forEach((member) => {
        if (!member.isDeleted()) {
          if (ids) {
            results.push(member.id);
          } else {
            results.push(member.createSnapshot());
          }
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
  eachAttribute(callback, binding) {
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
  eachRelationship(callback, binding) {
    this.record.eachRelationship(callback, binding);
  },

  /**
    @method serialize
    @param {Object} options
    @return {Object} an object whose values are primitive JSON values only
   */
  serialize(options) {
    return this.record.store.serializerFor(this.modelName).serialize(this, options);
  }
};
