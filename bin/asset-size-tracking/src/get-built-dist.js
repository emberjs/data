'use strict';
/**
 * Analyze Ember-Data Modules
 *
 * Generates a JSON file with details of size costs of each individual module
 * and package. You should crate a production build of the ember-data
 * package prior to running this script.
 *
 */
const fs = require('fs');
const path = require('path');

module.exports = function getDistFile(INPUT_FILE) {
  if (!INPUT_FILE) {
    try {
      let dirPath = path.resolve(__dirname, '../../../packages/-ember-data/dist/assets');
      let dir = fs.readdirSync(dirPath, 'utf-8');

      for (let i = 0; i < dir.length; i++) {
        let name = dir[i];
        if (name.indexOf('vendor') !== -1 && name.indexOf('.js') !== -1) {
          INPUT_FILE = path.resolve(dirPath, name);
        }
      }
    } catch (e) {
      console.log(`No vendor.js file found to process: ${e.message}`);
      process.exit(1);
    }

    if (!INPUT_FILE) {
      console.log('No vendor.js file found to process');
      process.exit(1);
    }
  }

  return fs.readFileSync(INPUT_FILE, 'utf-8');
};
