const { setEdition, clearEdition } = require('@ember/edition-utils');

function enableOctane() {
  beforeEach(function() {
    process.env.EMBER_CLI_MODULE_UNIFICATION = true;
    setEdition('octane');
  });

  afterEach(function() {
    delete process.env.EMBER_CLI_MODULE_UNIFICATION;
    clearEdition();
  });
}

module.exports = {
  enableOctane,
};
