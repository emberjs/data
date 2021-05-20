module.exports = {
  resilient: true,
  buildSandboxGlobals(defaultGlobals) {
    const additionalGlobals = {};
    try {
      const najax = require('najax'); // eslint-disable-line
      additionalGlobals.najax = najax;
    } catch (e) {
      // we only add the global if najax is installed
    }
    return Object.assign({}, defaultGlobals, additionalGlobals);
  },
};
