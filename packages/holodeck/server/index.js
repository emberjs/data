/* global Bun */
import chalk from 'chalk';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createSecureServer } from 'node:http2';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';
import { cors } from 'hono/cors';
import crypto from 'node:crypto';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { homedir } from 'os';
import path from 'path';

const isBun = typeof Bun !== 'undefined';
const DEBUG =
  process.env.DEBUG?.includes('wd:holodeck') || process.env.DEBUG === '*' || process.env.DEBUG?.includes('wd:*');

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
  const bodyHash = body ? crypto.createHash('md5').update(JSON.stringify(body)).digest('hex') : null;
  const cacheDir = generateFileDir(options);
  return `${cacheDir}/${bodyHash ? `${bodyHash}-` : 'res'}`;
}
function generateFileDir(options) {
  const { projectRoot, testId, url, method, testRequestNumber } = options;
  return `${projectRoot}/.mock-cache/${testId}/${method}-${testRequestNumber}-${url}`;
}

async function replayRequest(context, cacheKey) {
  let metaJson;
  try {
    if (isBun) {
      metaJson = await Bun.file(`${cacheKey}.meta.json`).json();
    } else {
      metaJson = JSON.parse(fs.readFileSync(`${cacheKey}.meta.json`, 'utf8'));
    }
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
            detail: `No meta was found for ${context.req.method} ${context.req.url}. You may need to record a mock for this request.`,
          },
        ],
      })
    );
  }

  const bodyPath = `${cacheKey}.body.br`;
  const bodyInit =
    metaJson.status !== 204 && metaJson.status < 500
      ? isBun
        ? Bun.file(bodyPath)
        : fs.createReadStream(bodyPath)
      : '';

  const headers = new Headers(metaJson.headers || {});
  // @ts-expect-error - createReadStream is supported in node
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
        const compressedResponse = compress(JSON.stringify(response));
        // allow Content-Type to be overridden
        headers['Content-Type'] = headers['Content-Type'] || 'application/vnd.api+json';
        // We always compress and chunk the response
        headers['Content-Encoding'] = 'br';
        // we don't cache since tests will often reuse similar urls for different payload
        headers['Cache-Control'] = 'no-store';
        // streaming requires Content-Length
        headers['Content-Length'] = compressedResponse.length;

        const cacheDir = generateFileDir({
          projectRoot,
          testId,
          url,
          method,
          testRequestNumber,
        });

        fs.mkdirSync(cacheDir, { recursive: true });

        if (isBun) {
          const newMetaFile = Bun.file(`${cacheKey}.meta.json`);
          await newMetaFile.write(JSON.stringify({ url, status, statusText, headers, method, requestBody: body }));
          const newBodyFile = Bun.file(`${cacheKey}.body.br`);
          await newBodyFile.write(compressedResponse);
        } else {
          fs.writeFileSync(
            `${cacheKey}.meta.json`,
            JSON.stringify({ url, status, statusText, headers, method, requestBody: body })
          );
          fs.writeFileSync(`${cacheKey}.body.br`, compressedResponse);
        }

        context.status(204);
        return context.body(null);
      } else {
        const body = req.body;
        const cacheKey = generateFilepath({
          projectRoot,
          testId,
          url: niceUrl,
          method: req.method,
          body: body ? JSON.stringify(body) : null,
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

export function startNodeServer() {
  const args = process.argv.slice();

  if (!isBun && args.length) {
    const options = JSON.parse(args[2]);
    _createServer(options);
  }
}

export function startWorker() {
  // listen for launch message
  globalThis.onmessage = async (event) => {
    const { options } = event.data;

    const { server } = await _createServer(options);

    // listen for messages
    globalThis.onmessage = (event) => {
      const message = event.data;
      if (message === 'end') {
        server.close();
        globalThis.close();
      }
    };
  };
}

/*
{ port?: number, projectRoot: string }
*/
export async function createServer(options, useBun = false) {
  if (!useBun) {
    const CURRENT_FILE = new URL(import.meta.url).pathname;
    const START_FILE = path.join(CURRENT_FILE, '../start-node.js');
    const server = Bun.spawn(['node', '--experimental-default-type=module', START_FILE, JSON.stringify(options)], {
      env: process.env,
      cwd: process.cwd(),
      stdin: 'inherit',
      stdout: 'inherit',
      stderr: 'inherit',
    });

    return {
      terminate() {
        server.kill();
        // server.unref();
      },
    };
  }

  const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });

  worker.postMessage({
    type: 'launch',
    options,
  });

  return worker;
}

async function _createServer(options) {
  const { CERT, KEY } = await getCertInfo();
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

  const server = serve({
    overrideGlobalObjects: !isBun,
    fetch: app.fetch,
    serverOptions: {
      key: KEY,
      cert: CERT,
    },
    createServer: createSecureServer,
    port: options.port ?? DEFAULT_PORT,
    hostname: options.hostname ?? 'localhost',
  });

  console.log(
    `\tMock server running at ${chalk.yellow('https://') + chalk.magenta((options.hostname ?? 'localhost') + ':') + chalk.yellow(options.port ?? DEFAULT_PORT)}`
  );

  return { app, server };
}

/** @type {Map<string, Awaited<ReturnType<typeof createServer>>>} */
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
    console.log(chalk.grey(`\n\tStarting Holodeck Subroutines (mode:${chalk.cyan(isBun ? 'bun' : 'node')})`));

    if (servers.has(projectRoot)) {
      throw new Error(`Holodeck is already running for project '${name}' at '${projectRoot}'`);
    }

    // toggle to true if Bun fixes CORS support for HTTP/2
    const project = await createServer(options, false);
    servers.set(projectRoot, project);
  },
  async endProgram() {
    console.log(chalk.grey(`\n\tEnding Holodeck Subroutines (mode:${chalk.cyan(isBun ? 'bun' : 'node')})`));
    const projectRoot = process.cwd();

    if (!servers.has(projectRoot)) {
      const name = require(path.join(projectRoot, 'package.json')).name;
      console.log(chalk.red(`\n\nHolodeck was not running for project '${name}' at '${projectRoot}'\n\n`));
      return;
    }

    const project = servers.get(projectRoot);
    servers.delete(projectRoot);
    project.terminate();
    console.log(chalk.grey(`\n\tHolodeck program ended`));
  },
};
