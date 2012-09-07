var get = Ember.get;

DS.RESTSerializer = DS.Serializer.create({
  keyForBelongsTo: function(type, name) {
    return this.keyForAttributeName(type, name) + "_id";
  },

  keyForAttributeName: function(type, name) {
    return Ember.String.decamelize(name);
  },

  addBelongsTo: function(hash, record, key, relationship) {
    var hashKey = this._keyForBelongsTo(record.constructor, key);

    hash[hashKey] = get(record, key+'.id');
  }
});
