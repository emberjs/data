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
    if (name === "enable-optional-features") {
      var array = [
        "<script>",
        "// injected by lib/enable-optional-features-via-url",
        "Object.defineProperty(window, 'EmberENV', {",
        "  get() {",
        "    if (typeof this._EmberENV.ENABLE_OPTIONAL_FEATURES === 'undefined') {",
        "      this._EmberENV.ENABLE_OPTIONAL_FEATURES = window.location.search.indexOf('enableoptionalfeatures') !== -1;",
        "    }",
        "    return this._EmberENV;",
        "  },",
        "  set(value) {",
        "    this._EmberENV = value;",
        "  }",
        "});",
        "</script>",
      ];

      return array.join('\n');
    }
  }
};
