import { DEBUG } from '@glimmer/env';
import { assign } from '@ember/polyfills';
import { isEqual } from '@ember/utils';
import { assert, warn, inspect } from '@ember/debug';
import { run } from '@ember/runloop';
import isEnabled from '../../features';
import Relationships from '../relationships/state/create';
import coerceId from '../coerce-id';

let nextBfsId = 1;
export default class RecordData {
  constructor(modelName, id, clientId, storeWrapper, store) {
    this.store = store;
    this.modelName = modelName;
    this.__relationships = null;
    this.__implicitRelationships = null;
    this.clientId = clientId;
    this.id = id;
    this.storeWrapper = storeWrapper;
    this.isDestroyed = false;
    this._isNew = false;
    // Used during the mark phase of unloading to avoid checking the same internal
    // model twice in the same scan
    this._bfsId = 0;
    this.reset();
  }

  // PUBLIC API

  getResourceIdentifier() {
    return {
      id: this.id,
      type: this.modelName,
      clientId: this.clientId,
    };
  }

  pushData(data, calculateChange) {
    let changedKeys;

    if (calculateChange) {
      changedKeys = this._changedKeys(data.attributes);
    }

    assign(this._data, data.attributes);
    if (this.__attributes) {
      // only do if we have attribute changes
      this._updateChangedAttributes();
    }

    if (data.relationships) {
      this._setupRelationships(data);
    }

    if (data.id) {
      this.id = coerceId(data.id);
    }

    return changedKeys;
  }

  willCommit() {
    this._inFlightAttributes = this._attributes;
    this._attributes = null;
  }

  hasChangedAttributes() {
    return this.__attributes !== null && Object.keys(this.__attributes).length > 0;
  }

  // this is a hack bc we don't have access to the state machine
  //   and relationships need this info and @runspired didn't see
  //   how to get it just yet from storeWrapper.
  isEmpty() {
    return this.__attributes === null && this.__inFlightAttributes === null && this.__data === null;
  }

  reset() {
    this.__attributes = null;
    this.__inFlightAttributes = null;
    this.__data = null;
  }

  _setupRelationships(data) {
    let relationships = this.storeWrapper.relationshipsDefinitionFor(this.modelName);
    let keys = Object.keys(relationships);
    for (let i = 0; i < keys.length; i++) {
      let relationshipName = keys[i];

      if (!data.relationships[relationshipName]) {
        continue;
      }

      // in debug, assert payload validity eagerly
      let relationshipData = data.relationships[relationshipName];
      if (DEBUG) {
        let store = this.store;
        let recordData = this;
        let relationshipMeta = relationships[relationshipName];
        if (!relationshipData || !relationshipMeta) {
          continue;
        }

        if (relationshipData.links) {
          let isAsync = relationshipMeta.options && relationshipMeta.options.async !== false;
          warn(
            `You pushed a record of type '${
              this.modelName
            }' with a relationship '${relationshipName}' configured as 'async: false'. You've included a link but no primary data, this may be an error in your payload. EmberData will treat this relationship as known-to-be-empty.`,
            isAsync || relationshipData.data,
            {
              id: 'ds.store.push-link-for-sync-relationship',
            }
          );
        } else if (relationshipData.data) {
          if (relationshipMeta.kind === 'belongsTo') {
            assert(
              `A ${
                this.modelName
              } record was pushed into the store with the value of ${relationshipName} being ${inspect(
                relationshipData.data
              )}, but ${relationshipName} is a belongsTo relationship so the value must not be an array. You should probably check your data payload or serializer.`,
              !Array.isArray(relationshipData.data)
            );
            assertRelationshipData(store, recordData, relationshipData.data, relationshipMeta);
          } else if (relationshipMeta.kind === 'hasMany') {
            assert(
              `A ${
                this.modelName
              } record was pushed into the store with the value of ${relationshipName} being '${inspect(
                relationshipData.data
              )}', but ${relationshipName} is a hasMany relationship so the value must be an array. You should probably check your data payload or serializer.`,
              Array.isArray(relationshipData.data)
            );
            if (Array.isArray(relationshipData.data)) {
              for (let i = 0; i < relationshipData.data.length; i++) {
                assertRelationshipData(
                  store,
                  recordData,
                  relationshipData.data[i],
                  relationshipMeta
                );
              }
            }
          }
        }
      }
      let relationship = this._relationships.get(relationshipName);

      relationship.push(relationshipData);
    }
  }

