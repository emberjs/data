var get = Ember.get;

DS.RESTSerializer = DS.Serializer.create({
  keyForBelongsTo: function(type, name) {
    return this.keyForAttributeName(type, name) + "_id";
  },

  keyForAttributeName: function(type, name) {
    return Ember.String.decamelize(name);
  },

  addBelongsTo: function(hash, record, key, relationship) {
    var hashKey = this._keyForBelongsTo(record.constructor, key),
        id = get(record, key+'.id');

    if (!Ember.none(id)) { hash[hashKey] = id; }
  }
});
