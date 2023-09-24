/* eslint-disable no-console */
/* global Bun, globalThis */
const { process } = globalThis;
import pm2 from 'pm2';
import fs from 'fs';

export default async function pm2Delegate(cmd, _args) {
  const pkg = JSON.parse(fs.readFileSync('./package.json'), 'utf8');

  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) {
        console.log('not able to connect to pm2');
        console.error(err);
        process.exit(2);
      }

      const options = {
        script: './holodeck.mjs',
        name: pkg.name + '::holodeck',
        cwd: process.cwd(),
        args: cmd === 'start' ? '-f' : '',
      };

      pm2[cmd](
        cmd === 'start' ? options : options.name,
        (err, apps) => {
          pm2.disconnect(); // Disconnects from PM2
          if (err) {
            console.log(`not able to ${cmd} pm2 for ${options.name}`);
            console.error(err);
            reject(err);
          } else {
            console.log(`pm2 ${cmd} successful for ${options.name}`);
            resolve();
          }
        }
      );
    });
  });
}
