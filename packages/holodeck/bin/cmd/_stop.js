import pm2 from './pm2.js';

await pm2('stop', process.argv.slice(2));
