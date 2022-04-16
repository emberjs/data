/**
  @module @ember-data/store
*/
import EmberArray from '@ember/array';
import MutableArray from '@ember/array/mutable';
import { assert } from '@ember/debug';
import EmberObject, { get } from '@ember/object';

import { all } from 'rsvp';

import type { RelationshipRecordData } from '@ember-data/record-data/-private/ts-interfaces/relationship-record-data';
import type { InternalModel } from '@ember-data/store/-private';
import { PromiseArray, recordDataFor } from '@ember-data/store/-private';
import ShimModelClass from '@ember-data/store/-private/system/model/shim-model-class';
import type Store from '@ember-data/store/-private/system/store';
import type { CreateRecordProperties } from '@ember-data/store/-private/system/store';
import type { DSModelSchema } from '@ember-data/store/-private/ts-interfaces/ds-model';
import type { Links, PaginationLinks } from '@ember-data/store/-private/ts-interfaces/ember-data-json-api';
import type { RecordInstance } from '@ember-data/store/-private/ts-interfaces/record-instance';
import type { Dict } from '@ember-data/store/-private/ts-interfaces/utils';

import diffArray from './diff-array';

interface MutableArrayWithObject<T, M = T> extends EmberObject, MutableArray<M> {}
const MutableArrayWithObject = EmberObject.extend(MutableArray) as unknown as new <
  T,
  M = T
>() => MutableArrayWithObject<T, M>;

export interface ManyArrayCreateArgs {
  store: Store;
  type: ShimModelClass;
  recordData: RelationshipRecordData;
  key: string;
  isPolymorphic: boolean;
  isAsync: boolean;
  _inverseIsAsync: boolean;
  internalModel: InternalModel;
  isLoaded: boolean;
}
/**
  A `ManyArray` is a `MutableArray` that represents the contents of a has-many
  relationship.

  The `ManyArray` is instantiated lazily the first time the relationship is
  requested.

  This class is not intended to be directly instantiated by consuming applications.

  ### Inverses

  Often, the relationships in Ember Data applications will have
  an inverse. For example, imagine the following models are
  defined:

  ```app/models/post.js
  import Model, { hasMany } from '@ember-data/model';

  export default class PostModel extends Model {
    @hasMany('comment') comments;
  }
  ```

  ```app/models/comment.js
  import Model, { belongsTo } from '@ember-data/model';

  export default class CommentModel extends Model {
    @belongsTo('post') post;
  }
  ```

  If you created a new instance of `Post` and added
  a `Comment` record to its `comments` has-many
  relationship, you would expect the comment's `post`
  property to be set to the post that contained
  the has-many.

  We call the record to which a relationship belongs-to the
  relationship's _owner_.

  @class ManyArray
  @public
  @extends Ember.EmberObject
  @uses Ember.MutableArray
*/
export default class ManyArray extends MutableArrayWithObject<InternalModel, RecordInstance> {
  declare isAsync: boolean;
  declare isLoaded: boolean;
  declare isPolymorphic: boolean;
  declare _isDirty: boolean;
  declare _isUpdating: boolean;
  declare _hasNotified: boolean;
  declare __hasArrayObservers: boolean;
  declare hasArrayObservers: boolean; // override the base declaration
  declare _length: number;
  declare _meta: Dict<unknown> | null;
  declare _links: Links | PaginationLinks | null;
  declare currentState: InternalModel[];
  declare recordData: RelationshipRecordData;
  declare internalModel: InternalModel;
  declare store: Store;
  declare key: string;
  declare type: DSModelSchema;

  init() {
    super.init();

    /**
    The loading state of this array

    @property {Boolean} isLoaded
    @public
    */
    this.isLoaded = this.isLoaded || false;
    this.isAsync = this.isAsync || false;

    this._length = 0;

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

    You can then access the meta data via the `meta` property:

    ```js
    let comments = await post.comments;
    let meta = comments.meta;

    // meta.page => 1
    // meta.total => 5
    ```

    @property {Object | null} meta
    @public
    */
    this._meta = this._meta || null;

    /**
     * Retrieve the links for this relationship
     *
     @property {Object | null} links
     @public
     */
    this._links = this._links || null;

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
    this.currentState = [];
    this._isUpdating = false;
    this._isDirty = false;
    /*
     * Unfortunately ArrayProxy adds it's observers lazily,
     * so in a first-render situation we may sometimes notify
     * prior to the ArrayProxy having installed it's observers
     * (which occurs during _revalidate()).
     *
     * This leads to the flush occuring on access, the flush takes
     * the hasObservers codepath which in code out of our control
     * notifies again leading to a glimmer rendering invalidation error.
     *
     * We use this flag to detect the case where we notified without
     * array observers but observers were installed prior to flush.
     *
     * We do not need to fire array observers at all in this case
     * since it will be the first-access for those observers.
     */
    this._hasNotified = false;
    // make sure we initialize to the correct state
    // since the user has already accessed
    this.retrieveLatest();
  }

  // TODO refactor away _hasArrayObservers for tests
  get _hasArrayObservers() {
    // cast necessary because hasArrayObservers is typed as a ComputedProperty<boolean> vs a boolean;
    return this.hasArrayObservers || this.__hasArrayObservers;
  }