  /*
    Checks if the attributes which are considered as changed are still
    different to the state which is acknowledged by the server.

    This method is needed when data for the internal model is pushed and the
    pushed data might acknowledge dirty attributes as confirmed.

    @method updateChangedAttributes
    @private
   */
  _updateChangedAttributes() {
    let changedAttributes = this.changedAttributes();
    let changedAttributeNames = Object.keys(changedAttributes);
    let attrs = this._attributes;

    for (let i = 0, length = changedAttributeNames.length; i < length; i++) {
      let attribute = changedAttributeNames[i];
      let data = changedAttributes[attribute];
      let oldData = data[0];
      let newData = data[1];

      if (oldData === newData) {
        delete attrs[attribute];
      }
    }
  }

  /*
    Returns an object, whose keys are changed properties, and value is an
    [oldProp, newProp] array.

    @method changedAttributes
    @private
  */
  changedAttributes() {
    let oldData = this._data;
    let currentData = this._attributes;
    let inFlightData = this._inFlightAttributes;
    let newData = assign({}, inFlightData, currentData);
    let diffData = Object.create(null);
    let newDataKeys = Object.keys(newData);

    for (let i = 0, length = newDataKeys.length; i < length; i++) {
      let key = newDataKeys[i];
      diffData[key] = [oldData[key], newData[key]];
    }

    return diffData;
  }

  isNew() {
    return this._isNew;
  }

  rollbackAttributes() {
    let dirtyKeys;
    if (this.hasChangedAttributes()) {
      dirtyKeys = Object.keys(this._attributes);
      this._attributes = null;
    }

    if (this.isNew()) {
      this.removeFromInverseRelationships(true);
    }

    this._inFlightAttributes = null;

    return dirtyKeys;
  }

  didCommit(data) {
    this._isNew = false;
    if (data) {
      // this.store._internalModelDidReceiveRelationshipData(this.modelName, this.id, data.relationships);
      if (data.relationships) {
        this._setupRelationships(data);
      }
      if (data.id) {
        // didCommit provided an ID, notify the store of it
        this.storeWrapper.setRecordId(this.modelName, data.id, this.clientId);
        this.id = coerceId(data.id);
      }
      data = data.attributes;
    }
    let changedKeys = this._changedKeys(data);

    assign(this._data, this.__inFlightAttributes, data);

    this._inFlightAttributes = null;

    this._updateChangedAttributes();
    return changedKeys;
  }

  // get ResourceIdentifiers for "current state"
  getHasMany(key) {
    return this._relationships.get(key).getData();
  }

  // set a new "current state" via ResourceIdentifiers
  setDirtyHasMany(key, recordDatas) {
    let relationship = this._relationships.get(key);
    relationship.clear();
    relationship.addRecordDatas(recordDatas);
  }

  // append to "current state" via RecordDatas
  addToHasMany(key, recordDatas, idx) {
    this._relationships.get(key).addRecordDatas(recordDatas, idx);
  }

  // remove from "current state" via RecordDatas
  removeFromHasMany(key, recordDatas) {
    this._relationships.get(key).removeRecordDatas(recordDatas);
  }

  commitWasRejected() {
    let keys = Object.keys(this._inFlightAttributes);
    if (keys.length > 0) {
      let attrs = this._attributes;
      for (let i = 0; i < keys.length; i++) {
        if (attrs[keys[i]] === undefined) {
          attrs[keys[i]] = this._inFlightAttributes[keys[i]];
        }
      }
    }
    this._inFlightAttributes = null;
  }

  getBelongsTo(key) {
    return this._relationships.get(key).getData();
  }

  setDirtyBelongsTo(key, recordDataOrPromise) {
    if (recordDataOrPromise === undefined) {
      recordDataOrPromise = null;
    }

    if (recordDataOrPromise && recordDataOrPromise.then) {
      this._relationships.get(key).setRecordPromise(recordDataOrPromise);
    } else {
      this._relationships.get(key).setRecordData(recordDataOrPromise);
    }
  }

  setDirtyAttribute(key, value) {
    let originalValue;
    // Add the new value to the changed attributes hash
    this._attributes[key] = value;

    if (key in this._inFlightAttributes) {
      originalValue = this._inFlightAttributes[key];
    } else {
      originalValue = this._data[key];
    }
    // If we went back to our original value, we shouldn't keep the attribute around anymore
    if (value === originalValue) {
      delete this._attributes[key];
    }
  }

