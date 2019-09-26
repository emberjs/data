'use strict';

const browsers = ['last 1 Chrome versions', 'last 1 Firefox versions', 'last 1 Safari versions'];

const needsIE11 = !!process.env.TARGET_IE11;

if (needsIE11) {
  browsers.push('ie 11');
}

module.exports = {
  browsers,
};
