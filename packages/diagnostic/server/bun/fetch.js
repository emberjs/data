/* eslint-disable n/no-unsupported-features/node-builtins */
import chalk from 'chalk';
import path from 'path';

import { INDEX_PATHS } from '../utils/const.js';
import { debug, info } from '../utils/debug.js';

/** @type {import('bun-types')} */

export function handleBunFetch(config, state, req, server) {
  const url = new URL(req.url);
  const protocol = url.protocol;

  if (protocol === 'ws:' || protocol === 'wss:') {
    debug(`Upgrading websocket connection`);
    server.upgrade(req);
    return;
  }

  const bId = url.searchParams.get('b') ?? null;
  const wId = url.searchParams.get('w') ?? null;
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
      if (!config._realEntry && config.entry.indexOf('?')) {
        config._realEntry = path.join(process.cwd(), config.entry.substr(0, config.entry.indexOf('?')));
      }
      debug(`Serving entry ${config._realEntry} for browser ${bId} window ${wId}`);

      const asset = Bun.file(config._realEntry);
      return new Response(asset);
    }
    const _bId = bId ?? state.lastBowserId ?? state.browserId;
    const _wId = wId ?? state.lastWindowId ?? state.windowId;
    debug(`Redirecting to ${config.entry} for browser ${_bId} window ${_wId}`);
    // redirect to index.html
    return Response.redirect(`/?b=${_bId}&w=${_wId}`, { status: 302 });
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
    if (route === 'favicon.ico' || route === 'NCC-1701-a-gold_100.svg') {
      const dir = import.meta.dir;
      const asset = path.join(dir, '../NCC-1701-a-gold_100.svg');

      return new Response(Bun.file(asset));
    }

    // serve test assets
    debug(`Serving asset ${route} for browser ${bId} window ${wId}`);
    const asset = Bun.file(path.join(process.cwd(), config.assets, route));

    return asset.exists().then((exists) => {
      if (!exists) {
        return new Response('Not Found', { status: 404 });
      }
      return new Response(asset);
    });
  }
}
