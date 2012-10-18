require("ember-data/system/error");

var get = Ember.get, set = Ember.set, forEach = Ember.EnumerableUtils.forEach;

DS.Errors = Ember.Object.extend(Ember.Enumerable, {
  errorsByType: Ember.computed(function() {
    return Ember.MapWithDefault.create({
      defaultValue: function() { return Ember.A(); }
    });
  }).cacheable(),

  all: Ember.computed(function() {
    return Ember.A();
  }).cacheable(),

  nextObject: function(index, previousObject, context) {
    return get(this, 'all').objectAt(index);
  },

  length: Ember.computed('all.length', function() {
    return get(this, 'all.length');
  }).cacheable(),

  isEmpty: Ember.computed.not('length'),

  add: function(errors) {
    var errorsByType = get(this, 'errorsByType');

    errors = Ember.makeArray(errors);

    forEach(errors, function(error) {
      errorsByType.get(error.constructor).pushObject(error);
    });

    get(this, 'all').addObjects(errors);
  },

  remove: function(errors) {
    var errorsByType = get(this, 'errorsByType');

    if (Ember.typeOf(errors) === 'string') {
      errors = this.findByAttributeName(errors);
    } else {
      errors = Ember.makeArray(errors);
    }

    forEach(errors, function(error) {
      errorsByType.get(error.constructor).removeObject(error);
    });

    get(this, 'all').removeObjects(errors);
  },

  clear: function() {
    get(this, 'errorsByType').forEach(function(type, errors) {
      errors.clear();
    });

    get(this, 'all').clear();
  },

  findByAttributeName: function(key) {
    var errorsByType = Ember.A();

    get(this, 'errorsByType').forEach(function(type, errors) {
      if (DS.ValidationError.detect(type)) {
        errorsByType.pushObjects(errors.filterProperty('attribute', key));
      }
    });

    return errorsByType;
  },

  hasErrorsOfType: function(errorType) {
    var has = false;

    get(this, 'errorsByType').forEach(function(type, errors) {
      if (errorType.detect(type) && get(errors, 'length')) {
        has = true;
      }
    });

    return has;
  }
});
