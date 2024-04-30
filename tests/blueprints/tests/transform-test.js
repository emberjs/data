'use strict';

const blueprintHelpers = require('ember-cli-blueprint-test-helpers/helpers');
const chai = require('ember-cli-blueprint-test-helpers/chai');

const path = require('path');
const file = require('ember-cli-blueprint-test-helpers/chai').file;

function fixture(directory, filePath) {
  return file(path.join(directory, '../fixtures', filePath));
}

const fs = require('fs');

function generateFakePackageManifest(name, version) {
  if (!fs.existsSync('node_modules')) {
    fs.mkdirSync('node_modules');
  }
  if (!fs.existsSync('node_modules/' + name)) {
    fs.mkdirSync('node_modules/' + name);
  }
  fs.writeFileSync(
    'node_modules/' + name + '/package.json',
    JSON.stringify({
      version: version,
    })
  );
}

const setupTestHooks = blueprintHelpers.setupTestHooks;
const emberNew = blueprintHelpers.emberNew;
const emberGenerateDestroy = blueprintHelpers.emberGenerateDestroy;
const modifyPackages = blueprintHelpers.modifyPackages;
const expect = chai.expect;
const { setEdition, clearEdition } = require('@ember/edition-utils');

function enableOctane() {
  beforeEach(function () {
    setEdition('octane');
  });

  afterEach(function () {
    clearEdition();
  });
}

function enableClassic() {
  beforeEach(function () {
    setEdition('classic');
  });

  afterEach(function () {
    clearEdition();
  });
}

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
        const args = ['transform', 'foo'];

        return emberGenerateDestroy(args, (_file) => {
          expect(_file('app/transforms/foo.js'))
            .to.contain('export default class FooTransform {')
            .to.contain('deserialize(serialized) {')
            .to.contain('serialize(deserialized) {');

          expect(_file('tests/unit/transforms/foo-test.js')).to.equal(fixture(__dirname, 'transform-test/rfc232.js'));
        });
      });

      it('transform-test', function () {
        const args = ['transform-test', 'foo'];

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
        const args = ['transform', 'foo'];

        return emberGenerateDestroy(args, (_file) => {
          expect(_file('app/transforms/foo.js'))
            .to.contain('export default class FooTransform {')
            .to.contain('deserialize(serialized) {')
            .to.contain('serialize(deserialized) {');

          expect(_file('tests/unit/transforms/foo-test.js')).to.equal(fixture(__dirname, 'transform-test/rfc232.js'));
        });
      });

      it('transform-test', function () {
        const args = ['transform-test', 'foo'];

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
  });
});
