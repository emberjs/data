var pickFiles = require('broccoli-static-compiler');

module.exports = function libTree(tree) {
  return pickFiles(tree, {
    files: ['**/*/lib/**/*.{js,map}'],
    srcDir: '/',
    destDir: '/'
  });
};
