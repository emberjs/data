// The package @ember/polyfills is removed but we still need to support IE11.
// Copied from:
// https://github.com/emberjs/ember.js/blob/lts-3-28/packages/%40ember/polyfills/lib/assign.ts
if (!Object.assign) {
  Object.assign = function assign(target) {
    for (let i = 1; i < arguments.length; i++) {
      const arg = arguments[i];
      if (!arg) {
        continue;
      }

      const updates = Object.keys(arg);

      for (let i = 0; i < updates.length; i++) {
        const prop = updates[i];
        target[prop] = arg[prop];
      }
    }

    return target;
  }
}
