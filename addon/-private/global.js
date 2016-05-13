/* globals global, window, self */

// originally from https://github.com/emberjs/ember.js/blob/c0bd26639f50efd6a03ee5b87035fd200e313b8e/packages/ember-environment/lib/global.js

// from lodash to catch fake globals
function checkGlobal(value) {
  return (value && value.Object === Object) ? value : undefined;
}

// element ids can ruin global miss checks
function checkElementIdShadowing(value) {
  return (value && value.nodeType === undefined) ? value : undefined;
}

// export real global
export default checkGlobal(checkElementIdShadowing(typeof global === 'object' && global)) ||
  checkGlobal(typeof self === 'object' && self) ||
  checkGlobal(typeof window === 'object' && window) ||
  new Function('return this')(); // eval outside of strict mode
