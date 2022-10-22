'use strict';
const fs = require('fs');
const path = require('path');

// To use it create some files under `mocks/`
// e.g. `server/mocks/ember-hamsters.js`
//
// module.exports = function(app) {
//   app.get('/ember-hamsters', function(req, res) {
//     res.send('hello');
//   });
// };

module.exports = function (app) {
  app.use('/fixtures', (req, res) => {
    const filePath = path.join(__dirname, '../fixtures/generated' + req.url + '.br');

    fs.stat(filePath, (err) => {
      if (!err) {
        res.set({
          'Content-Type': 'application/json',
          'Transfer-Encoding': 'chunked',
          'Content-Encoding': 'br',
          'Cache-Control': 'public, max-age=604800',
        });

        fs.createReadStream(filePath).pipe(res);
        return;
      }

      return res.status(404).end();
    });
  });
};
