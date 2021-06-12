'use strict';
/**
 * Analyze Ember-Data Modules
 *
 * Generates a JSON file with details of size costs of each individual module
 * and package. You should create a production build of the ember-data
 * package prior to running this script.
 *
 */
const fs = require('fs');
const path = require('path');

let INPUT_DIST = process.argv[2] || false;
let OUTPUT_FILE = process.argv[3] || './current-data.json';
const parseModules = require('./src/parse-modules');
const getBuiltDist = require('./src/get-built-dist');

const builtAsset = getBuiltDist(path.join(INPUT_DIST, 'assets/vendor.js'));
const library = parseModules(builtAsset);
const outputPath = path.resolve(__dirname, OUTPUT_FILE);

fs.writeFileSync(outputPath, JSON.stringify(library, null, 2));
