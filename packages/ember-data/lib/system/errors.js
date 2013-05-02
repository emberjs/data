var get = Ember.get, set = Ember.set;

DS.Errors = Ember.Object.extend(Ember.Enumerable, Ember.Evented, {
  errorsByAttributeName: Ember.computed(function() {
    return Ember.MapWithDefault.create({
      defaultValue: function() { return Ember.A(); }
    });
  }),

  content: Ember.computed(function() {
    return Ember.A();
  }),

  unknownProperty: function(name) {
    var errors = get(this, 'errorsByAttributeName').get(name);
    if (!errors.length) { return null; }
    return errors;
  },

  nextObject: function(index, previousObject, context) {
    return get(this, 'content').objectAt(index);
  },

  length: Ember.computed.alias('content.length'),
  isEmpty: Ember.computed.not('length'),

  add: function(name, messages) {
    var errorsByAttributeName = get(this, 'errorsByAttributeName'),
        errors = errorsByAttributeName.get(name);

    messages = Ember.makeArray(messages);

    errors.addObjects(messages);
    get(this, 'content').addObjects(messages);
    this.notifyPropertyChange(name);

    if (!get(this, 'isEmpty')) {
      this.trigger('becameInvalid');
    }
  },

  remove: function(name) {
    var errorsByAttributeName = get(this, 'errorsByAttributeName'),
        errors = errorsByAttributeName.get(name);

    errorsByAttributeName.set(name, Ember.A());
    get(this, 'content').removeObjects(errors);
    this.notifyPropertyChange(name);

    if (get(this, 'isEmpty')) {
      this.trigger('becameValid');
    }
  },

  clear: function() {
    this.notifyPropertyChange('errorsByAttributeName');
    this.notifyPropertyChange('content');

    this.trigger('becameValid');
  },

  has: function(name) {
    return get(this, 'errorsByAttributeName').get(name).length > 0;
  }
});
