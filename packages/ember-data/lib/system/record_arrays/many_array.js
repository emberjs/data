require("ember-data/system/record_arrays/record_array");
require("ember-data/system/record_arrays/many_array_states");

var get = Ember.get, set = Ember.set;

/**
  A ManyArray is a RecordArray that represents the contents of a has-many
  association.

  The ManyArray is instantiated lazily the first time the association is
  requested.

  ### Inverses

  Often, the associations in Ember Data applications will have
  an inverse. For example, imagine the following models are
  defined:

      App.Post = DS.Model.extend({
        comments: DS.hasMany('App.Comment')
      });

      App.Comment = DS.Model.extend({
        post: DS.belongsTo('App.Post')
      });

  If you created a new instance of `App.Post` and added
  a `App.Comment` record to its `comments` has-many
  association, you would expect the comment's `post`
  property to be set to the post that contained
  the has-many.

  We call the record to which an association belongs the
  association's _owner_.
*/
DS.ManyArray = DS.RecordArray.extend({
  init: function() {
    set(this, 'stateManager', DS.ManyArrayStateManager.create({ manyArray: this }));

    return this._super();
  },

  /**
    @private

    The record to which this association belongs.

    @property {DS.Model}
  */
  owner: null,

  isDirty: Ember.computed(function() {
    return get(this, 'stateManager.currentState.isDirty');
  }).property('stateManager.currentState').cacheable(),

  isLoaded: Ember.computed(function() {
    return get(this, 'stateManager.currentState.isLoaded');
  }).property('stateManager.currentState').cacheable(),

  send: function(event, context) {
    this.get('stateManager').send(event, context);
  },

  fetch: function() {
    var clientIds = get(this, 'content'),
        store = get(this, 'store'),
        type = get(this, 'type');

    store.fetchUnloadedClientIds(type, clientIds);
  },

  // Overrides Ember.Array's replace method to implement
  replaceContent: function(index, removed, added) {
    // The record to whom this has-many association belongs
    var associationOwner = get(this, 'owner');
    var stateManager = get(this, 'stateManager');

    // Map the array of record objects into an array of  client ids.
    added = added.map(function(record) {
      Ember.assert("You can only add records of " + (get(this, 'type') && get(this, 'type').toString()) + " to this association.", !get(this, 'type') || (get(this, 'type') === record.constructor));

      var oldParent = this.assignInverse(record);

      record.get('transaction')
        .relationshipBecameDirty(record, oldParent, associationOwner);

      stateManager.send('recordWasAdded', record);

      return record.get('clientId');
    }, this);

    var store = this.store;

    var len = index+removed, record;
    for (var i = index; i < len; i++) {
      // TODO: null out inverse FK
      record = this.objectAt(i);
      var oldParent = this.removeInverse(record);

      record.get('transaction')
        .relationshipBecameDirty(record, associationOwner, null);

      stateManager.send('recordWasAdded', record);
    }

    this._super(index, removed, added);
  },

  /**
    @private
  */
  assignInverse: function(record) {
    var inverse = get(this, 'owner'),
        inverseName = this.inverseNameFor(record);

    if (inverseName) {
      var oldInverse = get(record, inverseName);
      if (oldInverse !== inverse) {
        set(record, inverseName, inverse);
      }

      return oldInverse;
    }
  },

  /**
    @private
  */
  removeInverse: function(record) {
    var inverseName = this.inverseNameFor(record);

    if (inverseName) {
      var oldInverse = get(record, inverseName);
      if (oldInverse !== null) {
        set(record, inverseName, null);
      }

      return oldInverse;
    }
  },

  /**
    @private
  */
  inverseNameFor: function(record) {
    var associationMap = get(record.constructor, 'associations'),
        inverseType = get(this, 'owner.constructor'),
        possibleAssociations = associationMap.get(inverseType),
        possible, actual, oldValue;

    if (!possibleAssociations) { return; }

    for (var i = 0, l = possibleAssociations.length; i < l; i++) {
      possible = possibleAssociations[i];

      if (possible.kind === 'belongsTo') {
        actual = possible;
        break;
      }
    }

    if (actual) { return actual.name; }
  },

  // Create a child record within the owner
  createRecord: function(hash, transaction) {
    var owner = get(this, 'owner'),
        store = get(owner, 'store'),
        type = get(this, 'type'),
        record;

    transaction = transaction || get(owner, 'transaction');

    record = store.createRecord.call(store, type, hash, transaction);
    this.pushObject(record);

    return record;
  },

  /**
    METHODS FOR USE BY INVERSE RELATIONSHIPS
    ========================================

    These methods exists so that belongsTo relationships can
    set their inverses without causing an infinite loop.

    This creates two APIs:

    * the normal enumerable API, which is used by clients
      of the `ManyArray` and triggers a change to inverse
      `belongsTo` relationships.
    * `removeFromContent` and `addToContent`, which are
      used by inverse relationships and do not trigger a
      change to `belongsTo` relationships.

    Unlike the normal `addObject` and `removeObject` APIs,
    these APIs manipulate the `content` array without
    triggering side-effects.
  */

  /** @private */
  removeFromContent: function(record) {
    var clientId = get(record, 'clientId');
    get(this, 'content').removeObject(clientId);
  },

  /** @private */
  addToContent: function(record) {
    var clientId = get(record, 'clientId');
    get(this, 'content').addObject(clientId);
  }
});
