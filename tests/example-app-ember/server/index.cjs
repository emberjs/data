'use strict';

// To use it create some files under `mocks/`
// e.g. `server/mocks/ember-hamsters.js`
//
// module.exports = function(app) {
//   app.get('/ember-hamsters', function(req, res) {
//     res.send('hello');
//   });
// };

module.exports = async function () {
  const express = await import('express');
  const app = express.default();

  console.log(`\n\n\t💎 mounting mock server\n\n`);
  const mocks = [require('./mocks/book.cjs')];

  // Log proxy requests
  const morgan = require('morgan');
  app.use(morgan('dev'));

  mocks.forEach((route) => route(app));

  app.listen(4701);
  console.log(`\n\n\tMock Server mounted! ⛰\n\n`);
};
