'use strict';

var replace = require('broccoli-replace');
var pickFiles = require('broccoli-static-compiler');
var merge = require('broccoli-merge-trees');

module.exports = function(tree){
  var features = require('../config/features');
  var core = pickFiles(tree, {
    srcDir: '/',
    destDir: '/',
    files: ['**/*/core.js']
  });
  var replaced = replace(tree, {
    files: ['**/*.js'],
    patterns: [{
      match: /EMBER_DATA_FEATURES_PLACEHOLDER/g,
      replacement:  JSON.stringify(features, null, 2)
    }]
  });
  return merge([tree, replaced], {overwrite: true});
};

