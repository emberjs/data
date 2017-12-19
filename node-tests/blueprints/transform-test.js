'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const generateFakePackageManifest = require('../helpers/generate-fake-package-manifest');
const fixture = require('../helpers/fixture');

describe('Acceptance: generate and destroy transform blueprints', function() {
  setupTestHooks(this);

  it('transform', function() {
    let args = ['transform', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/transforms/foo.js'))
          .to.contain('import DS from \'ember-data\';')
          .to.contain('export default DS.Transform.extend(')
          .to.contain('deserialize(serialized) {')
          .to.contain('serialize(deserialized) {');

        expect(_file('tests/unit/transforms/foo-test.js'))
          .to.equal(fixture('transform-test/default.js'));
      }));
  });

  it('transforms-test', function() {
    let args = ['transform-test', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/transforms/foo-test.js'))
          .to.equal(fixture('transform-test/default.js'));
      }));
  });

  it('transform-test for mocha v0.12+', function() {
    let args = ['transform-test', 'foo'];

    return emberNew()
      .then(() => modifyPackages([
        {name: 'ember-cli-qunit', delete: true},
        {name: 'ember-cli-mocha', dev: true}
      ]))
      .then(() => generateFakePackageManifest('ember-cli-mocha', '0.12.0'))
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/transforms/foo-test.js'))
          .to.equal(fixture('transform-test/mocha-0.12.js'));
      }));
  });
});
