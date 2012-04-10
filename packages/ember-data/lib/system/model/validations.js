var get = Ember.get, fmt = Ember.String.fmt;

DS.Model.reopen({

  validate: function() {
    get(this, 'validators').forEach(function(validator) {
      validator.fn.call(this, validator.meta.key(this.constructor), get(this, validator.attribute), validator.options);
    }, this);
  },

  validators: Ember.computed(function() {
    var validators = Ember.A();

    this.constructor.eachComputedProperty(function(name, meta) {
      if (meta.isAttribute && meta.options.validate) {
        var options, validate = meta.options.validate, validator;
        for (validator in validate) {
          options = validate[validator],
          validator = DS.validators[validator];
          if (options && typeof validator === 'function') {
            validators.push({
              fn: validator,
              attribute: name,
              meta: meta,
              options: options
            });
          }
        }
      }
    });

    return validators;
  }).cacheable()
});

DS.validators = {

  presence: function(key, value, options) {
    if (Ember.empty(value)) {
      get(this, 'errors').add(key, options.message || 'empty', {value: value});
    }
  },

  length: function(key, value, options) {
    var length = value ? Ember.get(value, 'length') : null,
        message, count;

    if (options.allowNull && value === null) {
      return;
    }
    if (options.allowBlank && Ember.empty(value)) {
      return;
    }

    if (typeof options.minimum === 'number' && length < options.minimum) {
      count = options.minimum;
      message = options.tooShort || options.message || 'too_short';
    } else if (typeof options.maximum === 'number' && length > options.maximum) {
      count = options.maximum;
      message = options.tooLong || options.message || 'too_long';
    } else if (typeof options.is === 'number' && length !== options.is) {
      count = options.is;
      message = fmt(options.message || 'wrong_length', [options.is]);
    }

    if (message) {
      get(this, 'errors').add(key, message, {value: value, count: count});
    }
  },

  numericality: function(key, value, options) {
    var errors = get(this, 'errors');

    if (options.allowNull && value === null) {
      return;
    }
    if (options.allowBlank && Ember.empty(value)) {
      return;
    }

    if (isNaN(value) || isNaN(parseFloat(value))) {
      errors.add(key, options.message || 'not_a_number', {value: value});
    } else {
      if (typeof options.greaterThan === 'number' && value <= options.greaterThan) {
        errors.add(key, options.message || 'greater_than', {value: value, count: options.greaterThan});
      }
      if (typeof options.greaterThanOrEqualTo === 'number' && value < options.greaterThanOrEqualTo) {
        errors.add(key, options.message || 'greater_than_or_equal_to', {value: value, count: options.greaterThanOrEqualTo});
      }
      if (typeof options.lessThan === 'number' && value >= options.lessThan) {
        errors.add(key, options.message || 'less_than', {value: value, count: options.lessThan});
      }
      if (typeof options.lessThanOrEqualTo === 'number' && value > options.lessThanOrEqualTo) {
        errors.add(key, options.message || 'less_than_or_equal_to', {value: value, count: options.lessThanOrEqualTo});
      }
      if (typeof options.equalTo === 'number' && value !== options.equalTo) {
        errors.add(key, options.message || 'equal_to', {value: value, count: options.equalTo});
      }
      if (options.odd && value) {
        errors.add(key, options.message || 'odd', {value: value});
      } else if (options.even && value) {
        errors.add(key, options.message || 'even', {value: value});
      }
    }
  },

  format: function(key, value, options) {
    var pattern = options['with'] || options.pattern;

    if (options.allowNull && value === null) {
      return;
    }
    if (options.allowBlank && Ember.empty(value)) {
      return;
    }

    if (Ember.typeOf(value) !== 'string' || !value.match(pattern)) {
      get(this, 'errors').add(key, options.message || 'invalid', {value: value});
    }
  }
};
