var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

var extendError = function(superError, constructor) {
  var error = function() {
    if (constructor) {
      superError.apply(this);
      constructor.apply(this, arguments);
    } else {
      var parent = superError.apply(this, arguments);

      // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
      for (var idx = 0; idx < errorProps.length; idx++) {
        this[errorProps[idx]] = parent[errorProps[idx]];
      }
    }

    return this;
  };

  error.prototype = Ember.create(superError.prototype);

  error.extend = function(constructor) {
    return extendError(this, constructor);
  };

  return error;
};

/**
  A subclass of the JavaScript Error object for use in DS.

  @class Error
  @namespace DS
  @extends Error
  @constructor
*/
DS.Error = extendError(Error);

DS.AdapterError = DS.Error.extend();
DS.TimeoutError = DS.Error.extend();
DS.AbortError = DS.Error.extend();
DS.ParserError = DS.Error.extend();
DS.NotFoundError = DS.Error.extend();
DS.UnauthorizedError = DS.Error.extend();
DS.ForbiddenError = DS.Error.extend();

DS.ValidationError = DS.Error.extend(function(errors) {
  this.errors = errors;
});
DS.AdapterValidationError = DS.ValidationError.extend();
