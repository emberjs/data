'use strict';

const { readFileSync, existsSync } = require('fs');
const path = require('path');
const Rollup = require('broccoli-rollup');
const Funnel = require('broccoli-funnel');
const MergeTrees = require('broccoli-merge-trees');
const typescript = require('broccoli-typescript-compiler').typescript;
const BroccoliDebug = require('broccoli-debug');
const WriteFile = require('broccoli-file-creator');
const StringReplace = require('broccoli-string-replace');

const VERSION_PLACEHOLDER = /VERSION_STRING_PLACEHOLDER/g;

const debugTree = BroccoliDebug.buildDebugCallback('ember-source');

module.exports.getAddonES = function getAddonES() {
  let input = new Funnel(`addon`, {
    exclude: ['node-module/**', 'loader/**', 'external-helpers/**'],
    destDir: `addon`,
  });

  let debuggedInput = debugTree(input, `get-addon-es:input`);

  let nonTypeScriptContents = new Funnel(input, {
    srcDir: 'addon',
    exclude: ['**/*.ts'],
  });

  let typescriptContents = new Funnel(input, {
    include: ['**/*.ts'],
  });

  let typescriptCompiled = typescript(debugTree(typescriptContents, `get-addon-es:ts:input`));

  let debuggedCompiledTypescript = debugTree(typescriptCompiled, `get-addon-es:ts:output`);

  let mergedFinalOutput = new MergeTrees([nonTypeScriptContents, debuggedCompiledTypescript], {
    overwrite: true,
  });

  return debugTree(mergedFinalOutput, `get-addon-es:output`);
};
