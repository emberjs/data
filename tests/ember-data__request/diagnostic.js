import { launch } from '@warp-drive/diagnostic/server';
import holodeck from '@warp-drive/holodeck';

await launch({
  async setup(info) {
    await holodeck.launchProgram({
      port: info.port + 1,
    });
  },
  async cleanup() {
    await holodeck.endProgram();
  },
});
