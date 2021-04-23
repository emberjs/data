'use strict';

const path = require('path');

const { has } = require('@ember/edition-utils');

module.exports = function (blueprint) {
  blueprint.filesPath = function () {
    let hasOctane = has('octane');
    if (hasOctane && process.env.EMBER_EDITION === 'classic') {
      hasOctane = false; //forcible override
    }
    let rootPath = hasOctane ? 'native-files' : 'files';
    return path.join(blueprint.root, rootPath);
  };

  return blueprint;
};