  notify() {
    this._isDirty = true;
    if (this._hasArrayObservers && !this._hasNotified) {
      this.retrieveLatest();
    } else {
      this._hasNotified = true;
      this.notifyPropertyChange('[]');
      this.notifyPropertyChange('firstObject');
      this.notifyPropertyChange('lastObject');
    }
  }

  get length() {
    if (this._isDirty) {
      this.retrieveLatest();
    }
    // By using `get()`, the tracking system knows to pay attention to changes that occur.
    get(this, '[]');

    return this._length;
  }

  set length(value) {
    this._length = value;
  }

  get links() {
    get(this, '[]');
    if (this._isDirty) {
      this.retrieveLatest();
    }
    return this._links;
  }
  set links(v) {
    this._links = v;
  }

  get meta() {
    get(this, '[]');
    if (this._isDirty) {
      this.retrieveLatest();
    }
    return this._meta;
  }
  set meta(v) {
    this._meta = v;
  }

  objectAt(index: number): RecordInstance | undefined {
    if (this._isDirty) {
      this.retrieveLatest();
    }
    let internalModel = this.currentState[index];
    if (internalModel === undefined) {
      return;
    }

    return internalModel.getRecord();
  }

  replace(idx: number, amt: number, objects?: RecordInstance[]) {
    assert(`Cannot push mutations to the cache while updating the relationship from cache`, !this._isUpdating);
    this.store._backburner.join(() => {
      let internalModels: InternalModel[];
      if (amt > 0) {
        internalModels = this.currentState.slice(idx, idx + amt);
        this.recordData.removeFromHasMany(
          this.key,
          internalModels.map((im) => recordDataFor(im))
        );
      }
      if (objects) {
        assert(
          'The third argument to replace needs to be an array.',
          Array.isArray(objects) || EmberArray.detect(objects)
        );
        this.recordData.addToHasMany(
          this.key,
          objects.map((obj: RecordInstance) => recordDataFor(obj)),
          idx
        );
      }
      this.notify();
    });
  }

  retrieveLatest() {
    // It’s possible the parent side of the relationship may have been destroyed by this point
    if (this.isDestroyed || this.isDestroying || this._isUpdating) {
      return;
    }
    this._isDirty = false;
    this._isUpdating = true;
    let jsonApi = this.recordData.getHasMany(this.key);

    let internalModels: InternalModel[] = [];
    if (jsonApi.data) {
      for (let i = 0; i < jsonApi.data.length; i++) {
        let im = this.store._internalModelForResource(jsonApi.data[i]);
        let shouldRemove = im._isDematerializing || im.currentState.isEmpty || !im.currentState.isLoaded;

        if (!shouldRemove) {
          internalModels.push(im);
        }
      }
    }

    if (jsonApi.meta) {
      this._meta = jsonApi.meta;
    }

    if (jsonApi.links) {
      this._links = jsonApi.links;
    }

    if (this._hasArrayObservers && !this._hasNotified) {
      // diff to find changes
      let diff = diffArray(this.currentState, internalModels);
      // it's null if no change found
      if (diff.firstChangeIndex !== null) {
        // we found a change
        this.arrayContentWillChange(diff.firstChangeIndex, diff.removedCount, diff.addedCount);
        this._length = internalModels.length;
        this.currentState = internalModels;
        this.arrayContentDidChange(diff.firstChangeIndex, diff.removedCount, diff.addedCount);
      }
    } else {
      this._hasNotified = false;
      this._length = internalModels.length;
      this.currentState = internalModels;
    }

    this._isUpdating = false;
  }

  /**
    Reloads all of the records in the manyArray. If the manyArray
    holds a relationship that was originally fetched using a links url
    Ember Data will revisit the original links url to repopulate the
    relationship.

    If the manyArray holds the result of a `store.query()` reload will
    re-run the original query.

    Example

    ```javascript
    let user = store.peekRecord('user', '1')
    await login(user);

    let permissions = await user.permissions;
    await permissions.reload();
    ```

    @method reload
    @public
  */
  reload(options) {
    // TODO this is odd, we don't ask the store for anything else like this?
    return this.internalModel.reloadHasMany(this.key, options);
  }

  /**
    Saves all of the records in the `ManyArray`.

    Example

    ```javascript
    let inbox = await store.findRecord('inbox', '1');
    let messages = await inbox.messages;
    messages.forEach((message) => {
      message.isRead = true;
    });
    messages.save();
    ```

    @method save
    @public
    @return {PromiseArray} promise
  */
  save() {
    let manyArray = this;
    let promiseLabel = 'DS: ManyArray#save ' + this.type.modelName;
    let promise = all(this.invoke('save'), promiseLabel).then(
      () => manyArray,
      null,
      'DS: ManyArray#save return ManyArray'
    );

    // TODO deprecate returning a promiseArray here
    return PromiseArray.create({ promise });
  }

  /**
    Create a child record within the owner

    @method createRecord
    @public
    @param {Object} hash
    @return {Model} record
  */
  createRecord(hash: CreateRecordProperties): RecordInstance {
    const { store, type } = this;

    const record = store.createRecord(type.modelName, hash);
    this.pushObject(record);

    return record;
  }
}
