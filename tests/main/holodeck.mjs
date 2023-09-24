import { createServer } from '@warp-drive/holodeck';
import { dirname } from 'node:path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

createServer({
  projectRoot: __dirname,
  port: 1136,
});
