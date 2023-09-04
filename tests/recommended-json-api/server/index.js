/* eslint-disable node/no-unpublished-require */
'use strict';

// To use it create some files under `mocks/`
// e.g. `server/mocks/ember-hamsters.js`
//
// module.exports = function(app) {
//   app.get('/ember-hamsters', function(req, res) {
//     res.send('hello');
//   });
// };

module.exports = function (app) {
  // eslint-disable-next-line no-console
  console.log(`\n\n\t💎 mounting mock server\n\n`);
  let mocks;
  try {
    const globSync = require('glob').sync;
    const path = require('node:path');
    mocks = globSync('./mocks/**/*.js', { cwd: __dirname }).map((p) => {
      const realPath = path.join(__dirname, p);
      return require(realPath);
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return;
  }

  // Log proxy requests
  const morgan = require('morgan');
  app.use(morgan('dev'));

  mocks.forEach((route) => route(app));
};
