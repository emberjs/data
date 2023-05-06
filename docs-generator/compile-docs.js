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

function rewritePath(filePath) {
  if (filePath.startsWith('../packages')) {
    return filePath.replace('../packages/', '../');
  }
  if (filePath.startsWith('../')) {
    return filePath.replace('../', '../../');
  }
  return filePath;
}

async function main() {
  const options = generateOptions();

  const yuidocCompiler = new Y.YUIDoc(options);
  const initialJson = yuidocCompiler.run();

  const builder = new Y.DocBuilder(options, initialJson);

  await new Promise((resolve) => {
    builder.compile(resolve);
  });

  const dataFile = path.join(__dirname, '../packages/-ember-data/dist/docs/data.json');
  const json = JSON.parse(fs.readFileSync(dataFile));

  const newFiles = {};
  Object.keys(json.files).forEach((key) => {
    const newKey = rewritePath(key);
    newFiles[newKey] = json.files[key];
    newFiles[newKey].name = newKey;
  });
  json.files = newFiles;

  Object.keys(json.classes).forEach((key) => {
    const val = json.classes[key];
    if (val.file) {
      val.file = rewritePath(val.file);
    }
  });

  Object.keys(json.modules).forEach((key) => {
    const val = json.modules[key];
    if (val.file) {
      val.file = rewritePath(val.file);
    }
  });

  fs.writeFileSync(dataFile, JSON.stringify(json, null, 2));
}

main();
