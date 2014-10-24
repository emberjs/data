/* jshint node: true */

var es6           = require('broccoli-es6-module-transpiler');
var concat        = require('broccoli-concat');
var uglify        = require('broccoli-uglify-js');
var es3SafeRecast = require('broccoli-es3-safe-recast');
var env           = process.env.EMBER_ENV;
var pickFiles     = require('broccoli-static-compiler');
var merge         = require('broccoli-merge-trees');
var moveFile      = require('broccoli-file-mover');
var wrap          = require('broccoli-wrap');
var jshint        = require('broccoli-jshint');
var defeatureify  = require('broccoli-defeatureify');
var version       = require('git-repo-version')(10);
var renderTemplate = require('broccoli-render-template');
var yuidoc = require('broccoli-yuidoc');
var replace = require('broccoli-string-replace');

function moveFromLibAndMainJS(packageName, vendored){
  var root = vendored ? 'bower_components/' + packageName + "/packages/" + packageName + '/lib':
    'packages/' + packageName + '/lib';
  var tree = pickFiles(root, {
    srcDir: '/',
    files: [ '**/*.js' ],
    destDir: '/' + packageName
  });
  tree = moveFile(tree, {
    srcFile: packageName + '/main.js',
    destFile: '/' + packageName + '.js'
  });
  tree = es6(tree, {moduleName: true});
  if (env === 'production'){
    tree = es3SafeRecast(tree);
  }
  return tree;
}

function minify(tree, name){
  var config = require('./config/ember-defeatureify');
  tree = defeatureify(tree, {
    debugStatements: config.options.debugStatements,
    enableStripDebug: config.stripDebug
  });
  tree = moveFile(tree, {
    srcFile: name + '.js',
    destFile: '/' + name + '.prod.js'
  });
  var uglified = moveFile(uglify(tree, {mangle: true}),{
    srcFile: name + '.prod.js',
    destFile: '/' + name + '.min.js'
  });
  return merge([uglified, tree]);
}

function testTree(libTree, packageName){
  var test = pickFiles('packages/' + packageName + '/tests', {
    srcDir: '/',
    files: [ '**/*.js' ],
    destDir: '/'
  });
  var jshinted = jshint(libTree);
  jshinted = wrap(jshinted, {
    wrapper: [ "if (!QUnit.urlParams.nojshint) {\n", "\n}"]
  });
  return merge([jshinted, test]);
}

// Moves the file to .ejs, compiles it, moves it back.
function versionStamp(tree, fileName){
  var ejsName = fileName + '.ejs';
  tree = moveFile(tree, {
    srcFile: fileName,
    destFile: '/' + ejsName
  });
  tree = renderTemplate(tree, {
    versionStamp: version
  });
  return moveFile(tree, {
    srcFile: ejsName.replace(/\.ejs$/, '.html'),
    destFile: fileName
  });
}

var emberDataFiles = moveFromLibAndMainJS('ember-data', false);
var activeModelAdapterFiles = moveFromLibAndMainJS('activemodel-adapter', false);
var emberInflectorFiles = moveFromLibAndMainJS('ember-inflector', true);
var loaderJS = pickFiles('bower_components/loader.js', {
  srcDir: '/',
  files: [ 'loader.js' ],
  destDir: '/'
});

var yuidocTree = yuidoc('packages', {
  srcDir: '/',
  destDir: 'docs',
  yuidoc: {
    "name": "The ember-data API",
    "description": "The ember-data API: a data persistence library for Ember.js",
    "version": version,
    "logo": "http://f.cl.ly/items/1A1L432s022u1O1q1V3p/ember%20logo.png",
    "url": "https://github.com/emberjs/data",
    "options": {
      "paths": [
        "packages/ember-data/lib",
        "packages/activemodel-adapter/lib",
        "packages/ember-inflector/lib"
      ],
      "exclude": "vendor",
      "outdir":   "docs/build"
    }
  }
});

var libFiles = merge([
  emberInflectorFiles,
  emberDataFiles,
  activeModelAdapterFiles
]);

var testFiles = merge([
  testTree(emberDataFiles, 'ember-data'),
  testTree(activeModelAdapterFiles, 'activemodel-adapter')
]);

var namedAMDBuild = concat(libFiles, {
  inputFiles: ['**/*.js'],
  separator: '\n',
  outputFile: '/ember-data.named-amd.js'
});

var globalBuild = concat(merge([libFiles, loaderJS]), {
  inputFiles: ['loader.js', '**/*.js'],
  separator: '\n',
  outputFile: '/ember-data.js'
});

globalBuild = wrap(globalBuild, {
  wrapper: [ "(function(global){\n", "\n global.DS = requireModule('ember-data')['default'];\n })(this);"]
});

globalBuild = versionStamp(globalBuild, 'ember-data.js');
namedAMDBuild = versionStamp(namedAMDBuild, 'ember-data.named-amd.js');

testFiles = concat(testFiles, {
  inputFiles: ['**/*.js'],
  separator: '\n',
  wrapInEval: true,
  wrapInFunction: true,
  outputFile: '/tests.js'
});

var testRunner = pickFiles('tests', {
  srcDir: '/',
  inputFiles: [ '**/*' ],
  destDir: '/'
});

var bower = pickFiles('bower_components', {
  srcDir: '/',
  inputFiles: [ '**/*' ],
  destDir: '/bower_components'
});

var configurationFiles = pickFiles('config/package_manager_files', {
  srcDir: '/',
  destDir: '/',
  inputFiles: [ '**/*' ]
});

configurationFiles = replace(configurationFiles, {
  files: [ '**/*' ],
  pattern: {
    match: /VERSION_STRING_PLACEHOLDER/g,
    replacement: version
  }
});

var trees = merge([
  testFiles,
  globalBuild,
  namedAMDBuild,
  testRunner,
  bower,
  configurationFiles
]);

if (env === 'production') {
  var minifiedAMD = minify(namedAMDBuild, 'ember-data.named-amd');
  var minifiedGlobals = minify(globalBuild, 'ember-data');
  trees = merge([
    yuidocTree,
    trees,
    minifiedAMD,
    minifiedGlobals
  ]);
}

module.exports = trees;
