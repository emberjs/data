;(function() {
  var global = require('ember-data/-private/global').default;
  var DS = require('ember-data').default;
  Object.defineProperty(global, 'DS', {
    get: function() {
      return DS;
    }
  });
})();
