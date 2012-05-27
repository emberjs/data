var get = Ember.get, getPath = Ember.getPath, loc = Ember.String.loc, fmt = Ember.String.fmt;
var forEach = Ember.ArrayUtils.forEach, indexOf = Ember.ArrayUtils.indexOf;

DS.Errors = Ember.Object.extend({

  init: function() {
    this.messages = Ember.Map.create();
  },

  /**
    Get messages for attribute.

    @param {String} key the attribute name
    @return {Array} an array of error messages
  */
  unknownProperty: function(key) {
    return this.messages.get(key);
  },

  /**
    Adds message to the error messages on +attribute+. More than one error can be added to the same
    attribute.
    If no message is supplied, 'invalid' is assumed.

    @param {String} key the attribute name
    @param {String} message the error message for the attribute
    @param {Object} options interpolation options
  */
  add: function(key, message, options) {
    var messages, param, value;

    message = message || 'invalid';

    if (options) {
      message = this.generateMessage(message, options);
    }

    this.propertyWillChange('length');

    if (this.messages.has(key)) {
      messages = this.messages.get(key);
    } else {
      messages = Ember.A();
      this.messages.set(key, messages);
    }
    forEach(Ember.makeArray(message), function(message) {
      if (indexOf(messages, message) === -1) {
        messages.push(message);
      }
    });

    this.propertyDidChange('length');
  },

  /**
    Returns true if for given key the message was added

    @param {String} key the attribute name
    @param {String} message the error message for the attribute
    @return {Boolean} is the massage for key exists
  */
  added: function(key, message) {
    var messages = get(this, key);
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

    @param {String} key the attribute name
  */
  remove: function(key) {
    if (!this.messages.has(key)) { return; }

    this.propertyWillChange('length');
    this.messages.remove(key);
    this.propertyDidChange('length');
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
    Returns all the full error messages in an array.

    @type {Array} an array of full messages
  */
  fullMessages: Ember.computed(function() {
    var messages = Ember.A();

    this.forEach(function(attribute, message) {
      messages.push(this.fullMessage(attribute, message));
    }, this);

    return messages;
  }).property('length').cacheable(),

  /**
    Returns a full message for a given attribute.

    @param  {String} key the attribute name
    @param  {String} message the error message for the attribute
    @return {String} formatted error message
  */
  fullMessage: function(key, message) {
    message = loc(message);

    if (key === 'base') {
      return message;
    }

    key = loc(key);

    return fmt('%@ %@', [key, message]);
  },

  /**
    Returns a message with interpolated options.

    @param  {String} message the error message for the attribute
    @param  {Object} options interpolation options
    @return {String} interpolated error message
  */
  generateMessage: function(message, options) {
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
  }).cacheable(),

  /**
    Returns true if no errors are found, false otherwise.

    @type {Boolean}
  */
  isEmpty: Ember.computed(function() {
    return get(this, 'length') === 0;
  }).property('length').cacheable()
});
