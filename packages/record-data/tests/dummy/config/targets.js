'use strict';

let browsers = ['last 1 Chrome versions', 'last 1 Firefox versions', 'last 1 Safari versions'];
const shouldTranspile = !!process.env.SHOULD_TRANSPILE;

if (shouldTranspile) {
  browsers = ['last 2 Chrome versions', 'last 2 Firefox versions', 'Safari 12', 'last 2 Edge versions'];
}

module.exports = {
  browsers,
  node: 'current',
};
