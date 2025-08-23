import chalk from 'chalk';
import type { Context } from 'hono';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'path';

import type { LaunchState } from '../../index.ts';
import type { LaunchConfig } from '../default-setup.ts';
import { INDEX_PATHS } from '../utils/const.ts';
import { debug, info } from '../utils/debug.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function handleFetch(config: LaunchConfig, state: LaunchState, c: Context): Promise<Response> {
  const url = new URL(c.req.url);

  // handle proxy requests if they match settings.
  if (config.proxy) {
    debug(`Checking if ${c.req.url} should be proxied`);
    for (const [context, target] of Object.entries(config.proxy)) {
      if (url.pathname.startsWith(context)) {
        const finalizedTarget = target;
        const originalUrl = c.req.url;
        const originalBase = `${url.protocol}//${url.hostname}:${url.port}`;
        const newUrl = c.req.url.replace(originalBase, finalizedTarget);
        debug(`Proxying request ${originalUrl} to ${newUrl}`);

        const headers = new Headers();
        // Copy headers from Hono request
        Object.entries(c.req.header()).forEach(([key, value]) => {
          if (value) headers.set(key, value);
        });

        const originalReferrer = headers.get('referer');

        // update to make sameOrigin
        headers.set('origin', target);
        headers.set('referer', originalReferrer ? originalReferrer.replace(originalBase, target) : target);
        headers.set('host', new URL(target).host);

        const newReq = new Request(newUrl, {
          method: c.req.method,
          headers,
          body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? await c.req.blob() : undefined,
        });

        try {
          return await fetch(newReq);
        } catch (error) {
          debug(`Error occurred while proxying request: ${error instanceof Error ? error.message : String(error)}`);
          return new Response('Error occurred while proxying request', { status: 502 });
        }
      }
    }
  }

  const bId = url.searchParams.get('b') ?? null;
  const wId = url.searchParams.get('w') ?? null;
  info(`[${chalk.cyan(c.req.method)}] ${url.pathname}`);

  if (config.parallel > 1 && url.pathname === '/parallel-launcher') {
    debug(`Serving parallel launcher`);
    const launcher = path.join(__dirname, '../../../launcher.html');
    try {
      const content = await readFile(launcher, 'utf-8');
      return new Response(content, {
        headers: { 'Content-Type': 'text/html' },
      });
    } catch {
      return new Response('Launcher not found', { status: 404 });
    }
  }

  if (INDEX_PATHS.includes(url.pathname)) {
    if (bId && wId) {
      // serve test index.html
      if (!config._realEntry) {
        debug(
          `Setting real entry for browser ${bId} window ${wId} to ${config.entry} (without query params: ${config.entry.substring(0, config.entry.includes('?') ? config.entry.indexOf('?') : config.entry.length)})`
        );
        config._realEntry = path.join(
          process.cwd(),
          config.entry.includes('?') ? config.entry.substring(0, config.entry.indexOf('?')) : config.entry
        );
      }
      debug(`Serving entry ${config._realEntry} for browser ${bId} window ${wId}`);

      try {
        const content = await readFile(config._realEntry, 'utf-8');
        return new Response(content, {
          headers: { 'Content-Type': 'text/html' },
        });
      } catch {
        return new Response('Entry file not found', { status: 404 });
      }
    }
    const _bId = bId ?? state.lastBrowserId ?? state.browserId;
    const _wId = wId ?? state.lastWindowId ?? state.windowId;
    debug(`Redirecting to ${config.entry} for browser ${_bId} window ${_wId}`);
    // redirect to index.html
    return c.redirect(`/?b=${_bId}&w=${_wId}`, 302);
  } else {
    const pathParts = url.pathname.split('/');

    if (pathParts.at(-1) === '') pathParts.pop();
    if (pathParts[0] === '') pathParts.shift();

    if (pathParts[0] === 'ws') {
      debug(`WebSocket upgrade requested - this should be handled by Hono's upgradeWebSocket middleware`);
      return new Response('WebSocket Upgrade', { status: 426 });
    }

    const route = pathParts.join('/');
    if (route === 'favicon.ico' || route === 'NCC-1701-a-gold_100.svg') {
      const asset = path.join(__dirname, '../../../NCC-1701-a-gold_100.svg');

      try {
        const content = await readFile(asset);
        return new Response(content, {
          headers: { 'Content-Type': 'image/svg+xml' },
        });
      } catch {
        return new Response('Not Found', { status: 404 });
      }
    }

    // serve test assets
    debug(`Serving asset ${route} for browser ${bId} window ${wId}`);
    const assetPath = path.join(process.cwd(), config.assets, route);

    if (!existsSync(assetPath)) {
      return new Response('Not Found', { status: 404 });
    }

    try {
      const content = await readFile(assetPath);
      // Basic MIME type detection
      const ext = path.extname(assetPath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
      };

      const contentType = mimeTypes[ext] || 'application/octet-stream';

      return new Response(content, {
        headers: { 'Content-Type': contentType },
      });
    } catch {
      return new Response('Error reading file', { status: 500 });
    }
  }
}
