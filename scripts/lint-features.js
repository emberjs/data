const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../packages/private-build-infra/config/in-progress-features.json');
const beginsWithDS = /^ds-/;
const violations = [];

if (fs.existsSync(configPath)) {
  const features = require(configPath);
  Object.keys(features).forEach(function (feature) {
    if (!beginsWithDS.exec(feature)) {
      violations.push(feature);
    }
  });
}

if (violations.length) {
  console.log(
    'Features in in-progress-features.json MUST begin with `ds-`! These features do not:\n\t',
    violations.join('\n\t')
  );
  process.exit(1);
} else {
  console.log('Features passed linting!');
}
