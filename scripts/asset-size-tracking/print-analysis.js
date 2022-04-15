'use strict';

const fs = require('fs');
const path = require('path');

const Library = require('./src/library');

let INPUT_FILE = process.argv[2] !== '-show' ? process.argv[2] : false;
let SHOW_MODULES = process.argv[2] === '-show' || process.argv[3] === '-show';

if (!INPUT_FILE) {
  INPUT_FILE = path.resolve(__dirname, './current-data.json');
}

const data = fs.readFileSync(path.resolve(__dirname, INPUT_FILE), 'utf-8');

const library = Library.fromData(JSON.parse(data));
library.print(SHOW_MODULES);
