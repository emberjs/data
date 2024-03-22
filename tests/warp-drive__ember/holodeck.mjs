import { dirname } from 'node:path';
import { fileURLToPath } from 'url';

import { createServer } from '@warp-drive/holodeck';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default createServer({
  projectRoot: __dirname,
});
