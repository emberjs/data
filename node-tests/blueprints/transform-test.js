var blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
var setupTestHooks = blueprintHelpers.setupTestHooks;
var emberNew = blueprintHelpers.emberNew;
var emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
var modifyPackages = blueprintHelpers.modifyPackages;

var chai = require('ember-cli-blueprint-test-helpers/chai');
var expect = chai.expect;

var generateFakePackageManifest = require('../helpers/generate-fake-package-manifest');
const fixture = require('../helpers/fixture');

describe('Acceptance: generate and destroy transform blueprints', function() {
  setupTestHooks(this);

  it('transform', function() {
    var args = ['transform', 'foo'];

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
    var args = ['transform-test', 'foo'];

    return emberNew()
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/transforms/foo-test.js'))
          .to.equal(fixture('transform-test/default.js'));
      }));
  });

  it('transform-test for mocha v0.12+', function() {
    var args = ['transform-test', 'foo'];

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