  getAttr(key) {
    if (key in this._attributes) {
      return this._attributes[key];
    } else if (key in this._inFlightAttributes) {
      return this._inFlightAttributes[key];
    } else {
      return this._data[key];
    }
  }

  hasAttr(key) {
    return key in this._attributes || key in this._inFlightAttributes || key in this._data;
  }

  unloadRecord() {
    if (this.isDestroyed) {
      return;
    }
    this._destroyRelationships();
    this.reset();
    if (!this._scheduledDestroy) {
      this._scheduledDestroy = run.backburner.schedule(
        'destroy',
        this,
        '_cleanupOrphanedRecordDatas'
      );
    }
  }

  _cleanupOrphanedRecordDatas() {
    let relatedRecordDatas = this._allRelatedRecordDatas();
    if (areAllModelsUnloaded(relatedRecordDatas)) {
      for (let i = 0; i < relatedRecordDatas.length; ++i) {
        let recordData = relatedRecordDatas[i];
        if (!recordData.isDestroyed) {
          recordData.destroy();
        }
      }
    }
    this._scheduledDestroy = null;
  }

  destroy() {
    this._relationships.forEach((name, rel) => rel.destroy());
    this.isDestroyed = true;
    this.storeWrapper.disconnectRecord(this.modelName, this.id, this.clientId);
  }

  isRecordInUse() {
    return this.storeWrapper.isRecordInUse(this.modelName, this.id, this.clientId);
  }

  /**
    Computes the set of internal models reachable from `this` across exactly one
    relationship.

    @return {Array} An array containing the internal models that `this` belongs
    to or has many.

  */
  _directlyRelatedRecordDatas() {
    let array = [];

    this._relationships.forEach((name, rel) => {
      let members = rel.members.list;
      let canonicalMembers = rel.canonicalMembers.list;
      array = array.concat(members, canonicalMembers);
    });
    return array;
  }

  /**
    Computes the set of internal models reachable from this internal model.

    Reachability is determined over the relationship graph (ie a graph where
    nodes are internal models and edges are belongs to or has many
    relationships).

    @return {Array} An array including `this` and all internal models reachable
    from `this`.
  */
  _allRelatedRecordDatas() {
    let array = [];
    let queue = [];
    let bfsId = nextBfsId++;
    queue.push(this);
    this._bfsId = bfsId;
    while (queue.length > 0) {
      let node = queue.shift();
      array.push(node);

      let related = node._directlyRelatedRecordDatas();

      for (let i = 0; i < related.length; ++i) {
        let recordData = related[i];

        if (recordData instanceof RecordData) {
          assert('Internal Error: seen a future bfs iteration', recordData._bfsId <= bfsId);
          if (recordData._bfsId < bfsId) {
            queue.push(recordData);
            recordData._bfsId = bfsId;
          }
        }
      }
    }

    return array;
  }

  isAttrDirty(key) {
    if (this._attributes[key] === undefined) {
      return false;
    }
    let originalValue;
    if (this._inFlightAttributes[key] !== undefined) {
      originalValue = this._inFlightAttributes[key];
    } else {
      originalValue = this._data[key];
    }

    return originalValue !== this._attributes[key];
  }

  get _attributes() {
    if (this.__attributes === null) {
      this.__attributes = Object.create(null);
    }
    return this.__attributes;
  }

  set _attributes(v) {
    this.__attributes = v;
  }

  get _relationships() {
    if (this.__relationships === null) {
      this.__relationships = new Relationships(this);
    }

    return this.__relationships;
  }

  get _data() {
    if (this.__data === null) {
      this.__data = Object.create(null);
    }
    return this.__data;
  }

  set _data(v) {
    this.__data = v;
  }

  /*
   implicit relationships are relationship which have not been declared but the inverse side exists on
   another record somewhere
   For example if there was

   ```app/models/comment.js
   import DS from 'ember-data';

   export default DS.Model.extend({
   name: DS.attr()
   })
   ```

   but there is also

   ```app/models/post.js
   import DS from 'ember-data';

   export default DS.Model.extend({
   name: DS.attr(),
   comments: DS.hasMany('comment')
   })
   ```

   would have a implicit post relationship in order to be do things like remove ourselves from the post
   when we are deleted
  */
  get _implicitRelationships() {
    if (this.__implicitRelationships === null) {
      this.__implicitRelationships = Object.create(null);
    }
    return this.__implicitRelationships;
  }

