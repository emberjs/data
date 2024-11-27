// Re-exporting the blueprints from the top level `ember-data` package
// because blueprint discovery in ember-cli (as of 3.12) is only done
// for top level packages.
module.exports = require('@ember-data/adapter/blueprints/adapter-test/index');
