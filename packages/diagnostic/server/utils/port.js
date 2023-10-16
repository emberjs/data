import { debug } from './debug.js';
import { DEFAULT_PORT, MAX_PORT_TRIES } from './const.js';

async function discoverPort(defaultPort, checkPort) {
  debug(`Discovering available port starting from default port of ${defaultPort}`);
  let port = defaultPort;

  for (let i = 0; i < MAX_PORT_TRIES; i++) {
    if (await checkPort(port)) {
      return port;
    }
    port++;
  }

  throw new Error(`Could not find an available port in the range ${defaultPort} to ${port}`);
}

export async function getPort(config, checkPort) {
  if (typeof config.port === 'number') {
    if (config.port < 0 || config.port > 65535) {
      throw new Error(`Invalid port number: ${config.port}`);
    } else if (config.port === 0) {
      debug('Port is set to 0, discovering available port');
      return await discoverPort(config.defaultPort || DEFAULT_PORT, checkPort);
    } else {
      await checkPort(config.port);
      return config.port;
    }
  } else {
    debug(`Port is not set, discovering available port`);
    return await discoverPort(config.defaultPort || DEFAULT_PORT, checkPort);
  }
}
