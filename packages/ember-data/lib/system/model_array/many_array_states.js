var get = Ember.get, set = Ember.set, guidFor = Ember.guidFor;

var Set = function() {
  this.hash = {};
  this.list = [];
};

Set.prototype = {
  add: function(item) {
    var hash = this.hash,
        guid = guidFor(item);

    if (hash.hasOwnProperty(guid)) { return; }

    hash[guid] = true;
    this.list.push(item);
  },

  remove: function(item) {
    var hash = this.hash,
        guid = guidFor(item);

    if (!hash.hasOwnProperty(guid)) { return; }

    delete hash[guid];
    var list = this.list,
        index = Ember.ArrayUtils.indexOf(this, item);

    list.splice(index, 1);
  },

  isEmpty: function() {
    return this.list.length === 0;
  }
};

var ManyArrayState = Ember.State.extend({
  /**
    If record is dirty, add it to the set of dirty records and add an observer
    to send childWasSaved when the record becomes clean.

    Returns true if the record needed to be added to the dirty set, and false
    otherwise.
   */
  recordWasAdded: function(manager, record) {
    if(!get(record, 'isDirty')) {
      return false;
    }

    var dirty = manager.dirty, observer;
    dirty.add(record);

    observer = function() {
      if (!get(record, 'isDirty')) {
        record.removeObserver('isDirty', observer);
        manager.send('childWasSaved', record);
      }
    };

    record.addObserver('isDirty', observer);
    return true;
  },

  recordWasRemoved: function(manager, record) {
    var dirty = manager.dirty, observer;
    dirty.add(record);

    observer = function() {
      record.removeObserver('isDirty', observer);
      if (!get(record, 'isDirty')) { manager.send('childWasSaved', record); }
    };

    record.addObserver('isDirty', observer);
  }
});

var states = {
  clean: ManyArrayState.create({
    isDirty: false,

    recordWasAdded: function(manager, record) {
      if(this._super(manager, record)) {
        manager.goToState('dirty');
      }
    },

    update: function(manager, clientIds) {
      var manyArray = manager.manyArray;
      set(manyArray, 'content', clientIds);
    }
  }),

  dirty: ManyArrayState.create({
    isDirty: true,

    childWasSaved: function(manager, child) {
      var dirty = manager.dirty;
      dirty.remove(child);

      if (dirty.isEmpty()) { manager.send('arrayBecameSaved'); }
    },

    arrayBecameSaved: function(manager) {
      manager.goToState('clean');
    }
  }) 
};

DS.ManyArrayStateManager = Ember.StateManager.extend({
  manyArray: null,
  initialState: 'clean',
  states: states,

  init: function() {
    this._super();
    this.dirty = new Set();
  }
});
