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
let INPUT_FILE = process.argv[2] || false;
const parseModules = require('./src/parse-modules');
const getBuiltDist = require('./src/get-built-dist');

const builtAsset = getBuiltDist(INPUT_FILE);
const library = parseModules(builtAsset);
const outputPath = path.resolve(__dirname, './current-data.json');

fs.writeFileSync(outputPath, JSON.stringify(library, null, 2));
