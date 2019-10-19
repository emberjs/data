'use strict';

const BroccoliTestHelper = require('broccoli-test-helper');
const Babel = require('broccoli-babel-transpiler');
const chai = require('ember-cli-blueprint-test-helpers/chai');
const stripIndent = require('common-tags').stripIndent;
const StripFilteredImports = require('../../src/transforms/babel-plugin-remove-imports');

const expect = chai.expect;
const createTempDir = BroccoliTestHelper.createTempDir;
const createBuilder = BroccoliTestHelper.createBuilder;

function stripNewlines(str) {
  return str.replace(/[\r\n]/g, '');
}

describe('Unit: babel-plugin-remove-filtered-imports', function() {
  let plugins, pluginOptions;
  let input, output;

  async function transform(code) {
    input.write({ 'test.js': code });
    let babel = new Babel(input.path(), {
      plugins,
    });

    output = createBuilder(babel);

    await output.build();

    const transpiled = output.read();

    return stripNewlines(transpiled['test.js']);
  }

  beforeEach(async function() {
    pluginOptions = {};

    plugins = [[StripFilteredImports, pluginOptions]];

    input = await createTempDir();
  });

  afterEach(async function() {
    if (input) {
      await input.dispose();
    }
    if (output) {
      await output.dispose();
    }

    /* eslint-disable require-atomic-updates */
    input = output = undefined;
    /* eslint-enable require-atomic-updates */
  });

  it('Returns a plugin', function() {
    let plugin = StripFilteredImports();

    expect(plugin).to.be.ok;
  });

  it('Does not alter a file if no imports are meant to be filtered', async function() {
    const input = stripIndent`
      import Foo from 'bar';
      import { baz } from 'none';
      import * as drinks from 'drinks';
      import 'bem';
    `;
    const result = await transform(input);

    expect(result).to.equal(stripNewlines(input));
  });

  it('Properly strips desired imports and specifiers', async function() {
    const input = stripIndent`
      import Foo from 'bar';
      import { bit } from 'wow';
      import { baz, bell } from 'none';
      import { foo } from 'happy';
      import * as drinks from 'drinks';
      import * as dranks from 'dranks';
      import 'bem';
      import 'bosh';
      import 'bell';
    `;

    pluginOptions.none = ['baz'];
    pluginOptions.bar = true;
    pluginOptions.drinks = '*';
    pluginOptions.wow = ['bit'];
    pluginOptions.bem = ['biz'];
    pluginOptions.bosh = '*';
    pluginOptions.dranks = ['bex'];
    pluginOptions.bell = true;

    const expectedOutput = stripNewlines(stripIndent`
      import { bell } from 'none';
      import { foo } from 'happy';
      import * as dranks from 'dranks';
      import 'bem';
    `);
    const result = await transform(input);

    expect(result).to.equal(expectedOutput);
  });
});
