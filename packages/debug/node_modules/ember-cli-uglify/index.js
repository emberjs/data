'use strict';

module.exports = {
  name: 'ember-cli-uglify',

  included(app) {
    this._super.included.apply(this, arguments);

    const defaults = require('lodash.defaultsdeep');

    let defaultOptions = {
      enabled: app.env === 'production',
      async: true, // run uglify in parallel

      uglify: {
        compress: {
          // this is adversely affects heuristics for IIFE eval
          'negate_iife': false,
          // limit sequences because of memory issues during parsing
          sequences: 30,
        },
        mangle: {
          safari10: true
        },
        output: {
          // no difference in size and much easier to debug
          semicolons: false,
        },
      }
    };

    if (app.options.sourcemaps && !this._sourceMapsEnabled(app.options.sourcemaps)) {
      defaultOptions.uglify.sourceMap = false;
    }

    this._options = defaults(app.options['ember-cli-uglify'] || {}, defaultOptions);
  },

  _sourceMapsEnabled(options) {
    if (options.enabled === false) {
      return false;
    }

    let extensions = options.extensions || [];
    if (extensions.indexOf('js') === -1) {
      return false;
    }

    return true;
  },

  postprocessTree(type, tree) {
    if (this._options.enabled === true && type === 'all') {
      return require('broccoli-uglify-sourcemap')(tree, this._options);
    } else {
      return tree;
    }
  }
};
