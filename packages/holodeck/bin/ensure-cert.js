#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { homedir } from 'os';
import path from 'path';

function main() {
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

    console.log('SSL certificate and key generated.');
  } else {
    console.log('SSL certificate and key found, using existing.');
  }

  console.log(`Certificate path: ${CERT_PATH}`);
  console.log(`Key path: ${KEY_PATH}`);
}

main();
