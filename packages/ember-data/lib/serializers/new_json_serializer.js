var get = Ember.get, set = Ember.set;

DS.NewJSONSerializer = Ember.Object.extend({
  deserialize: function(type, data) {
    var store = get(this, 'store');

    type.eachRelationship(function(key, relationship) {
      var type = relationship.type,
          value = data[key];

      if (value == null) { return; }

      if (relationship.kind === 'belongsTo') {
        this.deserializeRecordId(data, key, type, value);
      } else if (relationship.kind === 'hasMany') {
        this.deserializeRecordIds(data, key, type, value);
      }
    }, this);

    return data;
  },

  deserializeRecordId: function(data, key, type, id) {
    if (typeof id === 'number' || typeof id === 'string') {
      data[key] = get(this, 'store').recordFor(type, id);
    }
  },

  deserializeRecordIds: function(data, key, type, ids) {
    for (var i=0, l=ids.length; i<l; i++) {
      this.deserializeRecordId(ids, i, type, ids[i]);
    }
  }
});
