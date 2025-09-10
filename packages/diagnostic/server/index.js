import chalk from 'chalk';
import { homedir } from 'os';
import path from 'path';

import { handleBunFetch } from './bun/fetch.js';
import { launchBrowsers } from './bun/launch-browser.js';
import { buildHandler } from './bun/socket-handler.js';
import { debug, error, print } from './utils/debug.js';
import { getPort } from './utils/port.js';
import { addCloseHandler } from './bun/watch.js';
import { launchDefault } from './default-setup.js';

async function getCertInfo() {
  let CERT_PATH = process.env.HOLODECK_SSL_CERT_PATH;
  let KEY_PATH = process.env.HOLODECK_SSL_KEY_PATH;

  if (!CERT_PATH) {
    CERT_PATH = path.join(homedir(), 'holodeck-localhost.pem');
    process.env.HOLODECK_SSL_CERT_PATH = CERT_PATH;

    console.log(
      `HOLODECK_SSL_CERT_PATH was not found in the current environment. Setting it to default value of ${CERT_PATH}`
    );
  }

  if (!KEY_PATH) {
    KEY_PATH = path.join(homedir(), 'holodeck-localhost-key.pem');
    process.env.HOLODECK_SSL_KEY_PATH = KEY_PATH;

    console.log(
      `HOLODECK_SSL_KEY_PATH was not found in the current environment. Setting it to default value of ${KEY_PATH}`
    );
  }

  if (isBun) {
    const CERT = Bun.file(CERT_PATH);
    const KEY = Bun.file(KEY_PATH);

    if (!(await CERT.exists()) || !(await KEY.exists())) {
      throw new Error(
        'SSL certificate or key not found, you may need to run `pnpm dlx @warp-drive/holodeck ensure-cert`'
      );
    }

    return {
      CERT_PATH,
      KEY_PATH,
      CERT: await CERT.text(),
      KEY: await KEY.text(),
    };
  } else {
    if (!fs.existsSync(CERT_PATH) || !fs.existsSync(KEY_PATH)) {
      throw new Error(
        'SSL certificate or key not found, you may need to run `pnpm dlx @warp-drive/holodeck ensure-cert`'
      );
    }

    return {
      CERT_PATH,
      KEY_PATH,
      CERT: fs.readFileSync(CERT_PATH, 'utf8'),
      KEY: fs.readFileSync(KEY_PATH, 'utf8'),
    };
  }
}

/** @type {import('bun-types')} */
const isBun = typeof Bun !== 'undefined';

export async function launch(settings) {
  const config = launchDefault(settings);
  if (isBun) {
    debug(`Bun detected, using Bun.serve()`);

    const { checkPort } = await import('./bun/port.js');
    const hostname = config.hostname ?? 'localhost';
    const protocol = config.protocol ?? 'https';
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
      closeHandlers: [],
    };
    async function runCloseHandler(handler) {
      try {
        await handler();
      } catch (e) {
        error(`Error in close handler: ${e?.message ?? e}`);
      }
    }
    state.safeCleanup = async () => {
      debug(`Running close handlers`);
      const promises = [];
      for (const handler of state.closeHandlers) {
        promises.push(runCloseHandler(handler));
      }
      await Promise.allSettled(promises);
      debug(`All close handlers completed`);
    };

    if (protocol === 'https') {
      if (!config.key && !config.cert) {
        const info = await getCertInfo();
        config.key = info.KEY_PATH;
        config.cert = info.CERT_PATH;
        serveOptions.tls = {
          key: info.KEY,
          cert: info.CERT,
        };
      } else {
        serveOptions.tls = {
          key: Bun.file(config.key),
          cert: Bun.file(config.cert),
        };
      }

      if (!config.key) throw new Error(`Missing key for https protocol`);
      if (!config.cert) throw new Error(`Missing cert for https protocol`);
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

      addCloseHandler(state, () => {
        state.browsers?.forEach((browser) => {
          browser.proc.kill();
          // browser.proc.unref();
        });
        state.server.stop();
        // state.server.unref();
      });

      config.reporter.serverConfig = {
        port,
        hostname,
        protocol,
        url: `${protocol}://${hostname}:${port}`,
      };

      if (config.setup) {
        print(
          chalk.magenta(`Preparing Server on ${chalk.white(protocol + '://' + hostname + ':')}${chalk.magenta(port)}`)
        );

        debug(`Running configured setup hook`);

        await config.setup({
          port,
          hostname,
          protocol,
        });
        debug(`Configured setup hook completed`);
      }
      if (config.cleanup) {
        addCloseHandler(state, async () => {
          debug(`Running configured cleanup hook`);
          await config.cleanup();
          debug(`Configured cleanup hook completed`);
        });
      }

      print(
        chalk.magenta(
          `🚀 Serving Diagnostic Tests on ${chalk.white(protocol + '://' + hostname + ':')}${chalk.yellow(port)}\n`
        )
      );

      if (!config.noLaunch) {
        await launchBrowsers(config, state);
      }
    } catch (e) {
      error(`Error: ${e?.message ?? e}`);
      await state.safeCleanup();
      throw e;
    }
  } else {
    throw new Error(`Diagnostic is not supported in this environment.`);
  }
}
