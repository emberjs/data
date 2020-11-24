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

  let privateTree = babelCompiler.transpileTree(debugTree(withPrivate, 'babel-private:input'), {
    babel: babelOptions,
    'ember-cli-babel': {
      compileModules: false,
      extensions: ['js', 'ts'],
    },
  });

  privateTree = debugTree(privateTree, 'babel-private:output');
  privateTree = new Rollup(privateTree, {
    rollup: {
      input: '-private/index.js',
      output: [
        {
          file: `${packageName}/-private.js`,
          format: babelCompiler.shouldCompileModules() ? 'amd' : 'es',
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
