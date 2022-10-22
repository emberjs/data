'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const chai = require('ember-cli-blueprint-test-helpers/chai');
const SilentError = require('silent-error');
const generateFakePackageManifest = require('@ember-data/unpublished-test-infra/src/node-test-helpers/generate-fake-package-manifest');
const fixture = require('@ember-data/unpublished-test-infra/src/node-test-helpers/fixture');
const setupTestEnvironment = require('@ember-data/unpublished-test-infra/src/node-test-helpers/setup-test-environment');

const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerate = blueprintHelpers.emberGenerate;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;
const expect = chai.expect;
const enableOctane = setupTestEnvironment.enableOctane;
const enableClassic = setupTestEnvironment.enableClassic;

describe('Acceptance: generate and destroy serializer blueprints', function () {
  setupTestHooks(this);

  describe('classic', function () {
    enableClassic();
    beforeEach(async function () {
      await emberNew();
      await modifyPackages([{ name: '@ember-data/serializer', dev: true }]);
    });

    it('serializer', function () {
      let args = ['serializer', 'foo'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('app/serializers/foo.js'))
          .to.contain(`import JSONAPISerializer from '@ember-data/serializer/json-api';`)
          .to.contain('export default JSONAPISerializer.extend(');

        expect(_file('tests/unit/serializers/foo-test.js')).to.equal(fixture(__dirname, 'serializer-test/rfc232.js'));
      });
    });

    it('serializer extends application serializer if it exists', function () {
      let args = ['serializer', 'foo'];

      return emberGenerate(['serializer', 'application']).then(() =>
        emberGenerateDestroy(args, (_file) => {
          expect(_file('app/serializers/foo.js'))
            .to.contain("import ApplicationSerializer from './application';")
            .to.contain('export default ApplicationSerializer.extend({');

          expect(_file('tests/unit/serializers/foo-test.js')).to.equal(fixture(__dirname, 'serializer-test/rfc232.js'));
        })
      );
    });

    it('serializer with --base-class', function () {
      let args = ['serializer', 'foo', '--base-class=bar'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('app/serializers/foo.js'))
          .to.contain("import BarSerializer from './bar';")
          .to.contain('export default BarSerializer.extend({');

        expect(_file('tests/unit/serializers/foo-test.js')).to.equal(fixture(__dirname, 'serializer-test/rfc232.js'));
      });
    });

    xit('serializer throws when --base-class is same as name', function () {
      let args = ['serializer', 'foo', '--base-class=foo'];

      return expect(emberGenerate(args)).to.be.rejectedWith(SilentError, /Serializers cannot extend from themself/);
    });

    it('serializer when is named "application"', function () {
      let args = ['serializer', 'application'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('app/serializers/application.js'))
          .to.contain(`import JSONAPISerializer from '@ember-data/serializer/json-api';`)
          .to.contain('export default JSONAPISerializer.extend({');

        expect(_file('tests/unit/serializers/application-test.js')).to.equal(
          fixture(__dirname, 'serializer-test/application-default.js')
        );
      });
    });

    it('serializer-test', function () {
      let args = ['serializer-test', 'foo'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('tests/unit/serializers/foo-test.js')).to.equal(fixture(__dirname, 'serializer-test/rfc232.js'));
      });
    });

    describe('serializer-test with ember-cli-qunit@4.1.0', function () {
      beforeEach(async function () {
        await modifyPackages([{ name: '@ember-data/serializer', dev: true }]);
        await modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-qunit', delete: true },
        ]);
        generateFakePackageManifest('ember-cli-qunit', '4.1.0');
      });

      it('serializer-test-test foo', function () {
        return emberGenerateDestroy(['serializer-test', 'foo'], (_file) => {
          expect(_file('tests/unit/serializers/foo-test.js')).to.equal(
            fixture(__dirname, 'serializer-test/foo-default.js')
          );
        });
      });
    });

    describe('with ember-cli-mocha v0.12+', function () {
      beforeEach(async function () {
        await modifyPackages([{ name: '@ember-data/serializer', dev: true }]);
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true },
        ]);
        generateFakePackageManifest('ember-cli-mocha', '0.12.0');
      });

      it('serializer-test for mocha v0.12+', function () {
        let args = ['serializer-test', 'foo'];

        return emberGenerateDestroy(args, (_file) => {
          expect(_file('tests/unit/serializers/foo-test.js')).to.equal(
            fixture(__dirname, 'serializer-test/foo-mocha-0.12.js')
          );
        });
      });
    });

    describe('with ember-mocha v0.14+', function () {
      beforeEach(async function () {
        await modifyPackages([{ name: '@ember-data/serializer', dev: true }]);
        await modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-mocha', dev: true },
        ]);
        generateFakePackageManifest('ember-mocha', '0.14.0');
      });

      it('serializer-test for mocha v0.14+', function () {
        let args = ['serializer-test', 'foo'];

        return emberGenerateDestroy(args, (_file) => {
          expect(_file('tests/unit/serializers/foo-test.js')).to.equal(
            fixture(__dirname, 'serializer-test/mocha-rfc232.js')
          );
        });
      });
    });
  });

  describe('octane', function () {
    enableOctane();

    beforeEach(async function () {
      await emberNew();
      await modifyPackages([{ name: '@ember-data/serializer', dev: true }]);
    });

    it('serializer', function () {
      let args = ['serializer', 'foo'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('app/serializers/foo.js'))
          .to.contain(`import JSONAPISerializer from '@ember-data/serializer/json-api';`)
          .to.contain('export default class FooSerializer extends JSONAPISerializer {');

        expect(_file('tests/unit/serializers/foo-test.js')).to.equal(fixture(__dirname, 'serializer-test/rfc232.js'));
      });
    });

    it('serializer extends application serializer if it exists', function () {
      let args = ['serializer', 'foo'];

      return emberGenerate(['serializer', 'application']).then(() =>
        emberGenerateDestroy(args, (_file) => {
          expect(_file('app/serializers/foo.js'))
            .to.contain("import ApplicationSerializer from './application';")
            .to.contain('export default class FooSerializer extends ApplicationSerializer {');

          expect(_file('tests/unit/serializers/foo-test.js')).to.equal(fixture(__dirname, 'serializer-test/rfc232.js'));
        })
      );
    });

    it('serializer with --base-class', function () {
      let args = ['serializer', 'foo', '--base-class=bar'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('app/serializers/foo.js'))
          .to.contain("import BarSerializer from './bar';")
          .to.contain('export default class FooSerializer extends BarSerializer');

        expect(_file('tests/unit/serializers/foo-test.js')).to.equal(fixture(__dirname, 'serializer-test/rfc232.js'));
      });
    });

    xit('serializer throws when --base-class is same as name', function () {
      let args = ['serializer', 'foo', '--base-class=foo'];

      return expect(emberGenerate(args)).to.be.rejectedWith(SilentError, /Serializers cannot extend from themself/);
    });

    it('serializer when is named "application"', function () {
      let args = ['serializer', 'application'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('app/serializers/application.js'))
          .to.contain(`import JSONAPISerializer from '@ember-data/serializer/json-api';`)
          .to.contain('export default class ApplicationSerializer extends JSONAPISerializer {');

        expect(_file('tests/unit/serializers/application-test.js')).to.equal(
          fixture(__dirname, 'serializer-test/application-default.js')
        );
      });
    });

    it('serializer-test', function () {
      let args = ['serializer-test', 'foo'];

      return emberGenerateDestroy(args, (_file) => {
        expect(_file('tests/unit/serializers/foo-test.js')).to.equal(fixture(__dirname, 'serializer-test/rfc232.js'));
      });
    });

    describe('serializer-test with ember-cli-qunit@4.1.0', function () {
      beforeEach(async function () {
        await modifyPackages([{ name: '@ember-data/serializer', dev: true }]);
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-qunit', delete: true },
        ]);
        generateFakePackageManifest('ember-cli-qunit', '4.1.0');
      });

      it('serializer-test-test foo', function () {
        return emberGenerateDestroy(['serializer-test', 'foo'], (_file) => {
          expect(_file('tests/unit/serializers/foo-test.js')).to.equal(
            fixture(__dirname, 'serializer-test/foo-default.js')
          );
        });
      });
    });

    describe('with ember-cli-mocha v0.12+', function () {
      beforeEach(async function () {
        await modifyPackages([{ name: '@ember-data/serializer', dev: true }]);
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-cli-mocha', dev: true },
        ]);
        generateFakePackageManifest('ember-cli-mocha', '0.12.0');
      });

      it('serializer-test for mocha v0.12+', function () {
        let args = ['serializer-test', 'foo'];

        return emberGenerateDestroy(args, (_file) => {
          expect(_file('tests/unit/serializers/foo-test.js')).to.equal(
            fixture(__dirname, 'serializer-test/foo-mocha-0.12.js')
          );
        });
      });
    });

    describe('with ember-mocha v0.14+', function () {
      beforeEach(async function () {
        await modifyPackages([{ name: '@ember-data/serializer', dev: true }]);
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-mocha', dev: true },
        ]);
        generateFakePackageManifest('ember-mocha', '0.14.0');
      });

      it('serializer-test for mocha v0.14+', function () {
        let args = ['serializer-test', 'foo'];

        return emberGenerateDestroy(args, (_file) => {
          expect(_file('tests/unit/serializers/foo-test.js')).to.equal(
            fixture(__dirname, 'serializer-test/mocha-rfc232.js')
          );
        });
      });
    });
  });

  describe('in addon', function () {
    beforeEach(async function () {
      await emberNew({ target: 'addon' });
      await modifyPackages([{ name: '@ember-data/serializer', dev: true }]);
    });

    describe('with ember-qunit (default)', function () {
      it('serializer-test foo', function () {
        return emberGenerateDestroy(['serializer-test', 'foo'], (_file) => {
          expect(_file('tests/unit/serializers/foo-test.js')).to.equal(
            fixture(__dirname, 'serializer-test/rfc232-addon.js')
          );
        });
      });
    });

    describe('with ember-mocha', function () {
      beforeEach(async function () {
        await modifyPackages([{ name: '@ember-data/serializer', dev: true }]);
        modifyPackages([
          { name: 'ember-qunit', delete: true },
          { name: 'ember-mocha', dev: true },
        ]);
        generateFakePackageManifest('ember-mocha', '0.16.2');
      });

      it('serializer-test foo', function () {
        return emberGenerateDestroy(['serializer-test', 'foo'], (_file) => {
          expect(_file('tests/unit/serializers/foo-test.js')).to.equal(
            fixture(__dirname, 'serializer-test/mocha-rfc232-addon.js')
          );
        });
      });
    });
  });
});