  get _inFlightAttributes() {
    if (this.__inFlightAttributes === null) {
      this.__inFlightAttributes = Object.create(null);
    }
    return this.__inFlightAttributes;
  }

  set _inFlightAttributes(v) {
    this.__inFlightAttributes = v;
  }

  /**
   * Receives options passed to `store.createRecord` and is given the opportunity
   * to handle them.
   *
   * The return value is an object of options to pass to `Record.create()`
   *
   * @param options
   * @private
   */
  _initRecordCreateOptions(options) {
    let createOptions = {};

    if (options !== undefined) {
      let { modelName, storeWrapper } = this;
      let attributeDefs = storeWrapper.attributesDefinitionFor(modelName);
      let relationshipDefs = storeWrapper.relationshipsDefinitionFor(modelName);
      let relationships = this._relationships;
      let propertyNames = Object.keys(options);

      for (let i = 0; i < propertyNames.length; i++) {
        let name = propertyNames[i];
        let propertyValue = options[name];

        if (name === 'id') {
          this.id = propertyValue;
          continue;
        }

        let fieldType = relationshipDefs[name] || attributeDefs[name];
        let kind = fieldType !== undefined ? fieldType.kind : null;
        let relationship;

        switch (kind) {
          case 'attribute':
            this.setDirtyAttribute(name, propertyValue);
            break;
          case 'belongsTo':
            this.setDirtyBelongsTo(name, propertyValue);
            relationship = relationships.get(name);
            relationship.setHasAnyRelationshipData(true);
            relationship.setRelationshipIsEmpty(false);
            break;
          case 'hasMany':
            this.setDirtyHasMany(name, propertyValue);
            relationship = relationships.get(name);
            relationship.setHasAnyRelationshipData(true);
            relationship.setRelationshipIsEmpty(false);
            break;
          default:
            // reflect back (pass-thru) unknown properties
            createOptions[name] = propertyValue;
        }
      }
    }

    return createOptions;
  }

  /*


    TODO IGOR AND DAVID this shouldn't be public
   This method should only be called by records in the `isNew()` state OR once the record
   has been deleted and that deletion has been persisted.

   It will remove this record from any associated relationships.

   If `isNew` is true (default false), it will also completely reset all
    relationships to an empty state as well.

    @method removeFromInverseRelationships
    @param {Boolean} isNew whether to unload from the `isNew` perspective
    @private
   */
  removeFromInverseRelationships(isNew = false) {
    this._relationships.forEach((name, rel) => {
      rel.removeCompletelyFromInverse();
      if (isNew === true) {
        rel.clear();
      }
    });

    let implicitRelationships = this._implicitRelationships;
    this.__implicitRelationships = null;

    Object.keys(implicitRelationships).forEach(key => {
      let rel = implicitRelationships[key];

      rel.removeCompletelyFromInverse();
      if (isNew === true) {
        rel.clear();
      }
    });
  }

  _destroyRelationships() {
    let relationships = this._relationships;
    relationships.forEach((name, rel) => destroyRelationship(rel));

    let implicitRelationships = this._implicitRelationships;
    this.__implicitRelationships = null;
    Object.keys(implicitRelationships).forEach(key => {
      let rel = implicitRelationships[key];
      destroyRelationship(rel);
    });
  }

  clientDidCreate() {
    this._isNew = true;
  }

