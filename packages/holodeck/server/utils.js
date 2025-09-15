import crypto from 'node:crypto';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { homedir } from 'os';
import path from 'path';

export async function getCertInfo() {
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

export const DEFAULT_PORT = 1135;
export const BROTLI_OPTIONS = {
  params: {
    [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
    // brotli currently defaults to 11 but lets be explicit
    [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY,
  },
};
export function compress(code) {
  return zlib.brotliCompressSync(code, BROTLI_OPTIONS);
}

/**
 * removes the protocol, host, and port from a url
 */
export function getNiceUrl(url) {
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
export function generateFilepath(options) {
  const { body } = options;
  const bodyHash = body ? crypto.createHash('md5').update(JSON.stringify(body)).digest('hex') : null;
  const cacheDir = generateFileDir(options);
  return `${cacheDir}/${bodyHash ? bodyHash : 'res'}`;
}

/*
 Generate a human scannable file name for the test assets to be stored in,
 the `.mock-cache` directory should be checked-in to the codebase.
*/
export function generateFileDir(options) {
  const { projectRoot, testId, url, method, testRequestNumber } = options;
  const normalizedUrl = url.startsWith('/') ? url.slice(1) : url;
  // make path look nice but not be a sub-directory
  // using alternative `/`-like characters would be nice but results in odd encoding
  // on disk path
  const pathUrl = normalizedUrl.replaceAll('/', '_');
  return `${projectRoot}/.mock-cache/${testId}/${method}::${pathUrl}::${testRequestNumber}`;
}

export function createCloseHandler(cb) {
  let executed = false;

  process.on('SIGINT', () => {
    if (executed) return;
    executed = true;
    cb();
  });

  process.on('SIGTERM', () => {
    if (executed) return;
    executed = true;
    cb();
  });

  process.on('SIGQUIT', () => {
    if (executed) return;
    executed = true;
    cb();
  });

  process.on('exit', () => {
    if (executed) return;
    executed = true;
    cb();
  });

  return () => {
    if (executed) return;
    executed = true;
    cb();
  };
}
