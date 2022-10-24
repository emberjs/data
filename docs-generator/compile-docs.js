const fs = require('fs');
const path = require('path');

const Y = require('yuidocjs');
const getVersion = require('git-repo-version');

function loadYuidocOptions() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, './yuidoc.json')));
}

function generateOptions() {
  const exclusions = ['.DS_Store', '.git', 'node_modules', 'vendor', 'bower_components', 'tmp', 'tests'];
  const config = loadYuidocOptions();
  config.version = getVersion({ projectPath: path.resolve('../packages/-ember-data') });
  config.options.outdir = config.options.outdir || 'docs';

  let confExclusions = config.options.exclude;
  if (confExclusions && typeof confExclusions === 'string') {
    confExclusions = confExclusions.split(',');
    confExclusions.forEach(function (e) {
      e = e.trim();
      if (e !== '' && exclusions.indexOf(e) === -1) {
        exclusions.push(e);
      }
    });
  }
  config.options.exclude = exclusions.join(',');

  return Y.Project.init(config);
}

async function main() {
  const options = generateOptions();

  const yuidocCompiler = new Y.YUIDoc(options);
  const json = yuidocCompiler.run();
  const builder = new Y.DocBuilder(options, json);

  await new Promise((resolve) => {
    builder.compile(resolve);
  });
}

main();