  /*
    Ember Data has 3 buckets for storing the value of an attribute on an internalModel.

    `_data` holds all of the attributes that have been acknowledged by
    a backend via the adapter. When rollbackAttributes is called on a model all
    attributes will revert to the record's state in `_data`.

    `_attributes` holds any change the user has made to an attribute
    that has not been acknowledged by the adapter. Any values in
    `_attributes` are have priority over values in `_data`.

    `_inFlightAttributes`. When a record is being synced with the
    backend the values in `_attributes` are copied to
    `_inFlightAttributes`. This way if the backend acknowledges the
    save but does not return the new state Ember Data can copy the
    values from `_inFlightAttributes` to `_data`. Without having to
    worry about changes made to `_attributes` while the save was
    happenign.


    Changed keys builds a list of all of the values that may have been
    changed by the backend after a successful save.

    It does this by iterating over each key, value pair in the payload
    returned from the server after a save. If the `key` is found in
    `_attributes` then the user has a local changed to the attribute
    that has not been synced with the server and the key is not
    included in the list of changed keys.



    If the value, for a key differs from the value in what Ember Data
    believes to be the truth about the backend state (A merger of the
    `_data` and `_inFlightAttributes` objects where
    `_inFlightAttributes` has priority) then that means the backend
    has updated the value and the key is added to the list of changed
    keys.

    @method _changedKeys
    @private
  */
  /*
      TODO IGOR DAVID
      There seems to be a potential bug here, where we will return keys that are not
      in the schema
  */
  _changedKeys(updates) {
    let changedKeys = [];

    if (updates) {
      let original, i, value, key;
      let keys = Object.keys(updates);
      let length = keys.length;
      let hasAttrs = this.hasChangedAttributes();
      let attrs;
      if (hasAttrs) {
        attrs = this._attributes;
      }

      original = assign(Object.create(null), this._data, this.__inFlightAttributes);

      for (i = 0; i < length; i++) {
        key = keys[i];
        value = updates[key];

        // A value in _attributes means the user has a local change to
        // this attributes. We never override this value when merging
        // updates from the backend so we should not sent a change
        // notification if the server value differs from the original.
        if (hasAttrs === true && attrs[key] !== undefined) {
          continue;
        }

        if (!isEqual(original[key], value)) {
          changedKeys.push(key);
        }
      }
    }

    return changedKeys;
  }

  toString() {
    return `<${this.modelName}:${this.id}>`;
  }
}

if (isEnabled('ds-rollback-attribute')) {
  /*
     Returns the latest truth for an attribute - the canonical value, or the
     in-flight value.

     @method lastAcknowledgedValue
     @private
  */
  RecordData.prototype.lastAcknowledgedValue = function lastAcknowledgedValue(key) {
    if (key in this._inFlightAttributes) {
      return this._inFlightAttributes[key];
    } else {
      return this._data[key];
    }
  };
}

function assertRelationshipData(store, recordData, data, meta) {
  assert(
    `A ${recordData.modelName} record was pushed into the store with the value of ${
      meta.key
    } being '${JSON.stringify(data)}', but ${
      meta.key
    } is a belongsTo relationship so the value must not be an array. You should probably check your data payload or serializer.`,
    !Array.isArray(data)
  );
  assert(
    `Encountered a relationship identifier without a type for the ${meta.kind} relationship '${
      meta.key
    }' on ${recordData}, expected a json-api identifier with type '${
      meta.type
    }' but found '${JSON.stringify(
      data
    )}'. Please check your serializer and make sure it is serializing the relationship payload into a JSON API format.`,
    data === null || (typeof data.type === 'string' && data.type.length)
  );
  assert(
    `Encountered a relationship identifier without an id for the ${meta.kind} relationship '${
      meta.key
    }' on ${recordData}, expected a json-api identifier but found '${JSON.stringify(
      data
    )}'. Please check your serializer and make sure it is serializing the relationship payload into a JSON API format.`,
    data === null || coerceId(data.id)
  );
  assert(
    `Encountered a relationship identifier with type '${data.type}' for the ${
      meta.kind
    } relationship '${meta.key}' on ${recordData}, Expected a json-api identifier with type '${
      meta.type
    }'. No model was found for '${data.type}'.`,
    data === null || !data.type || store._hasModelFor(data.type)
  );
}

// Handle dematerialization for relationship `rel`.  In all cases, notify the
// relatinoship of the dematerialization: this is done so the relationship can
// notify its inverse which needs to update state
//
// If the inverse is sync, unloading this record is treated as a client-side
// delete, so we remove the inverse records from this relationship to
// disconnect the graph.  Because it's not async, we don't need to keep around
// the internalModel as an id-wrapper for references and because the graph is
// disconnected we can actually destroy the internalModel when checking for
// orphaned models.
function destroyRelationship(rel) {
  rel.recordDataDidDematerialize();

  if (rel._inverseIsSync()) {
    rel.removeAllRecordDatasFromOwn();
    rel.removeAllCanonicalRecordDatasFromOwn();
  }
}

function areAllModelsUnloaded(recordDatas) {
  for (let i = 0; i < recordDatas.length; ++i) {
    if (recordDatas[i].isRecordInUse()) {
      return false;
    }
  }
  return true;
}
