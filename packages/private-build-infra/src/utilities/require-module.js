const fs = require('node:fs');

module.exports = function requireModule(modulePath) {
  const path = require.resolve(modulePath);
  const fileContents = fs.readFileSync(path, { encoding: 'utf8' });
  const newContents = fileContents.replace('export default ', 'return ');
  try {
    const func = new Function(newContents);
    return { default: func() };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
  }
};
