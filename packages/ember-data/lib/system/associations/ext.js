var get = Ember.get, set = Ember.set;

DS.Model.reopen({
  didDefineProperty: function(proto, key, value) {
    if (value instanceof Ember.Descriptor) {
      var meta = value.meta();

      if (meta.isAssociation && meta.kind === 'belongsTo') {
        Ember.addObserver(proto, key, null, 'belongsToDidChange');
        Ember.addBeforeObserver(proto, key, null, 'belongsToWillChange');
      }
    }
  }
});

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
  }),

  associationNames: Ember.computed(function() {
    var names = { hasMany: [], belongsTo: [] };

    this.eachComputedProperty(function(name, meta) {
      if (meta.isAssociation) {
        names[meta.kind].push(name);
      }
    });

    return names;
  }),

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
  }),

  fields: Ember.computed(function() {
    var map = Ember.Map.create(), type;

    this.eachComputedProperty(function(name, meta) {
      if (meta.isAssociation) {
        map.set(name, meta.kind);
      } else if (meta.isAttribute) {
        map.set(name, 'attribute');
      }
    });

    return map;
  })
});

DS.Model.reopen({
  eachAssociation: function(callback, binding) {
    get(this.constructor, 'associationsByName').forEach(function(name, association) {
      callback.call(binding, name, association);
    });
  }
});

DS.inverseNameFor = function(modelType, inverseModelType, inverseAssociationKind) {
  var associationMap = get(modelType, 'associations'),
      possibleAssociations = associationMap.get(inverseModelType),
      possible, actual, oldValue;

  if (!possibleAssociations) { return; }

  for (var i = 0, l = possibleAssociations.length; i < l; i++) {
    possible = possibleAssociations[i];

    if (possible.kind === inverseAssociationKind) {
      actual = possible;
      break;
    }
  }

  if (actual) { return actual.name; }
};

DS.inverseTypeFor = function(modelType, associationName) {
  var associations = get(modelType, 'associationsByName'),
      association = associations.get(associationName);

  if (association) { return association.type; }
};
