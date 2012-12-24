var get = Ember.get;

DS.RESTSerializer = DS.JSONSerializer.extend({
  keyForBelongsTo: function(type, name) {
    return this.keyForAttributeName(type, name) + "_id";
  },

  keyForHasOne: function(type, name) {
    return this.keyForAttributeName(type, name) + "_id";
  },

  keyForAttributeName: function(type, name) {
    return Ember.String.decamelize(name);
  },

  addBelongsTo: function(hash, record, key, relationship) {
    var id = get(record, relationship.key+'.id');

    if (!Ember.isNone(id)) { hash[key] = id; }
  }
});
