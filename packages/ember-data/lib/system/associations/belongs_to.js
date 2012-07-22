var get = Ember.get, set = Ember.set, getPath = Ember.getPath,
    none = Ember.none;

var hasAssociation = function(type, options, one) {
  options = options || {};

  var meta = { type: type, isAssociation: true, options: options, kind: 'belongsTo' };

  var assignInverse = function(record, newParent, oldParent) {
    var associationMap = get(type, 'associations'),
        possibleAssociations = associationMap.get(record.constructor),
        possible, actual;

    if (!possibleAssociations) { return; }

    for (var i = 0, l = possibleAssociations.length; i < l; i++) {
      possible = possibleAssociations[i];

      if (possible.kind === 'hasMany') {
        actual = possible;
        break;
      }
    }

    if (actual) {
      if (newParent) {
        newParent.doInverseAssignment(function(){
          get(newParent, actual.name).pushObject(record);
        });
      }
      if (oldParent) {
        oldParent.doInverseAssignment(function(){
          get(oldParent, actual.name).removeObject(record);
        });
      }
    }
  };

  return Ember.computed(function(key, value) {
    var data = get(this, 'data').belongsTo,
        store = get(this, 'store'), id;

    if (typeof type === 'string') {
      type = getPath(this, type, false) || getPath(window, type);
    }

    id = data[key];
    var currentValue = id ? store.find(type, id) : null;

    if (arguments.length === 2) {
      if (!this._performingInverseAssignment) {
        var childRecord = this;
        var newParent = value;
        var oldParent = currentValue;
        assignInverse(childRecord, newParent, oldParent);

        this.get('transaction')
           .relationshipBecameDirty(childRecord, oldParent, newParent);
      }
      if (value)
        data[key] = value.get('id');
      else
        data[key] = null;
      return value;
    }
    return currentValue;
  }).property('data').cacheable().meta(meta);
};

DS.belongsTo = function(type, options) {
  Ember.assert("The type passed to DS.belongsTo must be defined", !!type);
  return hasAssociation(type, options);
};
