var get = Ember.get;

DS.Model.reopenClass({
  typeForAssociation: function(name) {
    var association = get(this, 'associationsByName').get(name);
    return association && association.type;
  },

  associations: Ember.computed(function() {
    var map = Ember.Map.create();

    this.eachComputedProperty(function(name, meta) {
      if (meta.isAssociation) {
        var type = meta.type,
            typeList = map.get(type);

        if (typeof type === 'string') {
          type = get(this, type, false) || get(window, type);
          meta.type = type;
        }

        if (!typeList) {
          typeList = [];
          map.set(type, typeList);
        }

        typeList.push({ name: name, kind: meta.kind });
      }
    });

    return map;
  }).cacheable(),

  associationsByName: Ember.computed(function() {
    var map = Ember.Map.create(), type;

    this.eachComputedProperty(function(name, meta) {
      if (meta.isAssociation) {
        meta.key = name;
        type = meta.type;

        if (typeof type === 'string') {
          type = get(this, type, false) || get(window, type);
          meta.type = type;
        }

        map.set(name, meta);
      }
    });

    return map;
  }).cacheable()
});
