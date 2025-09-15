import chalk from 'chalk';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { createSecureServer } from 'node:http2';
import { logger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';
import { cors } from 'hono/cors';
import fs from 'node:fs';
import path from 'path';
import { Worker, threadId, parentPort } from 'node:worker_threads';
import {
  compress,
  createCloseHandler,
  DEFAULT_PORT,
  generateFileDir,
  generateFilepath,
  getCertInfo,
  getNiceUrl,
} from './utils.js';

async function replayRequest(context, cacheKey) {
  let metaJson;
  try {
    metaJson = JSON.parse(fs.readFileSync(`${cacheKey}.meta.json`, 'utf8'));
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
            detail: `No meta was found for ${context.req.method} ${context.req.url}. The expected cacheKey was ${cacheKey}. You may need to record a mock for this request.`,
          },
        ],
      })
    );
  }

  try {
    const bodyPath = `${cacheKey}.body.br`;
    const bodyInit = metaJson.status !== 204 && metaJson.status < 500 ? fs.createReadStream(bodyPath) : '';

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
            title: 'Mock Replay Failed',
            detail: `Failed to create the response for ${context.req.method} ${context.req.url}.\n\n\n${e.message}\n${e.stack}`,
          },
        ],
      })
    );
  }
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

      if (req.method === 'POST' && niceUrl === '__record') {
        const payload = await req.json();
        const { url, headers, method, status, statusText, body, response } = payload;
        const cacheKey = generateFilepath({
          projectRoot,
          testId,
          url,
          method,
          body,
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

        fs.writeFileSync(
          `${cacheKey}.meta.json`,
          JSON.stringify({ url, status, statusText, headers, method, requestBody: body })
        );
        fs.writeFileSync(`${cacheKey}.body.br`, compressedResponse);

        context.status(201);
        return context.body(
          JSON.stringify({
            message: `Recorded ${method} ${url} for test ${testId} request #${testRequestNumber}`,
            cacheKey,
            cacheDir,
          })
        );
      } else {
        const body = req.raw.body ? await req.text() : null;
        const cacheKey = generateFilepath({
          projectRoot,
          testId,
          url: niceUrl,
          method: req.method,
          body: body ? body : null,
          testRequestNumber,
        });

        // console.log(
        //   `Replaying mock for ${req.method} ${niceUrl} (test: ${testId} request #${testRequestNumber}) from '${cacheKey}' if available`
        // );
        return replayRequest(context, cacheKey);
      }
    } catch (e) {
      if (e instanceof HTTPException) {
        console.log(`HTTPException Encountered`);
        console.error(e);
        throw e;
      }
      console.log(`500 MOCK_SERVER_ERROR Encountered`);
      console.error(e);
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

export async function startWorker() {
  let close;
  parentPort.postMessage('ready');
  // listen for launch message
  parentPort.on('message', async (event) => {
    // console.log('worker message received', event);
    if (typeof event === 'object' && event?.type === 'launch') {
      // console.log('worker launching');
      const { options } = event;
      const result = await _createServer(options);
      parentPort.postMessage({
        type: 'launched',
        protocol: 'https',
        hostname: result.location.hostname,
        port: result.location.port,
      });
      close = result.close;
    }

    if (event === 'end') {
      // console.log('worker shutting down');
      close();
    }
  });
}

/*
{ port?: number, projectRoot: string }
*/
async function createServer(options) {
  if (options.useWorker) {
    // console.log('starting holodeck worker');
    const worker = new Worker(new URL('./node-worker.js', import.meta.url));

    const started = new Promise((resolve) => {
      worker.on('message', (v) => {
        // console.log('worker message received', v);
        if (v === 'ready') {
          worker.postMessage({
            type: 'launch',
            options,
          });
        } else if (v.type === 'launched') {
          // @ts-expect-error
          worker.location = v;
          resolve(worker);
        }
      });
    });

    await started;
    console.log('\tworker booted');
    return {
      worker,
      server: {
        close() {
          worker.postMessage('end');
          worker.terminate();
        },
      },
      // @ts-expect-error
      location: worker.location,
    };
  }

  return _createServer(options);
}

async function _createServer(options) {
  const { CERT, KEY } = await getCertInfo();
  const app = new Hono();
  // app.use(logger());

  app.use(
    cors({
      origin: (origin, context) => {
        // console.log(context.req.raw.headers);
        const result = origin.startsWith('http://localhost:') || origin.startsWith('https://localhost:') ? origin : '*';
        // console.log(`CORS Origin: ${origin} => ${result}`);
        return result;
      },
      allowHeaders: ['Accept', 'Content-Type'],
      allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH'],
      exposeHeaders: ['Content-Length', 'Content-Type'],
      maxAge: 60_000,
      credentials: false,
    })
  );
  app.all('*', createTestHandler(options.projectRoot));

  const location = {
    port: options.port ?? DEFAULT_PORT,
    hostname: options.hostname ?? 'localhost',
  };

  const server = serve({
    overrideGlobalObjects: true,
    fetch: app.fetch,
    serverOptions: {
      key: KEY,
      cert: CERT,
      // rejectUnauthorized: false,
      // enableTrace: true,
      // Allow HTTP/1.1 fallback for ALPN negotiation
      // allowHTTP1: true,
      // ALPNProtocols: ['h2', 'http/1.1', 'http/1.0'],
      // origins: ['*'],
    },
    createServer: createSecureServer,
    port: location.port,
    hostname: location.hostname,
  });

  console.log(
    `\tServing Holodeck HTTP Mocks from ${chalk.yellow('https://') + chalk.magenta(location.hostname + ':') + chalk.yellow(location.port)}\n`
  );

  if (typeof threadId === 'number' && threadId !== 0) {
    parentPort.postMessage({
      type: 'launched',
      protocol: 'https',
      hostname: location.hostname,
      port: location.port,
    });
  }

  if (typeof threadId === 'number' && threadId !== 0) {
    const close = createCloseHandler(() => {
      server.close();
    });

    return { app, server, location, close };
  }

  return {
    app,
    server,
    location,
  };
}

export async function launchProgram(config = {}) {
  const projectRoot = process.cwd();
  const pkg = await import(path.join(projectRoot, 'package.json'), { with: { type: 'json' } });
  const { name } = pkg.default ?? pkg;
  if (!name) {
    throw new Error(`Package name not found in package.json`);
  }
  const options = { name, projectRoot, ...config };
  console.log(
    chalk.grey(
      `\n\t@${chalk.greenBright('warp-drive')}/${chalk.magentaBright(
        'holodeck'
      )} 🌅\n\t=================================\n`
    ) +
      chalk.grey(
        `\n\tHolodeck Access Granted\n\t\tprogram: ${chalk.magenta(name)}\n\t\tsettings: ${chalk.green(
          JSON.stringify(config).split('\n').join(' ')
        )}\n\t\tdirectory: ${chalk.cyan(projectRoot)}\n\t\tengine: ${chalk.cyan(
          'node'
        )}@${chalk.yellow(process.version)}\n`
      )
  );
  console.log(chalk.grey(`\n\tStarting Holodeck Subroutines`));

  const project = await createServer(options);

  async function shutdown() {
    console.log(chalk.grey(`\n\tEnding Holodeck Subroutines`));
    project.server.close();
    console.log(chalk.grey(`\n\tHolodeck program ended`));
  }

  const endProgram = createCloseHandler(shutdown);

  return {
    config: {
      location: `https://${project.location.hostname}:${project.location.port}`,
      port: project.location.port,
      hostname: project.location.hostname,
      protocol: 'https',
      recordingPath: `/__record`,
    },
    endProgram,
  };
}
