/* eslint-env node */
module.exports = {
  name: 'enable-optional-features-via-url',

  /**
    So the ENABLE_OPTIONAL_FEATURES flag is considered correctly within the
    index.html, it needs to be set before Ember.js is loaded. Since there is
    currently no way to access the `window` object within config/environment.js
    (and hereby check if there is a query parameter present for the checkbox),
    a script is injected, before Ember.js is loaded. The script checks if there
    is no value yet for the ENABLE_OPTIONAL_FEATURES flag, and if so, it sets
    the flag to true when there is a `enableoptionalfeatures` query parameter.
   */
  contentFor: function(name) {
    if (name === "vendor-prefix") {
      var array = [
        "// injected by lib/enable-optional-features-via-url",
        "window.EmberENV = window.EmberENV || {};",
        "if (typeof window.EmberENV.ENABLE_OPTIONAL_FEATURES === 'undefined') {",
        "  window.EmberENV.ENABLE_OPTIONAL_FEATURES = window.location.search.indexOf('enableoptionalfeatures') !== -1;",
        "}"
      ];

      return array.join('\n');
    }
  }
};
