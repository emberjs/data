import { launch } from '@warp-drive/diagnostic/server';
import holodeck from '@warp-drive/holodeck';

await launch({
  async setup(options) {
    const port = options.port + 1;
    const launched = await holodeck.launchProgram({
      port,
    });
    return {
      proxy: {
        '/api': launched.location,
        [launched.recordingPath]: launched.location,
      },
    };
  },
  async cleanup() {
    await holodeck.endProgram();
  },
  entry: './dist-test/index.html',
  useCors: false,
  debug: true,
});
