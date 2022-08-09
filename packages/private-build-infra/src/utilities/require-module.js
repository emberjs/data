const fs = require('node:fs');

module.exports = function requireModule(modulePath) {
  const path = require.resolve(modulePath);
  const fileContents = fs.readFileSync(path, { encoding: 'utf8' });
  let newContents;

  if (fileContents.includes('export default')) {
    newContents = fileContents.replace('export default ', 'return ');
  } else {
    newContents = replaceAll(fileContents, 'export const ', 'module.exports.');
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

function replaceAll(str, pattern, replacement) {
  if (str.replaceAll) {
    return str.replaceAll(pattern, replacement);
  }
  return str.replace(new RegExp(pattern, 'g'), replacement);
}
