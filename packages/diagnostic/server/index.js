import chalk from 'chalk';
import { getPort } from './utils/port.js';
import { info, debug, error, print } from './utils/debug.js';
import path from 'path';

/** @type {import('bun-types')} */
/* global Bun, globalThis */
const isBun = typeof Bun !== 'undefined';

function sinceStart() {
  const time = performance.now();
  const seconds = Math.floor(time / 1000);
  const minutes = Math.floor(seconds / 60);
  const ms = Math.floor(time % 1000);

  if (minutes) {
    return `${minutes.toLocaleString('en-US')}m ${seconds % 60}s ${ms.toLocaleString('en-US')}ms`;
  }

  if (seconds) {
    return `${seconds}s ${ms.toLocaleString('en-US')}ms`;
  }

  return `${ms.toLocaleString('en-US')}ms`;
}

export default async function launch(config) {
  if (isBun) {
    let browserId = 42;
    let lastBowserId = null;
    let windowId = 0;
    let lastWindowId = null;
    debug(`Bun detected, using Bun.serve()`);
    const { checkPort } = await import('./bun/port.js');
    const hostname = config.hostname ?? 'localhost';
    const protocol = config.protocol ?? 'http';
    const port = await getPort(config, checkPort);

    const serveOptions = {
      port,
      hostname,
    };

    if (protocol === 'https') {
      if (!config.key) throw new Error(`Missing key for https protocol`);
      if (!config.cert) throw new Error(`Missing cert for https protocol`);

      serveOptions.tls = {
        key: Bun.file(config.key),
        cert: Bun.file(config.cert),
      }
    }

    const browsers = new Map();
    const INDEX_PATHS = [
      '',
      '/',
      'index.html',
    ];

    try {
      let completed = 0;
      const expected = config.parallel ?? 1;
      const server = Bun.serve({
        ...serveOptions,
        development: false,
        exclusive: true,
        fetch(req, server) {
          const url = new URL(req.url);
          const protocol = url.protocol;

          if (protocol === 'ws:' || protocol === 'wss:') {
            debug(`Upgrading websocket connection`);
            server.upgrade(req);
            return;
          }

          let bId = url.searchParams.get('b') ?? null;
          let wId = url.searchParams.get('w') ?? null;
          info(`[${chalk.cyan(req.method)}] ${url.pathname}`);


          if (config.parallel > 1 && url.pathname === '/parallel-launcher') {
            debug(`Serving parallel launcher`);
            const dir = import.meta.dir;
            const launcher = path.join(dir, 'launcher.html');
            return new Response(Bun.file(launcher));
          }

          if (INDEX_PATHS.includes(url.pathname)) {
            if (bId && wId) {
              // serve test index.html
              debug(`Serving entry ${config.entry} for browser ${bId} window ${wId}`);
              return new Response(Bun.file(config.entry));
            }
            let _bId = bId ?? lastBowserId ?? browserId;
            let _wId = wId ??lastWindowId ?? windowId;
            debug(`Redirecting to ${config.entry} for browser ${_bId} window ${_wId}`);
            // redirect to index.html
            return Response.redirect(`${protocol}://${hostname}:${port}?b=${_bId}&w=${_wId}`, { status: 302 });
          } else {
            const pathParts = url.pathname.split('/');

            if (pathParts.at(-1) === '') pathParts.pop();
            if (pathParts[0] === '') pathParts.shift();

            if (pathParts[0] === 'ws') {
              debug(`Upgrading websocket connection`);
              server.upgrade(req);
              return;
            }

            const route = pathParts.join('/');
            if (route === 'favicon.ico') {
              return new Response('Not Found', { status: 404 });
            }

            // serve test assets
            debug(`Serving asset ${route} for browser ${bId} window ${wId}`);
            return new Response(Bun.file(path.join(process.cwd(), config.assets, route)));
          }
        },
        websocket: {
          perMessageDeflate: true,
          message(ws, message) {
            const msg = JSON.parse(message);
            info(`${chalk.green('➡')} [${chalk.cyan(msg.browserId)}/${chalk.cyan(msg.windowId)}] ${chalk.green(msg.name)}`);
            if (msg.name === 'suite-finish') {
              ws.send(JSON.stringify({ name: 'close' }));
              ws.close();
              completed++;
              console.log(`${chalk.green('✅ [Complete]')} ${chalk.cyan(msg.browserId)}/${chalk.cyan(msg.windowId)} ${chalk.yellow('@' + sinceStart())}`);
              if (completed === expected) {
                console.log(`${chalk.green('✅ [All Complete]')} ${chalk.yellow('@' + sinceStart())}`);
                browsers.forEach((browser) => {
                  browser.kill();
                  browser.unref();
                });
                server.stop();
              }
            }
            // console.log(JSON.parse(message));
          }, // a message is received
          open(ws) {}, // a socket is opened
          close(ws, code, message) {}, // a socket is closed
          drain(ws) {}, // the socket is ready to receive more data
        },
      });
      print(chalk.magenta(`🚀 Serving on ${chalk.white(protocol + '://' + hostname + ':')}${chalk.magenta(port)}`));

      const launchers = Object.keys(config.launchers ?? {});
      if (launchers.length === 0) {
        throw new Error(`No launchers configured`);
      }

      const parallel = config.parallel ?? 1;
      for (const launcher of launchers) {
        if (!config.launchers[launcher].command) {
          throw new Error(`Missing command for launcher ${launcher}`);
        }

        const args = config.launchers.chrome.args ?? [];
        args.unshift(config.launchers.chrome.command);
        const bId = browserId++;

        if (parallel > 1) {
          const pages = [];
          for (let i = 0; i < parallel; i++) {
            pages.push(`?b=${bId}&w=${windowId++}`);
          }

          const launcherUrl = `${protocol}://${hostname}:${port}/parallel-launcher?p[]=${pages.join('&p[]=')}`;
          args.push(launcherUrl);
        } else {
          args.push(`${protocol}://${hostname}:${port}?b=${bId}&w=${windowId++}`);
        }

        info(`Spawning:\n\t${args.join('\n\t\t')}`);
        const browser = Bun.spawn(args, {
          env: process.env,
          cwd: process.cwd(),
          stdout: 'inherit',
          stderr: 'inherit',
        });
        browsers.set(bId, browser);
        info(`${launcher} spawned with pid ${browser.pid}`);
        print(chalk.magenta(`⚛️  Launched ${launcher}`));
      }
    } catch (e) {
      error(`Error: ${e?.message ?? e}`);
      throw e;
    }
  } else {
    throw new Error(`Holodeck is not supported in this environment.`);
  }
}
