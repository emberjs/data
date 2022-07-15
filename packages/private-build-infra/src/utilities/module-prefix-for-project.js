const { dasherize } = require('ember-cli-string-utils');

module.exports = function modulePrefixForProject(project) {
  return dasherize(project.config().modulePrefix);
};
