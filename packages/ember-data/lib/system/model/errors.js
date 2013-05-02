require("ember-data/system/error");

var get = Ember.get, set = Ember.set, forEach = Ember.EnumerableUtils.forEach;

DS.Errors = Ember.Object.extend(Ember.Enumerable, {
  record: null,

  errorsByType: Ember.computed(function() {
    return Ember.MapWithDefault.create({
      defaultValue: function() { return Ember.A(); }
    });
  }),

  errorsByAttributeName: Ember.computed(function() {
    return Ember.MapWithDefault.create({
      defaultValue: function() { return Ember.A(); }
    });
  }),

  errors: Ember.computed(function() {
    return Ember.A();
  }),

  unknownProperty: function(name) {
    var errors = get(this, 'errorsByAttributeName').get(name);
    if (!errors.length) { return null; }
    return errors;
  },

  nextObject: function(index, previousObject, context) {
    return get(this, 'errors').objectAt(index);
  },

  length: Ember.computed.alias('errors.length'),
  isEmpty: Ember.computed.not('length'),

  add: function(errors) {
    var errorsByType = get(this, 'errorsByType'),
        errorsByAttributeName = get(this, 'errorsByAttributeName');

    errors = Ember.makeArray(errors);

    forEach(errors, function(error) {
      var type = error.constructor,
          attributeName = get(error, 'attributeName');

      errorsByType.get(type).addObject(error);
      if (DS.ValidationError.detect(type)) {
        errorsByAttributeName.get(attributeName).addObject(error);
        this.notifyPropertyChange(attributeName);
      }
    }, this);

    get(this, 'errors').addObjects(errors);
  },

  remove: function(errors) {
    var errorsByType = get(this, 'errorsByType'),
        errorsByAttributeName = get(this, 'errorsByAttributeName');

    errors = Ember.makeArray(errors);

    get(this, 'errors').removeObjects(errors);

    forEach(errors, function(error) {
      var type = error.constructor,
          attributeName = get(error, 'attributeName');

      errorsByType.get(type).removeObject(error);
      if (DS.ValidationError.detect(type)) {
        errorsByAttributeName.get(attributeName).removeObject(error);
        this.notifyPropertyChange(attributeName);
      }

      error.destroy();
    }, this);
  },

  removeFromAttribute: function(name) {
    var errors = get(this, 'errorsByAttributeName').get(name);
    this.remove(errors);
  },

  clear: function() {
    this.notifyPropertyChange('errorsByType');
    this.notifyPropertyChange('errorsByAttributeName');
    this.notifyPropertyChange('errors');
  },

  has: function(errorType) {
    var res = 0;

    get(this, 'errorsByType').forEach(function(type, errors) {
      if (errorType.detect(type)) {
        res = res + get(errors, 'length');
      }
    });

    return res > 0;
  }
});
