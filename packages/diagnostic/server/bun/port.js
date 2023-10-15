/* global Bun */
import { debug } from '../utils/debug';

export async function checkPort(port) {
  debug(`Checking if port ${port} is available`);
  try {
    const server = await Bun.listen({
      port,
      hostname: '0.0.0.0',
      exclusive: true,
      socket: {
        data() {
          debug(`Port ${port} received data 🙈`);
        },
      }
    });
    debug(`Port ${port} is available, releasing it for server`);
    server.stop(true);
    return true;
  } catch (e) {
    debug(`Port ${port} is not available: ${e.message}`);
    if (e.code === 'EADDRINUSE') {
      return false;
    }
    throw e;
  }
}
