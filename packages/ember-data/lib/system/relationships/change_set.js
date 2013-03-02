var get = Ember.get, set = Ember.set;

/**
  Used to manage a set of changes for a particular relationship.
 */

DS.ChangeSet = Ember.Object.extend({
  init: function() {
    this._changes = Ember.OrderedSet.create();
    this._super.apply(this, arguments);
  },

  add: function(obj) {
    this._changes.add(obj);
  },

  remove: function(obj) {
    this._changes.remove(obj);
  },

  forEach: function() {
    this._changes.forEach.apply(this._changes, arguments);
  },

  /**
    Removes pairs of changes that would cancel each other out.
   */
  coalesce: function() {
    this.forEach(function(change, index) {
      var reverseChangeType = change.changeType === 'add' ? 'remove' : 'add',
          reverseChange;

      reverseChange = Ember.A(this._changes.list.slice(index + 1)).find(function(possibleChange) {
        return possibleChange.parentReference === change.parentReference &&
          possibleChange.childReference === change.childReference &&
          possibleChange.changeType === reverseChangeType;
      });

      if (reverseChange) {
        this.remove(change);
        this.remove(reverseChange);
      }
    }, this);
  },

  /**
    Syncs only those changes that would have a net effect on the relationship.
   */
  sync: function() {
    this.coalesce();

    this.forEach(function(change) {
      change.sync();
    });
  },

  clear: function() {
    this._changes.clear();
  }
});
