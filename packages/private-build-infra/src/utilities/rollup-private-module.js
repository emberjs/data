const Funnel = require('broccoli-funnel');
const Rollup = require('broccoli-rollup');
const BroccoliDebug = require('broccoli-debug');

module.exports = function rollupPrivateModule(tree, options) {
  const { onWarn, destDir, babelCompiler, babelOptions, externalDependencies, packageName } = options;
  const debugTree = BroccoliDebug.buildDebugCallback(`ember-data:${packageName}:rollup-private`);
  tree = debugTree(tree, 'input');

  let withPrivate = new Funnel(tree, {
    srcDir: '-private',
    destDir: '-private',
  });

  const emberCliBabelOptions = {
    // we leave our output as valid ES
    // for the consuming app's config to transpile as desired
    // so we don't want to compileModules to amd here
    compileModules: false,

    // we never need this on our own stuff
    disableEmberDataPackagesPolyfill: true,

    // we want to leave things as close to es after our own transforms
    // so we don't use this
    disablePresetEnv: false,

    // tells this to leave as is
    disableDebugTooling: false,
    disableDecoratorTransforms: false,

    throwUnlessParallelizable: true,

    // consuming app will take care of this if needed,
    // we don't need to also include
    includePolyfill: false,

    // defer to consuming app's selection
    // necessary as only consuming app can set this, must only have
    // one copy
    includeExternalHelpers: options.emberCliBabelOptions.includeExternalHelpers || false,

    extensions: ['js', 'ts'],
  };

  // and we don't want
  // to convert imports to globals when real modules is possible
  // this is necessary because compileModules: false forces globals
  // conversion without it.
  if (options.emberVersion.gte('3.27.0')) {
    // TODO should we just set this all the time?
    // yes, this needs to be "false" to disable it in 3.27+
    // when compileModules is false (which it is)
    emberCliBabelOptions.disableEmberModulesAPIPolyfill = false;
  }

  let privateTree = babelCompiler.transpileTree(debugTree(withPrivate, 'babel-private:input'), {
    babel: babelOptions,
    'ember-cli-babel': emberCliBabelOptions,
  });

  privateTree = debugTree(privateTree, 'babel-private:output');
  privateTree = new Rollup(privateTree, {
    rollup: {
      input: '-private/index.js',
      output: [
        {
          file: `${packageName}/-private.js`,
          format: 'amd',
          amd: { id: `${packageName}/-private` },
          exports: 'named',
        },
      ],
      external: externalDependencies,
      onwarn: onWarn,
      // cache: true|false Defaults to true
    },
  });

  privateTree = debugTree(privateTree, 'rollup-output');
  privateTree = new Funnel(privateTree, { destDir });

  return privateTree;
};
