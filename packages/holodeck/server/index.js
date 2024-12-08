/* global Bun */
import { serve } from '@hono/node-server';
import chalk from 'chalk';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http2 from 'node:http2';
import zlib from 'node:zlib';
import { homedir } from 'os';
import path from 'path';

// TODO store blobs in sqlite instead of filesystem?
// TODO use headers instead of query params for test ID and request number

/** @type {import('bun-types')} */
const isBun = typeof Bun !== 'undefined';
const DEBUG = process.env.DEBUG?.includes('holodeck') || process.env.DEBUG === '*';
const CURRENT_FILE = new URL(import.meta.url).pathname;

function getCertInfo() {
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
    throw new Error('SSL certificate or key not found, you may need to run `pnpx @warp-drive/holodeck ensure-cert`');
  }

  return {
    CERT_PATH,
    KEY_PATH,
    CERT: fs.readFileSync(CERT_PATH),
    KEY: fs.readFileSync(KEY_PATH),
  };
}

const DEFAULT_PORT = 1135;
const BROTLI_OPTIONS = {
  params: {
    [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
    // brotli currently defaults to 11 but lets be explicit
    [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
  },
};
function compress(code) {
  return zlib.brotliCompressSync(code, BROTLI_OPTIONS);
}

/**
 * removes the protocol, host, and port from a url
 */
function getNiceUrl(url) {
  const urlObj = new URL(url);
  urlObj.searchParams.delete('__xTestId');
  urlObj.searchParams.delete('__xTestRequestNumber');
  return (urlObj.pathname + urlObj.searchParams.toString()).slice(1);
}

/*
{
  projectRoot: string;
  testId: string;
  url: string;
  method: string;
  body: string;
  testRequestNumber: number
}
*/
function generateFilepath(options) {
  const { body } = options;
  const bodyHash = body ? crypto.createHash('md5').update(body).digest('hex') : null;
  const cacheDir = generateFileDir(options);
  return `${cacheDir}/${bodyHash ? `${bodyHash}-` : 'res'}`;
}
function generateFileDir(options) {
  const { projectRoot, testId, url, method, testRequestNumber } = options;
  return `${projectRoot}/.mock-cache/${testId}/${method}-${testRequestNumber}-${url}`;
}

function replayRequest(context, cacheKey) {
  let meta;
  try {
    meta = fs.readFileSync(`${cacheKey}.meta.json`, 'utf-8');
  } catch (e) {
    context.header('Content-Type', 'application/vnd.api+json');
    context.status(400);
    return context.body(
      JSON.stringify({
        errors: [
          {
            status: '400',
            code: 'MOCK_NOT_FOUND',
            title: 'Mock not found',
            detail: `No mock found for ${context.req.method} ${context.req.url}. You may need to record a mock for this request.`,
          },
        ],
      })
    );
  }

  const metaJson = JSON.parse(meta);
  const bodyPath = `${cacheKey}.body.br`;

  const headers = new Headers(metaJson.headers || {});
  const bodyInit = metaJson.status !== 204 && metaJson.status < 500 ? fs.createReadStream(bodyPath) : '';
  const response = new Response(bodyInit, {
    status: metaJson.status,
    statusText: metaJson.statusText,
    headers,
  });

  if (metaJson.status > 400) {
    throw new HTTPException(metaJson.status, { res: response, message: metaJson.statusText });
  }

  return response;
}

function createTestHandler(projectRoot) {
  const TestHandler = async (context) => {
    try {
      const { req } = context;

      const testId = req.query('__xTestId');
      const testRequestNumber = req.query('__xTestRequestNumber');
      const niceUrl = getNiceUrl(req.url);

      if (!testId) {
        context.header('Content-Type', 'application/vnd.api+json');
        context.status(400);
        return context.body(
          JSON.stringify({
            errors: [
              {
                status: '400',
                code: 'MISSING_X_TEST_ID_HEADER',
                title: 'Request to the http mock server is missing the `X-Test-Id` header',
                detail:
                  "The `X-Test-Id` header is used to identify the test that is making the request to the mock server. This is used to ensure that the mock server is only used for the test that is currently running. If using @ember-data/request add import { MockServerHandler } from '@warp-drive/holodeck'; to your request handlers.",
                source: { header: 'X-Test-Id' },
              },
            ],
          })
        );
      }

      if (!testRequestNumber) {
        context.header('Content-Type', 'application/vnd.api+json');
        context.status(400);
        return context.body(
          JSON.stringify({
            errors: [
              {
                status: '400',
                code: 'MISSING_X_TEST_REQUEST_NUMBER_HEADER',
                title: 'Request to the http mock server is missing the `X-Test-Request-Number` header',
                detail:
                  "The `X-Test-Request-Number` header is used to identify the request number for the current test. This is used to ensure that the mock server response is deterministic for the test that is currently running. If using @ember-data/request add import { MockServerHandler } from '@warp-drive/holodeck'; to your request handlers.",
                source: { header: 'X-Test-Request-Number' },
              },
            ],
          })
        );
      }

      if (req.method === 'POST' || niceUrl === '__record') {
        const payload = await req.json();
        const { url, headers, method, status, statusText, body, response } = payload;
        const cacheKey = generateFilepath({
          projectRoot,
          testId,
          url,
          method,
          body: body ? JSON.stringify(body) : null,
          testRequestNumber,
        });
        // allow Content-Type to be overridden
        headers['Content-Type'] = headers['Content-Type'] || 'application/vnd.api+json';
        // We always compress and chunk the response
        headers['Content-Encoding'] = 'br';
        // we don't cache since tests will often reuse similar urls for different payload
        headers['Cache-Control'] = 'no-store';

        const cacheDir = generateFileDir({
          projectRoot,
          testId,
          url,
          method,
          testRequestNumber,
        });

        fs.mkdirSync(cacheDir, { recursive: true });
        fs.writeFileSync(
          `${cacheKey}.meta.json`,
          JSON.stringify({ url, status, statusText, headers, method, requestBody: body }, null, 2)
        );
        fs.writeFileSync(`${cacheKey}.body.br`, compress(JSON.stringify(response)));
        context.status(204);
        return context.body(null);
      } else {
        const body = await req.text();
        const cacheKey = generateFilepath({
          projectRoot,
          testId,
          url: niceUrl,
          method: req.method,
          body,
          testRequestNumber,
        });
        return replayRequest(context, cacheKey);
      }
    } catch (e) {
      if (e instanceof HTTPException) {
        throw e;
      }
      context.header('Content-Type', 'application/vnd.api+json');
      context.status(500);
      return context.body(
        JSON.stringify({
          errors: [
            {
              status: '500',
              code: 'MOCK_SERVER_ERROR',
              title: 'Mock Server Error during Request',
              detail: e.message,
            },
          ],
        })
      );
    }
  };

  return TestHandler;
}

/*
{ port?: number, projectRoot: string }
*/
export function createServer(options) {
  const app = new Hono();
  if (DEBUG) {
    app.use('*', logger());
  }
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
  app.all('*', createTestHandler(options.projectRoot));

  const { CERT, KEY } = getCertInfo();

  serve({
    fetch: app.fetch,
    createServer: (_, requestListener) => {
      try {
        return http2.createSecureServer(
          {
            key: KEY,
            cert: CERT,
          },
          requestListener
        );
      } catch (e) {
        console.log(chalk.yellow(`Failed to create secure server, falling back to http server. Error: ${e.message}`));
        return http2.createServer(requestListener);
      }
    },
    port: options.port ?? DEFAULT_PORT,
    hostname: 'localhost',
    // bun uses TLS options
    // tls: {
    //   key: Bun.file(KEY_PATH),
    //   cert: Bun.file(CERT_PATH),
    // },
  });

  console.log(
    `\tMock server running at ${chalk.magenta('https://localhost:') + chalk.yellow(options.port ?? DEFAULT_PORT)}`
  );
}

const servers = new Map();

export default {
  async launchProgram(config = {}) {
    const projectRoot = process.cwd();
    const name = await import(path.join(projectRoot, 'package.json'), { with: { type: 'json' } }).then(
      (pkg) => pkg.name
    );
    const options = { name, projectRoot, ...config };
    console.log(
      chalk.grey(
        `\n\t@${chalk.greenBright('warp-drive')}/${chalk.magentaBright(
          'holodeck'
        )} 🌅\n\t=================================\n`
      ) +
        chalk.grey(
          `\n\tHolodeck Access Granted\n\t\tprogram: ${chalk.magenta(name)}\n\t\tsettings: ${chalk.green(JSON.stringify(config).split('\n').join(' '))}\n\t\tdirectory: ${chalk.cyan(projectRoot)}\n\t\tengine: ${chalk.cyan(
            isBun ? 'bun@' + Bun.version : 'node'
          )}`
        )
    );
    console.log(chalk.grey(`\n\tStarting Subroutines (mode:${chalk.cyan(isBun ? 'bun' : 'node')})`));

    if (isBun) {
      const serverProcess = Bun.spawn(
        ['node', '--experimental-default-type=module', CURRENT_FILE, JSON.stringify(options)],
        {
          env: process.env,
          cwd: process.cwd(),
          stdout: 'inherit',
          stderr: 'inherit',
        }
      );
      servers.set(projectRoot, serverProcess);
      return;
    }

    if (servers.has(projectRoot)) {
      throw new Error(`Holodeck is already running for project '${name}' at '${projectRoot}'`);
    }

    servers.set(projectRoot, createServer(options));
  },
  async endProgram() {
    console.log(chalk.grey(`\n\tEnding Subroutines (mode:${chalk.cyan(isBun ? 'bun' : 'node')})`));
    const projectRoot = process.cwd();

    if (!servers.has(projectRoot)) {
      const name = await import(path.join(projectRoot, 'package.json'), { with: { type: 'json' } }).then(
        (pkg) => pkg.name
      );
      throw new Error(`Holodeck was not running for project '${name}' at '${projectRoot}'`);
    }

    if (isBun) {
      const serverProcess = servers.get(projectRoot);
      serverProcess.kill();
      return;
    }

    servers.get(projectRoot).close();
    servers.delete(projectRoot);
  },
};

function main() {
  const args = process.argv.slice();
  if (!isBun && args.length) {
    if (args[1] !== CURRENT_FILE) {
      return;
    }
    const options = JSON.parse(args[2]);
    createServer(options);
  }
}

main();
