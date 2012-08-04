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

DS.Model.reopen({
  eachAssociation: function(callback, binding) {
    get(this.constructor, 'associationsByName').forEach(function(name, association) {
      callback.call(binding, name, association);
    });
  }
});

DS.inverseNameFor = function(record, inverseModelType, inverseAssociationKind) {
  var associationMap = get(record.constructor, 'associations'),
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

DS.OneToManyLink = function(options) {
  this.oldParent = options.oldParent;
  this.child = options.child;
  this.belongsToName = options.belongsToName;
};

DS.OneToManyLink.create = function(options) {
  return new DS.RelationshipLink(options);
};

// This method returns a OneToManyLink for a given child and
// parent object. It is used by `ManyArray` to retrieve a link
// from the child if one already exists.
//
// This makes the child record the canonical store of any
// OneToManyLink objects.
DS.OneToManyLink.forChildAndParent = function(child, parent) {
  var key = DS.inverseNameFor(this.child, parent.constructor, 'belongsTo'),
      link = child._relationshipLinks[key];

  if (!link) {
    link = DS.OneToManyLink.create({
      belongsToName: name,
      child: child
    });

    child._relationshipLinks[key] = link;
  }

  return link;
};

DS.OneToManyLink.prototype = {
  destroy: function() {
    this.child.destroyChildLink(this.belongsToName);

    if (this.oldParent) {
      this.oldParent.destroyParentLink(this.hasManyName, this.child);
    }

    if (this.newParent) {
      this.newParent.destroyParentLink(this.hasManyName, this.child);
    }
  },

  sync: function() {
    var oldParent = this.oldParent,
        newParent = this.newParent,
        child = this.child;

    var hasManyName = this.getHasManyName(),
        belongsToName = this.getBelongsToName();

    if (oldParent === undefined) {
      oldParent = this.oldParent = child.get(belongsToName);
    }

    if (oldParent === newParent) {
      this.destroy();
      return;
    }

    if (get(child, belongsToName) !== newParent) {
      set(child, belongsToName, newParent);
    }

    if (oldParent) { get(oldParent, hasManyName).removeObject(child); }
    if (newParent) { get(newParent, hasManyName).addObject(child); }
  },

  getHasManyName: function() {
    var name = this.hasManyName, parent;

    if (!name) {
      parent = this.oldParent || this.newParent,
      name = DS.inverseNameFor(parent, this.child.constructor, 'hasMany');

      this.hasManyName = name;
    }

    return name;
  },

  getBelongsToName: function() {
    var name = this.belongsToName, parent;

    if (!name) {
      parent = this.oldParent || this.newParent;
      name = DS.inverseNameFor(this.child, parent.constructor, 'belongsTo');

      this.belongsToName = name;
    }

    return name;
  }
};
