const path = require('path');

const { has } = require('@ember/edition-utils');

module.exports = {
  description: 'Generates an ember-data Transform.',
  root: __dirname,

  filesPath() {
    let hasOctane = has('octane');
    if (hasOctane && process.env.EMBER_EDITION === 'classic') {
      hasOctane = false; //forcible override
    }
    let rootPath = hasOctane ? 'native-files' : 'files';
    return path.join(__dirname, rootPath);
  },
};
