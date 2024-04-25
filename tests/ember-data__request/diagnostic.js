import launch from '@warp-drive/diagnostic/server/default-setup.js';
import holodeck from '@warp-drive/holodeck';

await launch({
  async setup(info) {
    await holodeck.launchProgram({
      port: info.port + 1,
    });
  },
  async cleanup() {
    console.log('cleaning up');
    await holodeck.endProgram();
  },
});
