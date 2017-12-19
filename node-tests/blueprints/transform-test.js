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

  describe('in app', function() {
    beforeEach(function() {
      return emberNew();
    });


    it('transform', function() {
      let args = ['transform', 'foo'];

      return emberGenerateDestroy(args, _file => {
        expect(_file('app/transforms/foo.js'))
          .to.contain('import DS from \'ember-data\';')
          .to.contain('export default DS.Transform.extend(')
          .to.contain('deserialize(serialized) {')
          .to.contain('serialize(deserialized) {');

        expect(_file('tests/unit/transforms/foo-test.js'))
          .to.equal(fixture('transform-test/default.js'));
      });
    });

    it('transform-test', function() {
      let args = ['transform-test', 'foo'];

      return emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/transforms/foo-test.js'))
          .to.equal(fixture('transform-test/default.js'));
      });
    });

    describe('transform-test with ember-cli-qunit@4.2.0', function() {
      beforeEach(function() {
        generateFakePackageManifest('ember-cli-qunit', '4.2.0');
      });

      it('transform-test-test foo', function() {
        return emberGenerateDestroy(['transform-test', 'foo'], _file => {
          expect(_file('tests/unit/transforms/foo-test.js'))
            .to.equal(fixture('transform-test/rfc232.js'));
        });
      });
    });


    describe('with ember-cli-mocha v0.12+', function() {
      beforeEach(function() {
        modifyPackages([
          { name: 'ember-cli-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true }
        ]);
        generateFakePackageManifest('ember-cli-mocha', '0.12.0');
      });

      it('transform-test for mocha v0.12+', function() {
        let args = ['transform-test', 'foo'];

        return emberGenerateDestroy(args, _file => {
          expect(_file('tests/unit/transforms/foo-test.js'))
            .to.equal(fixture('transform-test/mocha-0.12.js'));
        });
      });
    });
  });
});
