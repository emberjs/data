const ESLINT = '.eslintrc.js';
const fs = require('fs');
const path = require('path');

const execa = require('execa');

const projectRoot = path.resolve(__dirname, '../');
const eslintPath = path.join(projectRoot, ESLINT);
const eslintInfo = require(eslintPath);
const tmpDir = path.join(projectRoot, 'tmp');
const tmpEslint = path.join(tmpDir, ESLINT);

function unlinkTemp() {
  if (fs.existsSync(tmpEslint)) {
    fs.unlinkSync(tmpEslint);
  }
}

// grab only the staged files
let LIST = execa.sync('git diff-index --cached --diff-filter=d --name-only HEAD', { shell: true }).stdout;

if (LIST) {
  LIST = LIST.split(/\r?\n/);
  // filter for javascript
  LIST = LIST.filter((item) => item.match(/^[^.].*\.[js|ts]$/)).join();
  if (LIST) {
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir);
      }
      //update eslint config to include qunit
      eslintInfo.extends.push('plugin:qunit/recommended');
      fs.writeFileSync(tmpEslint, `module.exports = ${JSON.stringify(eslintInfo)}`);
      // execut the linter with additional qunit rules
      execa.sync(`pnpm eslint --config ${tmpEslint} --ext=js,ts ${LIST}`, {
        stdio: 'inherit',
        shell: true,
      });
    } catch (e) {
      unlinkTemp();
      console.log(e);
      process.exit(1);
    }
  }
}
console.log(`✅ Commit passes lint.`);
unlinkTemp();
process.exit();
