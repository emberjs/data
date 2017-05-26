import Ember from 'ember';
import Reference from './reference';

/**
   An RecordReference is a low level API that allows users and
   addon author to perform meta-operations on a record.

   @class RecordReference
   @namespace DS
*/
const RecordReference = function(store, internalModel) {
  this._super$constructor(store, internalModel);
  this.type = internalModel.modelName;
  this._id = internalModel.id;
};

RecordReference.prototype = Object.create(Reference.prototype);
RecordReference.prototype.constructor = RecordReference;
RecordReference.prototype._super$constructor = Reference;

/**
   The `id` of the record that this reference refers to.

   Together, the `type` and `id` properties form a composite key for
   the identity map.

   Example

   ```javascript
   let userRef = store.getReference('user', 1);

   userRef.id(); // '1'
   ```

   @method id
   @return {String} The id of the record.
*/
RecordReference.prototype.id = function() {
  return this._id;
};

/**
   How the reference will be looked up when it is loaded: Currently
   this always return `identity` to signifying that a record will be
   loaded by the `type` and `id`.

   Example

   ```javascript
   const userRef = store.getReference('user', 1);

   userRef.remoteType(); // 'identity'
   ```

   @method remoteType
   @return {String} 'identity'
*/
RecordReference.prototype.remoteType = function() {
  return 'identity';
};

/**
  This API allows you to provide a reference with new data. The
  simplest usage of this API is similar to `store.push`: you provide a
  normalized hash of data and the object represented by the reference
  will update.

  If you pass a promise to `push`, Ember Data will not ask the adapter
  for the data if another attempt to fetch it is made in the
  interim. When the promise resolves, the underlying object is updated
  with the new data, and the promise returned by *this function* is resolved
  with that object.

  For example, `recordReference.push(promise)` will be resolved with a
  record.

   Example

   ```javascript
   let userRef = store.getReference('user', 1);

   // provide data for reference
   userRef.push({ data: { id: 1, username: "@user" }}).then(function(user) {
     userRef.value() === user;
   });
   ```

  @method push
  @param {Promise|Object}
  @return Promise<record> a promise for the value (record or relationship)
*/
RecordReference.prototype.push = function(objectOrPromise) {
  return Ember.RSVP.resolve(objectOrPromise).then((data) => {
    return this.store.push(data);
  });
};

/**
  If the entity referred to by the reference is already loaded, it is
  present as `reference.value`. Otherwise the value returned by this function
  is `null`.

   Example

   ```javascript
   let userRef = store.getReference('user', 1);

   userRef.value(); // user
   ```

   @method value
   @return {DS.Model} the record for this RecordReference
*/
RecordReference.prototype.value = function() {
  if (this.internalModel.hasRecord) {
    return this.internalModel.getRecord();
  }
};

/**
   Triggers a fetch for the backing entity based on its `remoteType`
   (see `remoteType` definitions per reference type).

   Example

   ```javascript
   let userRef = store.getReference('user', 1);

   // load user (via store.find)
   userRef.load().then(...)
   ```

   @method load
   @return {Promise<record>} the record for this RecordReference
*/
RecordReference.prototype.load = function() {
  return this.store.findRecord(this.type, this._id);
};

/**
   Reloads the record if it is already loaded. If the record is not
   loaded it will load the record via `store.findRecord`

   Example

   ```javascript
   let userRef = store.getReference('user', 1);

   // or trigger a reload
   userRef.reload().then(...)
   ```

   @method reload
   @return {Promise<record>} the record for this RecordReference
*/
RecordReference.prototype.reload = function() {
  let record = this.value();
  if (record) {
    return record.reload();
  }

  return this.load();
};

export default RecordReference;
