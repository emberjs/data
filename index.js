/* jshint node: true */
'use strict';

module.exports = {
  name: 'ember-data',

  treeForAddon: function(dir) {
    var version      = require('./lib/version');
    var merge        = require('broccoli-merge-trees');

    return this._super.treeForAddon.call(this, merge([version(), dir]));
  }
};
