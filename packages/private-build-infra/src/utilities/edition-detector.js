'use strict';

const path = require('path');

const { has } = require('@ember/edition-utils');

module.exports = function(blueprint) {
  blueprint.filesPath = function() {
    let rootPath = has('octane') ? 'native-files' : 'files';
    return path.join(blueprint.root, rootPath);
  };

  return blueprint;
};
