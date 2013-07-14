var errorProps = ['description', 'fileName', 'lineNumber', 'message', 'name', 'number', 'stack'];

var extendError = function(superError) {
  var error = function() {
    var tmp = superError.apply(this, arguments);

    // Unfortunately errors are not enumerable in Chrome (at least), so `for prop in tmp` doesn't work.
    for (var idx = 0; idx < errorProps.length; idx++) {
      this[errorProps[idx]] = tmp[errorProps[idx]];
    }

    return this;
  };

  error.prototype = Ember.create(superError.prototype);

  error.extend = function() {
    return extendError(this);
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

DS.ValidationError = DS.Error.extend();
DS.AdapterValidationError = DS.ValidationError.extend();
