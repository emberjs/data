function enableOctane() {
  beforeEach(function() {
    process.env.EMBER_CLI_MODULE_UNIFICATION = true;
    process.env.EMBER_VERSION = 'OCTANE';
  });

  afterEach(function() {
    delete process.env.EMBER_CLI_MODULE_UNIFICATION;
    delete process.env.EMBER_VERSION;
  });
}

module.exports = {
  enableOctane,
};
