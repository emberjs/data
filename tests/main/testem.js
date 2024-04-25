const TestemConfig = require('@ember-data/unpublished-test-infra/src/testem/testem');

module.exports = async function () {
  const holodeck = (await import('@warp-drive/holodeck')).default;
  await holodeck.launchProgram({
    port: 7373,
  });

  process.on('beforeExit', async () => {
    await holodeck.endProgram();
  });

  return TestemConfig;
};
