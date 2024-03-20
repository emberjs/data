import { serve } from '@hono/node-server';
import chalk from 'chalk';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { logger } from 'hono/logger';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http2 from 'node:http2';
import zlib from 'node:zlib';
import { homedir, userInfo } from 'os';
import path from 'path';

function getShellConfigFilePath() {
  const shell = userInfo().shell;
  switch (shell) {
    case '/bin/zsh':
      return path.join(homedir(), '.zshrc');
    case '/bin/bash':
      return path.join(homedir(), '.bashrc');
    default:
      throw Error(
        `Unable to determine configuration file for shell: ${shell}. Manual SSL Cert Setup Required for Holodeck.`
      );
  }
}

function getCertInfo() {
  let CERT_PATH = process.env.HOLODECK_SSL_CERT_PATH;
  let KEY_PATH = process.env.HOLODECK_SSL_KEY_PATH;

  if (!CERT_PATH) {
    CERT_PATH = path.join(homedir(), 'holodeck-localhost.pem');
    process.env.HOLODECK_SSL_CERT_PATH = CERT_PATH;
    execSync(`echo '\nexport HOLODECK_SSL_CERT_PATH="${CERT_PATH}"' >> ${getShellConfigFilePath()}`);
    console.log(`Added HOLODECK_SSL_CERT_PATH to ${getShellConfigFilePath()}`);
  }

  if (!KEY_PATH) {
    KEY_PATH = path.join(homedir(), 'holodeck-localhost-key.pem');
    process.env.HOLODECK_SSL_KEY_PATH = KEY_PATH;
    execSync(`echo '\nexport HOLODECK_SSL_KEY_PATH="${KEY_PATH}"' >> ${getShellConfigFilePath()}`);
    console.log(`Added HOLODECK_SSL_KEY_PATH to ${getShellConfigFilePath()}`);
  }

  if (!fs.existsSync(CERT_PATH) || !fs.existsSync(KEY_PATH)) {
    console.log('SSL certificate or key not found, generating new ones...');

    execSync(`mkcert -install`);
    execSync(`mkcert -key-file ${KEY_PATH} -cert-file ${CERT_PATH} localhost`);
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
  };

  return TestHandler;
}

/*
{ port?: number, projectRoot: string }
*/
export function createServer(options) {
  const app = new Hono();
  app.use('*', logger());
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
      return http2.createSecureServer(
        {
          key: KEY,
          cert: CERT,
        },
        requestListener
      );
    },
    port: options.port ?? DEFAULT_PORT,
    hostname: 'localhost',
  });

  console.log(
    `\tMock server running at ${chalk.magenta('https://localhost:') + chalk.yellow(options.port ?? DEFAULT_PORT)}`
  );
}
