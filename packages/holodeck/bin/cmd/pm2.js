/* eslint-disable no-console */
/* global Bun, globalThis */
const { process } = globalThis;
import pm2 from 'pm2';

export default async function pm2Delegate(cmd, _args) {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) {
        console.log('not able to connect to pm2');
        console.error(err);
        process.exit(2);
      }

      const options = {
        script: './holodeck.mjs',
        cwd: process.cwd(),
        args: cmd === 'start' ? '-f' : '',
      };

      pm2[cmd](
        cmd === 'start' ? options : options.script,
        (err, apps) => {
          pm2.disconnect(); // Disconnects from PM2
          if (err) {
            console.log(`not able to ${cmd} pm2`);
            console.error(err);
            reject(err);
          } else {
            console.log(`pm2 ${cmd} successful`);
            resolve();
          }

        }
      );
    });
  });
}
