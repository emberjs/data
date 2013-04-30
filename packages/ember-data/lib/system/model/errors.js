var get = Ember.get;

DS.Errors = Ember.Object.extend(Ember.Enumerable, {

  /**
    Get messages for attribute.

    @param {String} attribute the attribute name
    @return {Array} an array of error messages
  */
  unknownProperty: function(attribute) {
    return this.messages.get(attribute);
  },

  /**
    Adds message to the error messages on +attribute+. More than one error can be added to the same
    attribute.
    If no message is supplied, 'invalid' is assumed.

    @param {String} attribute the attribute name
    @param {String} message the error message for the attribute
    @param {Object} options interpolation options
  */
  add: function(attribute, message, options) {
    var messages, param, value;

    message = this.generateMessage(message, attribute, options);

    this.propertyWillChange('length');
    this.propertyWillChange(attribute);

    if (this.messages.has(attribute)) {
      messages = this.messages.get(attribute);
    } else {
      messages = Ember.A();
      this.messages.set(attribute, messages);
    }
    messages.addObjects(Ember.makeArray(message));

    this.propertyDidChange(attribute);
    this.propertyDidChange('length');
  },

  /**
    Returns true if for given attribute the message was added

    @param {String} attribute the attribute name
    @param {String} message the error message for the attribute
    @return {Boolean} is the massage for attribute exists
  */
  has: function(attribute, message) {
    var messages = get(this, attribute);
    if (messages && message) {
      return messages.contains(message);
    } else if (messages) {
      return true;
    } else {
      return false;
    }
  },

  /**
    Clear the messages.
  */
  clear: function() {
    if (get(this, 'isEmpty')) { return; }

    this.propertyWillChange('length');
    this.messages = Ember.Map.create();
    this.propertyDidChange('length');
  },

  /**
    Delete messages for attribute.

    @param {String} attribute the attribute name
  */
  remove: function(attribute) {
    if (!this.messages.has(attribute)) { return; }

    this.propertyWillChange('length');
    this.propertyWillChange(attribute);
    this.messages.remove(attribute);
    this.propertyDidChange(attribute);
    this.propertyDidChange('length');
  },

  nextObject: function(index, previousObject, context) {
    return get(this, '_messages').objectAt(index);
  },

  /**
    Iterates through each error key, value pair in the error messages map.
    Yields the attribute and the error for that attribute. If the attribute
    has more than one error message, yields once for each error message.
  */
  forEach: function(callback, context) {
    this.messages.forEach(function(attribute, messages) {
      messages.forEach(function(message) {
        callback.call(context, attribute, message);
      }, this);
    }, this);
  },

  /**
    Returns a message with interpolated options.

    @param  {String} message the error message for the attribute
    @param  {Object} options interpolation options
    @return {String} interpolated error message
  */
  generateMessage: function(message, attribute, options) {
    var param, value;

    for (param in options) {
      value = options[param];
      param = new RegExp('{'+param+'}');
      message = message.replace(param, value);
    }

    return message;
  },

  /**
    Returns the number of error messages.

    @type {Number} the number of errors on the record
  */
  length: Ember.computed(function() {
    var length = 0;
    this.messages.forEach(function(attribute, messages) {
      length += get(messages, 'length');
    });
    return length;
  }),

  /**
    Returns true if no errors are found, false otherwise.

    @type {Boolean}
  */
  isEmpty: Ember.computed('length', function() {
    return get(this, 'length') === 0;
  }),

  init: function() {
    this.messages = Ember.Map.create();
  },

  _messages: Ember.computed('length', function() {
    return this.map(function(attribute, message) {
      return message;
    }, this);
  })
});
