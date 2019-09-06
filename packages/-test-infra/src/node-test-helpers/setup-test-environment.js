function enableOctane() {
  beforeEach(function() {
    process.env.EMBER_VERSION = 'OCTANE';
  });

  afterEach(function() {
    delete process.env.EMBER_VERSION;
  });
}

module.exports = {
  enableOctane,
};
