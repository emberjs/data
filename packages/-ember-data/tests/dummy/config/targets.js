'use strict';

const browsers = ['last 1 Chrome versions', 'last 1 Firefox versions', 'last 1 Safari versions'];
const targetIsIE11 = process.env.TESTEM_CI_LAUNCHER === 'IE';

if (targetIsIE11) {
  browsers.push('ie 11');
}

module.exports = {
  browsers,
};
