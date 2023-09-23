import { dirname } from 'node:path';
import { fileURLToPath } from 'url';

import { createServer } from '@ember-data/mock-server';

const __dirname = dirname(fileURLToPath(import.meta.url));

createServer({
  projectRoot: __dirname,
  port: 1136,
});
