import chalk from 'chalk';

import { handleBunFetch } from './bun/fetch.js';
import { launchBrowsers } from './bun/launch-browser.js';
import { buildHandler } from './bun/socket-handler.js';
import { debug, error, print } from './utils/debug.js';
import { getPort } from './utils/port.js';
import { addCloseHandler } from './bun/watch.js';

/** @type {import('bun-types')} */
const isBun = typeof Bun !== 'undefined';

export default async function launch(config) {
  if (isBun) {
    debug(`Bun detected, using Bun.serve()`);

    const { checkPort } = await import('./bun/port.js');
    const hostname = config.hostname ?? 'localhost';
    const protocol = config.protocol ?? 'http';
    const port = await getPort(config, checkPort);

    const serveOptions = {
      port,
      hostname,
    };

    const state = {
      browserId: 42,
      lastBowserId: null,
      windowId: 0,
      lastWindowId: null,
      port,
      hostname,
      protocol,
      browsers: new Map(),
      completed: 0,
      expected: config.parallel ?? 1,
    };

    if (protocol === 'https') {
      if (!config.key) throw new Error(`Missing key for https protocol`);
      if (!config.cert) throw new Error(`Missing cert for https protocol`);

      serveOptions.tls = {
        key: Bun.file(config.key),
        cert: Bun.file(config.cert),
      };
    }

    try {
      state.server = Bun.serve({
        ...serveOptions,
        development: false,
        exclusive: true,
        fetch(req, server) {
          return handleBunFetch(config, state, req, server);
        },
        websocket: buildHandler(config, state),
      });
      print(chalk.magenta(`🚀 Serving on ${chalk.white(protocol + '://' + hostname + ':')}${chalk.magenta(port)}`));
      config.reporter.serverConfig = {
        port,
        hostname,
        protocol,
        url: `${protocol}://${hostname}:${port}`,
      };

      if (config.setup) {
        debug(`Running configured setup hook`);
        await config.setup({
          port,
          hostname,
          protocol,
        });
        debug(`Configured setup hook completed`);
      }

      addCloseHandler(
        async () => {
          if (config.cleanup) {
            debug(`Running configured cleanup hook`);
            await config.cleanup();
            debug(`Configured cleanup hook completed`);
          }
        },
        {
          label: 'diagnostic server',
          exit: true,
        }
      );

      await launchBrowsers(config, state);
    } catch (e) {
      error(`Error: ${e?.message ?? e}`);
      if (config.cleanup) {
        debug(`Running configured cleanup hook`);
        await config.cleanup();
        debug(`Configured cleanup hook completed`);
      }
      throw e;
    }
  } else {
    throw new Error(`Diagnostic is not supported in this environment.`);
  }
}
