'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;

const expect = require('ember-cli-blueprint-test-helpers/chai').expect;

describe('Acceptance: ember generate and destroy private-package', function() {
  setupTestHooks(this);

  it('private-package foo', function() {
    let args = ['private-package', 'fooBar'];

    // pass any additional command line options in the arguments array
    return emberNew().then(() =>
      emberGenerateDestroy(args, file => {
        expect(file('packages/-foo-bar/package.json')).to.contain('@ember-data/-foo-bar');
      })
    );
  });
});
