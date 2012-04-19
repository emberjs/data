var get = Ember.get, set = Ember.set, getPath = Ember.getPath,
    none = Ember.none;

var embeddedFindRecord = function(store, type, data, key, one) {
  var association = get(data, key);
  return none(association) ? undefined : store.load(type, association).id;
};

var referencedFindRecord = function(store, type, data, key, one) {
  return get(data, key);
};

var setUpEmbeddedAssociation = function(record, association) {
  if(get(association, 'parentRecord') !== record) {
    set(association, 'parentRecord', record);
    Ember.addObserver(association, 'isDirty', function() {
      if(get(this,'isDirty')) {
        var parentRecord = get(this, 'parentRecord');
        parentRecord.send('becameDirty');
      }
    });
  }
};

var hasAssociation = function(type, options, one) {
  options = options || {};

  var embedded = options.embedded,
      findRecord = embedded ? embeddedFindRecord : referencedFindRecord;

  var meta = { type: type, isAssociation: true, options: options, kind: 'belongsTo' };

  return Ember.computed(function(key, value) {
    var data = get(this, 'data'), ids, id, association,
        store = get(this, 'store');

    if (typeof type === 'string') {
      type = getPath(this, type, false) || getPath(window, type);
    }

    if (arguments.length === 2) {
      key = options.key || get(this, 'namingConvention').foreignKey(key);
      this.send('setAssociation', { key: key, value: value === null ? null : get(value, 'clientId') });
      //data.setAssociation(key, get(value, 'clientId'));
      // put the client id in `key` in the data hash
      association = value;
    } else {
      // Embedded belongsTo associations should not look for
      // a foreign key.
      if (embedded) {
        key = options.key || get(this, 'namingConvention').keyToJSONKey(key);

      // Non-embedded associations should look for a foreign key.
      // For example, instead of person, we might look for person_id
      } else {
        key = options.key || get(this, 'namingConvention').foreignKey(key);
      }
      id = findRecord(store, type, data, key, true);
      association = id ? store.find(type, id) : null;
    }

    if(embedded && association) {
      setUpEmbeddedAssociation(this, association);
    }
    return association;
  }).property('data').cacheable().meta(meta);
};

DS.belongsTo = function(type, options) {
  ember_assert("The type passed to DS.belongsTo must be defined", !!type);
  return hasAssociation(type, options);
};
