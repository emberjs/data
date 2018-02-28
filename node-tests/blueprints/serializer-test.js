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

describe('Acceptance: generate and destroy serializer blueprints', function() {
  setupTestHooks(this);


  beforeEach(function() {
    return emberNew();
  });

  it('serializer', function() {
    let args = ['serializer', 'foo'];

    return emberGenerateDestroy(args, _file => {
        expect(_file('app/serializers/foo.js'))
          .to.contain('import DS from \'ember-data\';')
          .to.contain('export default DS.JSONAPISerializer.extend(');

        expect(_file('tests/unit/serializers/foo-test.js'))
          .to.equal(fixture('serializer-test/foo-default.js'));
      });
  });

  it('serializer extends application serializer if it exists', function() {
    let args = ['serializer', 'foo'];

    return emberGenerate(['serializer', 'application'])
      .then(() => emberGenerateDestroy(args, _file => {
        expect(_file('app/serializers/foo.js'))
          .to.contain('import ApplicationSerializer from \'./application\';')
          .to.contain('export default ApplicationSerializer.extend({');

        expect(_file('tests/unit/serializers/foo-test.js'))
          .to.equal(fixture('serializer-test/foo-default.js'));
      }));
  });

  it('serializer with --base-class', function() {
    let args = ['serializer', 'foo', '--base-class=bar'];

    return emberGenerateDestroy(args, _file => {
        expect(_file('app/serializers/foo.js'))
          .to.contain('import BarSerializer from \'./bar\';')
          .to.contain('export default BarSerializer.extend({');

        expect(_file('tests/unit/serializers/foo-test.js'))
          .to.equal(fixture('serializer-test/foo-default.js'));
      });
  });

  xit('serializer throws when --base-class is same as name', function() {
    let args = ['serializer', 'foo', '--base-class=foo'];

    return expect(emberGenerate(args))
        .to.be.rejectedWith(SilentError, /Serializers cannot extend from themself/);
  });

  it('serializer when is named "application"', function() {
    let args = ['serializer', 'application'];

    return emberGenerateDestroy(args, _file => {
        expect(_file('app/serializers/application.js'))
          .to.contain('import DS from \'ember-data\';')
          .to.contain('export default DS.JSONAPISerializer.extend({');

        expect(_file('tests/unit/serializers/application-test.js'))
          .to.equal(fixture('serializer-test/application-default.js'));
      });
  });

  it('serializer-test', function() {
    let args = ['serializer-test', 'foo'];

    return emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/serializers/foo-test.js'))
          .to.equal(fixture('serializer-test/foo-default.js'));
      });
  });

  describe('serializer-test with ember-cli-qunit@4.2.0', function() {
    beforeEach(function() {
      generateFakePackageManifest('ember-cli-qunit', '4.2.0');
    });

    it('serializer-test-test foo', function() {
      return emberGenerateDestroy(['serializer-test', 'foo'], _file => {
        expect(_file('tests/unit/serializers/foo-test.js'))
        .to.equal(fixture('serializer-test/rfc232.js'));
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

    it('serializer-test for mocha v0.12+', function() {
      let args = ['serializer-test', 'foo'];

      return emberGenerateDestroy(args, _file => {
        expect(_file('tests/unit/serializers/foo-test.js'))
        .to.equal(fixture('serializer-test/foo-mocha-0.12.js'));
      });
    });
  });

});
