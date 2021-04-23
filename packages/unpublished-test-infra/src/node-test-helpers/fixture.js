'use strict';

const path = require('path');

const file = require('ember-cli-blueprint-test-helpers/chai').file;

module.exports = function (directory, filePath) {
  return file(path.join(directory, '../fixtures', filePath));
};
