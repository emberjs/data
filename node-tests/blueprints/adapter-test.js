'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerate = blueprintHelpers.emberGenerate;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;

const chai = require('ember-cli-blueprint-test-helpers/chai');
const expect = chai.expect;

const SilentError = require('silent-error');

const generateFakePackageManifest = require('../helpers/generate-fake-package-manifest');
const fixture = require('../helpers/fixture');

describe('Acceptance: generate and destroy adapter blueprints', function() {
  setupTestHooks(this);

  beforeEach(function() {
    return emberNew();
  });


  it('adapter', function() {
    let args = ['adapter', 'foo'];

    return emberGenerateDestroy(args, _file => {
        expect(_file('app/adapters/foo.js'))
          .to.contain('import DS from \'ember-data\';')
          .to.contain('export default DS.JSONAPIAdapter.extend({');

        expect(_file('tests/unit/adapters/foo-test.js'))
          .to.equal(fixture('adapter-test/foo-default.js'));
      });
  });

  it('adapter extends application adapter if it exists', function() {
    let args = ['adapter', 'foo'];

    return emberGenerate(['adapter', 'application'])
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/adapters/foo.js'))
          .to.contain('import ApplicationAdapter from \'./application\';')
          .to.contain('export default ApplicationAdapter.extend({');

        expect(_file('tests/unit/adapters/foo-test.js'))
          .to.equal(fixture('adapter-test/foo-default.js'));
      }));
  });

  it('adapter with --base-class', function() {
    let args = ['adapter', 'foo', '--base-class=bar'];

    return emberGenerateDestroy(args, _file => {
        expect(_file('app/adapters/foo.js'))
          .to.contain('import BarAdapter from \'./bar\';')
          .to.contain('export default BarAdapter.extend({');

        expect(_file('tests/unit/adapters/foo-test.js'))
          .to.equal(fixture('adapter-test/foo-default.js'));
      });
  });

  xit('adapter throws when --base-class is same as name', function() {
    let args = ['adapter', 'foo', '--base-class=foo'];

    return expect(emberGenerate(args))
        .to.be.rejectedWith(SilentError, /Adapters cannot extend from themself/);
  });

  it('adapter when is named "application"', function() {
    let args = ['adapter', 'application'];

    return emberGenerateDestroy(args, _file => {
        expect(_file('app/adapters/application.js'))
          .to.contain('import DS from \'ember-data\';')
          .to.contain('export default DS.JSONAPIAdapter.extend({');

        expect(_file('tests/unit/adapters/application-test.js'))
          .to.equal(fixture('adapter-test/application-default.js'));
      });
  });

  it('adapter-test', function() {
    let args = ['adapter-test', 'foo'];

    return emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/adapters/foo-test.js'))
          .to.equal(fixture('adapter-test/foo-default.js'));
      });
  });

  describe('adapter-test with ember-cli-qunit@4.2.0', function() {
    beforeEach(function() {
      generateFakePackageManifest('ember-cli-qunit', '4.2.0');
    });

    it('adapter-test-test foo', function() {
      return emberGenerateDestroy(['adapter-test', 'foo'], _file => {
        expect(_file('tests/unit/adapters/foo-test.js'))
        .to.equal(fixture('adapter-test/rfc232.js'));
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

    it('adapter-test for mocha v0.12+', function() {
      let args = ['adapter-test', 'foo'];

      return emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/adapters/foo-test.js'))
        .to.equal(fixture('adapter-test/foo-mocha-0.12.js'));
      });
    });
  });

});
