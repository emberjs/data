/**
  @module ember-data
*/
import Ember from 'ember';
import { assert } from '@ember/debug';
import { PromiseArray } from "./promise-proxies";
import { _objectIsAlive } from "./store/common";
import diffArray from './diff-array';

const { get } = Ember;

/**
  A `ManyArray` is a `MutableArray` that represents the contents of a has-many
  relationship.

  The `ManyArray` is instantiated lazily the first time the relationship is
  requested.

  ### Inverses

  Often, the relationships in Ember Data applications will have
  an inverse. For example, imagine the following models are
  defined:

  ```app/models/post.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    comments: DS.hasMany('comment')
  });
  ```

  ```app/models/comment.js
  import DS from 'ember-data';

  export default DS.Model.extend({
    post: DS.belongsTo('post')
  });
  ```

  If you created a new instance of `App.Post` and added
  a `App.Comment` record to its `comments` has-many
  relationship, you would expect the comment's `post`
  property to be set to the post that contained
  the has-many.

  We call the record to which a relationship belongs the
  relationship's _owner_.

  @class ManyArray
  @namespace DS
  @extends Ember.Object
  @uses Ember.MutableArray, Ember.Evented
*/
export default Ember.Object.extend(Ember.MutableArray, Ember.Evented, {
  init() {
    this._super(...arguments);

    /**
    The loading state of this array

    @property {Boolean} isLoaded
    */
    this.isLoaded = false;
    this.length = 0;

    /**
    Used for async `hasMany` arrays
    to keep track of when they will resolve.

    @property {Ember.RSVP.Promise} promise
    @private
    */
    this.promise = null;

    /**
    Metadata associated with the request for async hasMany relationships.

    Example

    Given that the server returns the following JSON payload when fetching a
    hasMany relationship:

    ```js
    {
      "comments": [{
        "id": 1,
        "comment": "This is the first comment",
      }, {
    // ...
      }],

      "meta": {
        "page": 1,
        "total": 5
      }
    }
    ```

    You can then access the metadata via the `meta` property:

    ```js
    post.get('comments').then(function(comments) {
      var meta = comments.get('meta');

    // meta.page => 1
    // meta.total => 5
    });
    ```

    @property {Object} meta
    @public
    */
    this.meta = this.meta ||  null;

    /**
    `true` if the relationship is polymorphic, `false` otherwise.

    @property {Boolean} isPolymorphic
    @private
    */
    this.isPolymorphic = this.isPolymorphic || false;

    /**
    The relationship which manages this array.

    @property {ManyRelationship} relationship
    @private
    */
    this.relationship = this.relationship || null;

    this.currentState = [];
    this.flushCanonical(false);
  },

  objectAt(index) {
    let internalModel = this.currentState[index];
    if (internalModel === undefined) { return; }

    return internalModel.getRecord();
  },

  flushCanonical(isInitialized = true) {
    // It’s possible the parent side of the relationship may have been unloaded by this point
    if (!_objectIsAlive(this)) {
      return;
    }
    let toSet = this.canonicalState;

    //a hack for not removing new records
    //TODO remove once we have proper diffing
    let newInternalModels = this.currentState.filter(
      // only add new internalModels which are not yet in the canonical state of this
      // relationship (a new internalModel can be in the canonical state if it has
      // been 'acknowleged' to be in the relationship via a store.push)
      (internalModel) => internalModel.isNew() && toSet.indexOf(internalModel) === -1
    );
    toSet = toSet.concat(newInternalModels);

    // diff to find changes
    let diff = diffArray(this.currentState, toSet);

    if (diff.firstChangeIndex !== null) { // it's null if no change found
      // we found a change
      this.arrayContentWillChange(diff.firstChangeIndex, diff.removedCount, diff.addedCount);
      this.set('length', toSet.length);
      this.currentState = toSet;
      this.arrayContentDidChange(diff.firstChangeIndex, diff.removedCount, diff.addedCount);
      if (isInitialized && diff.addedCount > 0) {
        //notify only on additions
        //TODO only notify if unloaded
        this.relationship.notifyHasManyChanged();
      }
    }
  },

  internalReplace(idx, amt, objects) {
    if (!objects) {
      objects = [];
    }
    this.arrayContentWillChange(idx, amt, objects.length);
    this.currentState.splice.apply(this.currentState, [idx, amt].concat(objects));
    this.set('length', this.currentState.length);
    this.arrayContentDidChange(idx, amt, objects.length);
  },

  //TODO(Igor) optimize
  _removeInternalModels(internalModels) {
    for (let i=0; i < internalModels.length; i++) {
      let index = this.currentState.indexOf(internalModels[i]);
      this.internalReplace(index, 1);
    }
  },

  //TODO(Igor) optimize
  _addInternalModels(internalModels, idx) {
    if (idx === undefined) {
      idx = this.currentState.length;
    }
    this.internalReplace(idx, 0, internalModels);
  },

  replace(idx, amt, objects) {
    let internalModels;
    if (amt > 0) {
      internalModels = this.currentState.slice(idx, idx+amt);
      this.get('relationship').removeInternalModels(internalModels);
    }
    if (objects) {
      this.get('relationship').addInternalModels(objects.map(obj => obj._internalModel), idx);
    }
  },

  /**
    Reloads all of the records in the manyArray. If the manyArray
    holds a relationship that was originally fetched using a links url
    Ember Data will revisit the original links url to repopulate the
    relationship.

    If the manyArray holds the result of a `store.query()` reload will
    re-run the original query.

    Example

    ```javascript
    var user = store.peekRecord('user', 1)
    user.login().then(function() {
      user.get('permissions').then(function(permissions) {
        return permissions.reload();
      });
    });
    ```

    @method reload
    @public
  */
  reload() {
    return this.relationship.reload();
  },

  /**
    Saves all of the records in the `ManyArray`.

    Example

    ```javascript
    store.findRecord('inbox', 1).then(function(inbox) {
      inbox.get('messages').then(function(messages) {
        messages.forEach(function(message) {
          message.set('isRead', true);
        });
        messages.save()
      });
    });
    ```

    @method save
    @return {DS.PromiseArray} promise
  */
  save() {
    let manyArray = this;
    let promiseLabel = 'DS: ManyArray#save ' + get(this, 'type');
    let promise = Ember.RSVP.all(this.invoke("save"), promiseLabel).
      then(() => manyArray, null, 'DS: ManyArray#save return ManyArray');

    return PromiseArray.create({ promise });
  },

  /**
    Create a child record within the owner

    @method createRecord
    @private
    @param {Object} hash
    @return {DS.Model} record
  */
  createRecord(hash) {
    const store = get(this, 'store');
    const type = get(this, 'type');

    assert(`You cannot add '${type.modelName}' records to this polymorphic relationship.`, !get(this, 'isPolymorphic'));
    let record = store.createRecord(type.modelName, hash);
    this.pushObject(record);

    return record;
  }
});
