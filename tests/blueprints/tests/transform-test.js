'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const chai = require('ember-cli-blueprint-test-helpers/chai');
const generateFakePackageManifest = require('@ember-data/unpublished-test-infra/src/node-test-helpers/generate-fake-package-manifest');
const fixture = require('@ember-data/unpublished-test-infra/src/node-test-helpers/fixture');
const setupTestEnvironment = require('@ember-data/unpublished-test-infra/src/node-test-helpers/setup-test-environment');

const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;
const expect = chai.expect;
const enableOctane = setupTestEnvironment.enableOctane;
const enableClassic = setupTestEnvironment.enableClassic;

describe('Acceptance: generate and destroy transform blueprints', function () {
  setupTestHooks(this);

  describe('classic', function () {
    enableClassic();
    describe('in app', function () {
      beforeEach(async function () {
        await emberNew();
        await modifyPackages([{ name: '@ember-data/serializer', dev: true }]);
      });

      it('transform', function () {
        let args = ['transform', 'foo'];

        return emberGenerateDestroy(args, (_file) => {
          expect(_file('app/transforms/foo.js'))
            .to.contain(`import Transform from '@ember-data/serializer/transform';`)
            .to.contain('export default Transform.extend(')
            .to.contain('deserialize(serialized) {')
            .to.contain('serialize(deserialized) {');

          expect(_file('tests/unit/transforms/foo-test.js')).to.equal(fixture(__dirname, 'transform-test/rfc232.js'));
        });
      });

      it('transform-test', function () {
        let args = ['transform-test', 'foo'];

        return emberGenerateDestroy(args, (_file) => {
          expect(_file('tests/unit/transforms/foo-test.js')).to.equal(fixture(__dirname, 'transform-test/rfc232.js'));
        });
      });

      describe('transform-test with ember-cli-qunit@4.1.0', function () {
        beforeEach(async function () {
          await modifyPackages([{ name: '@ember-data/serializer', dev: true }]);
          modifyPackages([
            { name: 'ember-qunit', delete: true },
            { name: 'ember-cli-qunit', delete: true },
          ]);
          generateFakePackageManifest('ember-cli-qunit', '4.1.0');
        });

        it('transform-test-test foo', function () {
          return emberGenerateDestroy(['transform-test', 'foo'], (_file) => {
            expect(_file('tests/unit/transforms/foo-test.js')).to.equal(
              fixture(__dirname, 'transform-test/default.js')
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

        it('transform-test for mocha v0.12+', function () {
          let args = ['transform-test', 'foo'];

          return emberGenerateDestroy(args, (_file) => {
            expect(_file('tests/unit/transforms/foo-test.js')).to.equal(
              fixture(__dirname, 'transform-test/mocha-0.12.js')
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

        it('transform-test for mocha v0.14+', function () {
          let args = ['transform-test', 'foo'];

          return emberGenerateDestroy(args, (_file) => {
            expect(_file('tests/unit/transforms/foo-test.js')).to.equal(
              fixture(__dirname, 'transform-test/mocha-rfc232.js')
            );
          });
        });
      });
    });
  });

  describe('octane', function () {
    describe('in app', function () {
      enableOctane();

      beforeEach(async function () {
        await emberNew();
        await modifyPackages([{ name: '@ember-data/serializer', dev: true }]);
      });

      it('transform', function () {
        let args = ['transform', 'foo'];

        return emberGenerateDestroy(args, (_file) => {
          expect(_file('app/transforms/foo.js'))
            .to.contain(`import Transform from '@ember-data/serializer/transform';`)
            .to.contain('export default class FooTransform extends Transform {')
            .to.contain('deserialize(serialized) {')
            .to.contain('serialize(deserialized) {');

          expect(_file('tests/unit/transforms/foo-test.js')).to.equal(fixture(__dirname, 'transform-test/rfc232.js'));
        });
      });

      it('transform-test', function () {
        let args = ['transform-test', 'foo'];

        return emberGenerateDestroy(args, (_file) => {
          expect(_file('tests/unit/transforms/foo-test.js')).to.equal(fixture(__dirname, 'transform-test/rfc232.js'));
        });
      });

      describe('transform-test with ember-cli-qunit@4.1.0', function () {
        beforeEach(async function () {
          await modifyPackages([{ name: '@ember-data/serializer', dev: true }]);
          modifyPackages([
            { name: 'ember-qunit', delete: true },
            { name: 'ember-cli-qunit', delete: true },
          ]);
          generateFakePackageManifest('ember-cli-qunit', '4.1.0');
        });

        it('transform-test-test foo', function () {
          return emberGenerateDestroy(['transform-test', 'foo'], (_file) => {
            expect(_file('tests/unit/transforms/foo-test.js')).to.equal(
              fixture(__dirname, 'transform-test/default.js')
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

        it('transform-test for mocha v0.12+', function () {
          let args = ['transform-test', 'foo'];

          return emberGenerateDestroy(args, (_file) => {
            expect(_file('tests/unit/transforms/foo-test.js')).to.equal(
              fixture(__dirname, 'transform-test/mocha-0.12.js')
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

        it('transform-test for mocha v0.14+', function () {
          let args = ['transform-test', 'foo'];

          return emberGenerateDestroy(args, (_file) => {
            expect(_file('tests/unit/transforms/foo-test.js')).to.equal(
              fixture(__dirname, 'transform-test/mocha-rfc232.js')
            );
          });
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
      it('transform-test foo', function () {
        return emberGenerateDestroy(['transform-test', 'foo'], (_file) => {
          expect(_file('tests/unit/transforms/foo-test.js')).to.equal(
            fixture(__dirname, 'transform-test/rfc232-addon.js')
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

      it('transform-test foo', function () {
        return emberGenerateDestroy(['transform-test', 'foo'], (_file) => {
          expect(_file('tests/unit/transforms/foo-test.js')).to.equal(
            fixture(__dirname, 'transform-test/mocha-rfc232-addon.js')
          );
        });
      });
    });
  });
});
