import { createServer } from 'node:net';

import { debug } from '../utils/debug.js';

export async function checkPort(port: number): Promise<boolean> {
  debug(`Checking if port ${port} is available`);

  return new Promise((resolve) => {
    const server = createServer();

    server.listen(port, '0.0.0.0', () => {
      debug(`Port ${port} is available, releasing it for server`);
      server.close(() => {
        resolve(true);
      });
    });

    server.on('error', (err: NodeJS.ErrnoException) => {
      debug(`Port ${port} is not available: ${err.message}`);
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        server.close();
        throw err;
      }
    });
  });
}
