import pm2 from './pm2.js';

await pm2('start', process.argv.slice(2));
