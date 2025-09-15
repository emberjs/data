import path from 'path';
import { stripVTControlCharacters } from 'util';
const HOST_LOG_MESSAGE = `Serving Holodeck HTTP Mocks from`;
const WORKER_DONE_LOG_MESSAGE = `worker booted`;
const HTTPS_EXTRACT_MATCH = /https:\/\/([^:]+):(\d+)/;

async function waitForBoot(server, useWorker = false) {
  let port = null;
  let hostname = null;
  let done = false;

  for await (const chunk of server.stdout) {
    process.stdout.write(chunk);
    const txt = new TextDecoder().decode(chunk);
    if (txt.includes(HOST_LOG_MESSAGE)) {
      const urlMatch = HTTPS_EXTRACT_MATCH.exec(stripVTControlCharacters(txt));
      if (urlMatch) {
        hostname = urlMatch[1];
        port = parseInt(urlMatch[2], 10);
      }
      if (!useWorker) {
        done = true;
        break;
      }
    }
    if (useWorker && txt.includes(WORKER_DONE_LOG_MESSAGE)) {
      done = true;
      break;
    }
  }

  if (!done) {
    throw new Error('Holodeck server failed to start');
  }

  if (!port || !hostname) {
    throw new Error('Could not determine Holodeck server port');
  }

  return { port, hostname };
}

async function reprintLogs(server) {
  for await (const chunk of server.stdout) {
    process.stdout.write(chunk);

    if (server.killed) {
      break;
    }
  }
}

async function reprintErrors(server) {
  for await (const chunk of server.stderr) {
    process.stderr.write(chunk);

    if (server.killed) {
      break;
    }
  }
}

/**
 * If we are launched with bun but still want to use node,
 * this will spawn a child process to run the node server.
 *
 */
export async function launchProgram(config = {}) {
  const CURRENT_FILE = new URL(import.meta.url).pathname;
  const START_FILE = path.join(CURRENT_FILE, '../node-compat-start.js');
  const server = Bun.spawn(['node', START_FILE, JSON.stringify(config)], {
    env: Object.assign({}, process.env, { FORCE_COLOR: 1 }),
    cwd: process.cwd(),
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const { hostname, port } = await waitForBoot(server, config.useWorker);
  void reprintLogs(server);
  void reprintErrors(server);

  return {
    config: {
      location: `https://${hostname}:${port}`,
      port,
      hostname,
      protocol: 'https',
      recordingPath: `/__record`,
    },
    endProgram: () => {
      server.kill();
    },
  };
}
