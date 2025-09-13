import { launch } from '@warp-drive/diagnostic/server';
import holodeck from '@warp-drive/holodeck';

await launch({
  async setup(options) {
    const port = options.port + 1;
    await holodeck.launchProgram({
      port,
    });
  },
  async cleanup() {
    await holodeck.endProgram();
  },
  entry: './dist-test/index.html',
});
