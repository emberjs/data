var get = Ember.get, isEmpty = Ember.isEmpty;

/**
@module ember-data
*/

/**
  Holds validation errors for a given record organized by attribute names.

  @class Errors
  @namespace DS
  @extends Ember.Object
  @uses Ember.Enumerable
  @uses Ember.Evented
 */
DS.Errors = Ember.Object.extend(Ember.Enumerable, Ember.Evented, {
  /**
    Register with target handler

    @method registerHandlers
    @param {Object} target
    @param {Function} becameInvalid
    @param {Function} becameValid
  */
  registerHandlers: function(target, becameInvalid, becameValid) {
    this.on('becameInvalid', target, becameInvalid);
    this.on('becameValid', target, becameValid);
  },

  /**
    @property errorsByAttributeName
    @type {Ember.MapWithDefault}
    @private
  */
  errorsByAttributeName: Ember.reduceComputed("content", {
    initialValue: function() {
      return Ember.MapWithDefault.create({
        defaultValue: function() {
          return Ember.A();
        }
      });
    },

    addedItem: function(errors, error) {
      errors.get(error.attribute).pushObject(error);

      return errors;
    },

    removedItem: function(errors, error) {
      errors.get(error.attribute).removeObject(error);

      return errors;
    }
  }),

  /**
    Returns errors for a given attribute

    @method errorsFor
    @param {String} attribute
    @returns {Array}
  */
  errorsFor: function(attribute) {
    return get(this, 'errorsByAttributeName').get(attribute);
  },

  /**
  */
  messages: Ember.computed.mapBy('content', 'message'),

  /**
    @property content
    @type {Array}
    @private
  */
  content: Ember.computed(function() {
    return Ember.A();
  }),

  /**
    @method unknownProperty
    @private
  */
  unknownProperty: function(attribute) {
    var errors = this.errorsFor(attribute);
    if (isEmpty(errors)) { return null; }
    return errors;
  },

  /**
    @method nextObject
    @private
  */
  nextObject: function(index, previousObject, context) {
    return get(this, 'content').objectAt(index);
  },

  /**
    Total number of errors.

    @property length
    @type {Number}
    @readOnly
  */
  length: Ember.computed.oneWay('content.length').readOnly(),

  /**
    @property isEmpty
    @type {Boolean}
    @readOnly
  */
  isEmpty: Ember.computed.not('length').readOnly(),

  /**
    Adds error messages to a given attribute and sends
    `becameInvalid` event to the record.

    @method add
    @param {String} attribute
    @param {Array|String} messages
  */
  add: function(attribute, messages) {
    var wasEmpty = get(this, 'isEmpty');

    messages = this._findOrCreateMessages(attribute, messages);
    get(this, 'content').addObjects(messages);

    this.notifyPropertyChange(attribute);
    this.enumerableContentDidChange();

    if (wasEmpty && !get(this, 'isEmpty')) {
      this.trigger('becameInvalid');
    }
  },

  /**
    @method _findOrCreateMessages
    @private
  */
  _findOrCreateMessages: function(attribute, messages) {
    var errors = this.errorsFor(attribute);

    return Ember.makeArray(messages).map(function(message) {
      return errors.findBy('message', message) || {
        attribute: attribute,
        message: message
      };
    });
  },

  /**
    Removes all error messages from the given attribute and sends
    `becameValid` event to the record if there no more errors left.

    @method remove
    @param {String} attribute
  */
  remove: function(attribute) {
    if (get(this, 'isEmpty')) { return; }

    var content = get(this, 'content').rejectBy('attribute', attribute);
    get(this, 'content').setObjects(content);

    this.notifyPropertyChange(attribute);
    this.enumerableContentDidChange();

    if (get(this, 'isEmpty')) {
      this.trigger('becameValid');
    }
  },

  /**
    Removes all error messages and sends `becameValid` event
    to the record.

    @method clear
  */
  clear: function() {
    if (get(this, 'isEmpty')) { return; }

    get(this, 'content').clear();
    this.enumerableContentDidChange();

    this.trigger('becameValid');
  },

  /**
    Checks if there is error messages for the given attribute.

    @method has
    @param {String} attribute
    @returns {Boolean} true if there some errors on given attribute
  */
  has: function(attribute) {
    return !isEmpty(this.errorsFor(attribute));
  }
});
