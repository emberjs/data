import ManyArray from "ember-data/system/record_arrays/many_array";
import {RelationshipChange} from "ember-data/system/changes";

/**
  @module ember-data
*/

var get = Ember.get, set = Ember.set;
var map = Ember.EnumerableUtils.map;

function sync(change) {
  change.sync();
}

/**
  A `ManyArray` is a `RecordArray` that represents the contents of a has-many
  relationship.

  The `ManyArray` is instantiated lazily the first time the relationship is
  requested.

  ### Inverses

  Often, the relationships in Ember Data applications will have
  an inverse. For example, imagine the following models are
  defined:

  ```javascript
  App.Post = DS.Model.extend({
    comments: DS.hasMany('comment')
  });

  App.Comment = DS.Model.extend({
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
  @extends DS.RecordArray
*/
export default Ember.ArrayProxy.extend({
  /**
    Used for async `hasMany` arrays
    to keep track of when they will resolve.

    @property {Ember.RSVP.Promise} promise
    @private
  */
  promise: null,

  isLoaded: Ember.computed('content.@each.isLoaded', function() {
    var items = this.get('content');
    var itemsLoadStatus = items.every(function(item) {
      return item.get('isLoaded');
    });

    var content = get(this, 'content');

    if (itemsLoadStatus) {
      set(content, 'isLoaded', true);
      content.trigger('didLoad');
    }

    return itemsLoadStatus;
  }),

  findAll: function() {
    var store = get(this, 'store');
    var records = get(this, 'content');

    return Ember.RSVP.Promise.all(records.map(function(unloadedRecord) {
      return store._findByRecord(unloadedRecord);
    })).then(function() {
      return records;
    });
  },

  /**
    @method fetch
    @private
  */
  fetch: function() {
    var records = get(this, 'content');
    var store = get(this, 'store');
    var owner = get(this, 'owner');

    var unloadedRecords = records.filterBy('isEmpty', true);
    store.scheduleFetchMany(unloadedRecords, owner);
  },

  objectAtContent: function(idx) {
    var store = get(this, 'store');
    var record = get(this, 'content').objectAt(idx);

    if (!record) { return; }

    return store._findByRecord(record);
  },

  addRecord: function(record) {
    this.get('content').addRecord(record);
  },

  removeRecord: function(record) {
    this.get('content').removeRecord(record);
  }
});
