/* eslint-disable @typescript-eslint/require-await */
import type { ServerType } from '@hono/node-server';
import { serve } from '@hono/node-server';
import { createNodeWebSocket } from '@hono/node-ws';
import chalk from 'chalk';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import { createSecureServer } from 'node:http2';
import { createServer as createHttpsServer } from 'node:https';
import { homedir } from 'node:os';
import path from 'node:path';

import type { LaunchConfig } from './-private/default-setup.ts';
import { launchDefaults } from './-private/default-setup.ts';
import { handleFetch } from './-private/serve/fetch.ts';
import { launchBrowsers } from './-private/serve/launch-browser.ts';
import { buildHandler } from './-private/serve/socket-handler.ts';
import { addCloseHandler } from './-private/serve/watch.ts';
import { debug, error, loggingIsEnabled, print } from './-private/utils/debug.ts';
import { getPort } from './-private/utils/port.ts';

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

export interface LaunchState {
  browserId: number;
  lastBrowserId: number | null;
  windowId: number;
  lastWindowId: number | null;
  port: number;
  hostname: string;
  protocol: string;
  started: boolean;
  browsers: Map<
    string,
    {
      launcher: string;
      proc: ChildProcess;
    }
  >;
  completed: number;
  expected: number;
  closeHandlers: Array<() => void | Promise<void>>;
  safeCleanup: () => void | Promise<void>;
  server: ServerType;
}

export interface ServeOptions {
  port: number;
  hostname: string;
  tls?: {
    key: string;
    cert: string;
  };
}

export async function launch(config: Partial<LaunchConfig>) {
  const resolvedConfig = launchDefaults(config);

  const { checkPort } = await import('./-private/serve/port.ts');
  const hostname = resolvedConfig.hostname ?? 'localhost';
  const protocol = 'https';
  const port = await getPort(resolvedConfig, checkPort);

  const serveOptions: ServeOptions = {
    port,
    hostname,
  };

  const state = {
    browserId: 42,
    lastBrowserId: null,
    windowId: 0,
    lastWindowId: null,
    port,
    hostname,
    protocol,
    started: false,
    browsers: new Map(),
    completed: 0,
    expected: resolvedConfig.parallel ?? 1,
    closeHandlers: [],
    safeCleanup: () => void 0,
    server: null as unknown as ServerType,
  } as LaunchState;

  async function runCloseHandler(handler: () => void | Promise<void>) {
    try {
      await handler();
    } catch (e) {
      error(`Error in close handler: ${String(e instanceof Error ? e.message : e)}`);
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

  if (!resolvedConfig.key && !resolvedConfig.cert) {
    const info = await getCertInfo();
    resolvedConfig.key = info.KEY_PATH;
    resolvedConfig.cert = info.CERT_PATH;
    serveOptions.tls = {
      key: info.KEY,
      cert: info.CERT,
    };
  } else {
    serveOptions.tls = {
      key: fs.readFileSync(resolvedConfig.key!, 'utf8'),
      cert: fs.readFileSync(resolvedConfig.cert!, 'utf8'),
    };
  }

  if (!resolvedConfig.key) throw new Error(`Missing key for https protocol`);
  if (!resolvedConfig.cert) throw new Error(`Missing cert for https protocol`);

  try {
    const app = new Hono();
    if (loggingIsEnabled()) {
      app.use(logger());
    }
    if (config.useCors) {
      app.use(
        '*',
        cors({
          origin: (origin) =>
            origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:') ? origin : '*',
          allowHeaders: ['Accept', 'Content-Type'],
          allowMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'POST', 'DELETE', 'PATCH'],
          exposeHeaders: ['Content-Length', 'Content-Type'],
          maxAge: 60_000,
          credentials: false,
        })
      );
    }

    // setup Diagnostic's WebSocket channel
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });
    app.get('/ws', upgradeWebSocket(buildHandler(resolvedConfig, state)));

    // setup the static asset server and proxy
    app.all('*', (req: Context) => {
      return handleFetch(resolvedConfig, state, req);
    });

    const server = serve({
      overrideGlobalObjects: true,
      fetch: app.fetch,
      serverOptions: {
        ...serveOptions.tls,
        // Allow HTTP/1.1 fallback for ALPN negotiation
        allowHTTP1: true,
      },
      createServer: createSecureServer,
      port: port,
      hostname: hostname,
    });
    injectWebSocket(server);

    state.server = server;

    addCloseHandler(state, () => {
      debug(`Diagnostic Shutting Down`);
      state.browsers?.forEach((browser) => {
        browser.proc.kill();
      });
      state.server.close();
      debug(`Diagnostic Complete`);
    });

    resolvedConfig.reporter.serverConfig = {
      port,
      hostname,
      protocol,
      url: `${protocol}://${hostname}:${port}`,
    };

    if (resolvedConfig.setup) {
      print(
        chalk.magenta(`Preparing Server on ${chalk.white(protocol + '://' + hostname + ':')}${chalk.magenta(port)}`)
      );

      debug(`Running configured setup hook`);

      const additionalConfig = await resolvedConfig.setup({
        port,
        hostname,
        protocol,
      });
      if (additionalConfig?.proxy) {
        resolvedConfig.proxy = {
          ...resolvedConfig.proxy,
          ...additionalConfig.proxy,
        };
      }
      debug(`Configured setup hook completed`);
    }
    if (resolvedConfig.cleanup) {
      addCloseHandler(state, async () => {
        debug(`Running configured cleanup hook`);
        await resolvedConfig.cleanup();
        debug(`Configured cleanup hook completed`);
      });
    }

    print(
      chalk.magenta(
        `🚀 Serving Diagnostic Tests on ${chalk.white(protocol + '://' + hostname + ':')}${chalk.yellow(port)}`
      )
    );

    if (resolvedConfig.proxy) {
      print(chalk.white(`   Proxy Configuration:`));
      for (const [context, target] of Object.entries(resolvedConfig.proxy)) {
        print(`\t${chalk.cyan(context)} => ${chalk.green(target)}`);
      }
    }
    print('\n');

    if (!resolvedConfig.noLaunch) {
      await launchBrowsers(resolvedConfig, state);
    }
  } catch (e) {
    error(`Error: ${String(e instanceof Error ? e.message : e)}`);
    await state.safeCleanup();
    throw e;
  }
}
