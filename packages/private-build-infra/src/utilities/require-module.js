const fs = require('node:fs');

module.exports = function requireModule(modulePath) {
  const path = require.resolve(modulePath);
  const fileContents = fs.readFileSync(path, { encoding: 'utf8' });
  let newContents;

  if (fileContents.includes('export default')) {
    newContents = fileContents.replace('export default ', 'return ');
  } else {
    newContents = fileContents.replaceAll('export const ', 'module.exports.');
    newContents = `const module = { exports: {} };\n${newContents}\nreturn module.exports;`;
  }
  try {
    const func = new Function(newContents);
    return { default: func() };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
  }
};
